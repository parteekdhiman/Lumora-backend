import User from '../users/user.model.js';
import Job from '../jobs/job.model.js';
import { callOpenRouter, chatbotReply, generateJobDescription } from './ai.service.js';
import { aiChatService } from './aiChat.service.js';
import { embeddingService } from './embedding.service.js';
import Embedding from './embedding.model.js';
import AppError from '../../shared/errors/AppError.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

const chatSessions = new Map();

export const getJobRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!user.profile || (!user.profile.bio && (!user.profile.skills || user.profile.skills.length === 0))) {
    throw new AppError('Profile is incomplete. Please update your skills and bio to get recommendations.', 400);
  }

  const candidateText = `${user.name}. ${user.profile.title || ''}. ${user.profile.bio || ''}. Skills: ${(user.profile.skills || []).join(', ')}. Experience: ${user.profile.experience || ''}`;

  const candidateDocs = await embeddingService.vectorSearch({
    queryText: candidateText,
    sourceTypes: ['job'],
    limit: 10
  });

  if (candidateDocs.length === 0) {
    return res.json([]);
  }

  const jobIds = candidateDocs.map(doc => doc.sourceId);
  const jobs = await Job.find({ _id: { $in: jobIds }, isActive: true }).select('_id title company location type salary tags description');

  if (jobs.length === 0) {
    return res.json([]);
  }

  const candidateProfile = {
    name: user.name,
    bio: user.profile.bio,
    skills: user.profile.skills,
    experience: user.profile.experience,
    title: user.profile.title
  };

  const availableJobs = jobs.map(job => ({
    id: job._id,
    title: job.title,
    company: job.company,
    tags: job.tags,
    description: job.description
  }));

  const prompt = `
    You are an expert technical recruiter and AI matchmaker.
    I have a candidate profile and a list of 10 relevant jobs from a vector search.
    Evaluate the candidate against these jobs and return the top 3 best matching jobs.

    Candidate Profile:
    ${JSON.stringify(candidateProfile, null, 2)}

    Available Jobs:
    ${JSON.stringify(availableJobs, null, 2)}

    Return exactly a JSON array of objects, with NO markdown formatting, NO backticks, and NO other text.
    Each object must have exactly two keys:
    "jobId": the ID of the recommended job.
    "matchReason": A customized, compelling 1-sentence explanation to the candidate directly (e.g. "Your strong background in React perfectly aligns with this role.") about why they are a great fit.
  `;

  let resultText = await callOpenRouter(
    "You are an expert technical recruiter and AI matchmaker.",
    prompt
  );
  
  if (resultText.startsWith('```json')) {
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
  } else if (resultText.startsWith('```')) {
    resultText = resultText.replace(/```/g, '').trim();
  }

  try {
    const recommendations = JSON.parse(resultText);

    const populatedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const job = await Job.findById(rec.jobId).populate('employerId', 'name companyName');
        if (job) {
          return {
            ...job.toObject(),
            matchReason: rec.matchReason
          };
        }
        return null;
      })
    );

    res.json(populatedRecommendations.filter(j => j !== null));
  } catch (error) {
    console.error("AI returned unparsable recommendations:", resultText);
    res.json([]);
  }
});

export const getResumeJobMatches = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const resumeDoc = await Embedding.findOne({ sourceType: 'resume', sourceId: userId, isActive: true });
  
  if (!resumeDoc || !resumeDoc.text) {
    throw new AppError("No parsed resume found. Please upload and analyze a resume first.", 400);
  }

  const candidateDocs = await embeddingService.vectorSearch({
    queryText: resumeDoc.text,
    sourceTypes: ['job'],
    limit: 10
  });

  if (candidateDocs.length === 0) {
    return res.json([]);
  }

  const jobIds = candidateDocs.map(doc => doc.sourceId);
  const jobs = await Job.find({ _id: { $in: jobIds }, isActive: true }).select('_id title company location type tags description requirements');

  const availableJobs = jobs.map(job => ({
    id: job._id,
    title: job.title,
    company: job.company,
    tags: job.tags,
    requirements: job.requirements
  }));

  const prompt = `
    You are an expert technical recruiter and AI matchmaker.
    I have a candidate's resume text and a list of 10 relevant jobs from a vector search.
    Evaluate the resume against these jobs and return the top 3 best matching jobs.

    Resume Text (Truncated):
    ${resumeDoc.text.substring(0, 3000)}

    Available Jobs:
    ${JSON.stringify(availableJobs, null, 2)}

    Return exactly a JSON array of objects, with NO markdown formatting.
    Each object must have these keys:
    "jobId": the ID of the recommended job.
    "matchReason": 1-sentence explanation of why it's a fit.
    "missingSkills": Array of strings of skills the candidate lacks.
    "opportunity": 1-sentence explanation of what makes this a great opportunity.
  `;

  let resultText = await callOpenRouter(
    "You are an expert technical recruiter and AI matchmaker.",
    prompt
  );

  if (resultText.startsWith('```json')) {
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
  } else if (resultText.startsWith('```')) {
    resultText = resultText.replace(/```/g, '').trim();
  }

  try {
    const matches = JSON.parse(resultText);

    const populatedMatches = await Promise.all(
      matches.map(async (match) => {
        const job = await Job.findById(match.jobId).populate('employerId', 'name companyName');
        if (job) {
          return {
            ...job.toObject(),
            matchReason: match.matchReason,
            missingSkills: match.missingSkills,
            opportunity: match.opportunity
          };
        }
        return null;
      })
    );

    res.json(populatedMatches.filter(j => j !== null));
  } catch (error) {
    console.error("AI returned unparsable resume matches:", resultText);
    res.json([]);
  }
});

export const generateJob = asyncHandler(async (req, res) => {
  const { title, company, skills, experienceLevel, employmentType, additionalDetails } = req.body;

  if (!title || !company || !skills) {
    throw new AppError("Please provide at least a title, company, and skills.", 400);
  }

  const compiledPrompt = `
    Create a highly professional and structured job description for the following role:
    - Job Title: ${title}
    - Company: ${company}
    - Core Skills Required: ${skills}
    - Experience Level: ${experienceLevel || 'Not specified'}
    - Employment Type: ${employmentType || 'Not specified'}
    - Additional Details: ${additionalDetails || 'None'}
    
    Do NOT invent or hallucinate specific company policies, fake salaries, or benefits unless implicitly standard for the industry. Focus on the responsibilities, requirements, and a professional summary.
  `;

  const generatedJob = await generateJobDescription(compiledPrompt);
  res.status(200).json({
    success: true,
    data: generatedJob,
  });
});

export const processChatbotMessage = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const message = req.body.message;

  if (!message || typeof message !== "string") {
    throw new AppError("Message string is required.", 400);
  }

  const history = chatSessions.get(userId) || [];

  const contextDocs = await embeddingService.vectorSearch({
    queryText: message,
    sourceTypes: ['job', 'resume', 'platform_doc', 'user_profile'],
    limit: 5,
    filters: {
      $or: [
        { sourceType: { $in: ['job', 'platform_doc'] } },
        { sourceId: userId }
      ]
    }
  });

  const contextText = contextDocs.map(d => `[${d.sourceType.toUpperCase()}]: ${d.text}`).join('\n\n');

  const reply = await chatbotReply(message, history, contextText);

  history.push({ role: "user", content: message });
  history.push({ role: "assistant", content: reply });
  
  if (history.length > 20) {
    history.splice(0, history.length - 20);
  }
  
  chatSessions.set(userId, history);

  res.status(200).json({
    success: true,
    reply,
  });
});

export const getChatbotHistory = asyncHandler(async (req, res) => {
  const history = chatSessions.get(req.user._id.toString()) || [];
  res.status(200).json({
    success: true,
    history,
  });
});

export const clearChatbotHistory = asyncHandler(async (req, res) => {
  chatSessions.delete(req.user._id.toString());
  res.status(200).json({
    success: true,
    message: "Chat history cleared successfully",
  });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const messages = req.body.messages;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new AppError("Messages array is required.", 400);
  }

  const reply = await aiChatService.generateChatResponse(req.user._id.toString(), messages);
  res.status(200).json({
    success: true,
    reply,
  });
});

export const analyzeSkillGap = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { jobId } = req.params;

  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError("Job not found", 404);
  }

  const resumeDoc = await Embedding.findOne({ sourceType: 'resume', sourceId: userId, isActive: true });
  
  if (!resumeDoc || !resumeDoc.text) {
    throw new AppError("No parsed resume found. Please upload and analyze a resume first to use this feature.", 400);
  }

  const prompt = `
    You are an expert Career Coach and Technical Recruiter.
    I have a candidate's resume text and a specific Job Description.
    Analyze the skill gap between the resume and the job description.
    
    Resume Text:
    ${resumeDoc.text.substring(0, 3000)}

    Job Description:
    ${job.description}
    Requirements: ${job.requirements.join(', ')}

    Return exactly a JSON object matching this schema, with NO markdown formatting:
    {
      "missingSkills": ["Skill 1", "Skill 2"],
      "recommendations": "1-2 paragraphs of actionable advice on how to bridge this gap.",
      "overallFit": "1 sentence summarizing their current fit for the role."
    }
  `;

  let resultText = await callOpenRouter(
    "You are an expert Career Coach and Technical Recruiter.",
    prompt
  );

  if (resultText.startsWith('\`\`\`json')) {
    resultText = resultText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
  } else if (resultText.startsWith('\`\`\`')) {
    resultText = resultText.replace(/\`\`\`/g, '').trim();
  }

  try {
    const analysis = JSON.parse(resultText);
    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error("AI returned unparsable skill gap analysis:", resultText);
    throw new AppError("Failed to parse AI skill gap analysis.", 500);
  }
});
