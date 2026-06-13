import dotenv from "dotenv";
import { getCache, setCache } from '../../shared/services/redis.service.js';

dotenv.config();

export const callOpenRouter = async (systemMessage, userMessage) => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("OpenRouter API key missing from process.env");
    throw new Error("OpenRouter API key missing");
  }

  const model = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

  try {
    const payload = {
      model: model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage }
      ]
    };

    const responsePromise = fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Lumora"
      },
      body: JSON.stringify(payload)
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Request Timed Out")), 25000)
    );

    const response = await Promise.race([responsePromise, timeoutPromise]);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenRouter API returned an error");
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Invalid response structure from OpenRouter");
    }

    console.log(`[AI] Generated content using ${model}`);
    return content;
  } catch (error) {
    console.error("OpenRouter API Error:", error.message || error);
    throw new Error("Failed to communicate with AI provider.");
  }
};

export const analyzeResume = async (resumeText) => {
  const systemMessage = `
    You are an expert ATS (Applicant Tracking System) and Senior Technical Recruiter.
    Analyze the resume text provided by the user.
    Return the output ONLY as a valid JSON object matching this schema exactly, do not use markdown blocks:
    {
      "atsScore": number (0-100),
      "missingSkills": ["skill1", "skill2"],
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1"],
      "improvements": ["improvement1", "improvement2"],
      "recommendation": "A brief overall hiring recommendation."
    }
  `;

  try {
    const responseText = await callOpenRouter(systemMessage, resumeText);
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("AI Resume Analysis Error:", error);
    throw new Error("Failed to analyze resume with AI.");
  }
};

export const generateJobDescription = async (userPrompt) => {
  const systemMessage = `
    You are a professional Technical Recruiter creating a job listing.
    Generate a professional, detailed job description based on the user's prompt.
    Return the output ONLY as a valid JSON object matching this schema exactly, without markdown blocks:
    {
      "summary": "2-3 paragraphs describing the role and company culture",
      "responsibilities": ["resp1", "resp2"],
      "requirements": ["req1", "req2"],
      "qualifications": ["qual1", "qual2"],
      "preferredSkills": ["skill1", "skill2"]
    }
  `;

  const cacheKey = `ai:jobdesc:${userPrompt.trim().substring(0, 100)}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) {
    console.log('[AI] Served job description from Redis Cache');
    return cachedData;
  }

  try {
    const responseText = await callOpenRouter(systemMessage, userPrompt);
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    try {
      const result = JSON.parse(cleanedText);
      await setCache(cacheKey, result, 86400); // Cache for 24 hours
      return result;
    } catch (parseError) {
      console.error("Failed to parse AI JSON:", cleanedText);
      throw new Error("AI returned malformed JSON.");
    }
  } catch (error) {
    console.error("AI Job Gen Error:", error);
    throw new Error("Failed to generate job description with AI.");
  }
};

export const generateInterviewQuestions = async (roleTitle, skills) => {
  const systemMessage = `
    You are an expert Technical Recruiter conducting an interview for the role of ${roleTitle}.
    Generate exactly 5 highly relevant interview questions based on these skills: ${skills}.
    Return a valid JSON array of strings exactly like this:
    ["Question 1", "Question 2"]
  `;

  try {
    const responseText = await callOpenRouter(systemMessage, `Role: ${roleTitle}, Skills: ${skills}`);
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("AI Interview Gen Error:", error);
    throw new Error("Failed to generate interview questions with AI.");
  }
};

export const chatbotReply = async (userMessage, chatHistory = [], contextText = "") => {
  const systemMessage = `
    You are the official Lumora platform AI Assistant.
    Your goal is to help users navigate jobs, resumes, applications, employer accounts, and candidate profiles on the Lumora platform.
    
    CRITICAL RULES:
    1. NEVER answer unrelated/general knowledge questions (e.g. coding help, recipes, math).
    2. If asked something unrelated, politely refuse by saying: "I can only assist with Lumora platform features, jobs, resumes, applications, employers, and account-related guidance."
    3. Maintain a professional, modern SaaS assistant tone.
    4. Keep responses concise and helpful.
    5. Never hallucinate fake features.

    RELEVANT RETRIEVED CONTEXT FROM PLATFORM (Use this to ground your answer if relevant):
    ${contextText}
  `;

  const model = process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free";

  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key missing");
  }

  try {
    const messages = [
      { role: "system", content: systemMessage },
      ...chatHistory,
      { role: "user", content: userMessage }
    ];

    const responsePromise = fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "Lumora Chatbot"
      },
      body: JSON.stringify({ model, messages })
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("AI Request Timed Out")), 15000)
    );

    const response = await Promise.race([responsePromise, timeoutPromise]);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenRouter API returned an error");
    }

    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("Invalid response structure from OpenRouter chatbot.");
    }

    return content.trim();
  } catch (error) {
    console.error("AI Chatbot Error:", error.message || error);
    throw new Error("Failed to generate chatbot reply.");
  }
};

export const evaluateApplication = async (resumeText, jobDescription) => {
  const systemMessage = `
    You are an expert ATS and Technical Recruiter.
    Evaluate the candidate's parsed resume against the job description.
    Return ONLY a valid JSON object matching this exact schema:
    {
      "score": number (0-100, where 100 is a perfect match),
      "summary": "1-2 sentence concise explanation of why they are a fit or not."
    }
  `;

  try {
    const responseText = await callOpenRouter(systemMessage, `Resume:\n${resumeText}\n\nJob Description:\n${jobDescription}`);
    const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanedText);
  } catch (error) {
    console.error("AI Evaluation Error:", error);
    return { score: 0, summary: "Failed to evaluate application due to AI service error." };
  }
};
