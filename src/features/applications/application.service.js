import Application from './application.model.js';
import Job from '../jobs/job.model.js';
import AppError from '../../shared/errors/AppError.js';
import { evaluateApplication } from '../ai/ai.service.js';
import Embedding from '../ai/embedding.model.js';

export const applyForJob = async (jobseekerId, applicationData) => {
  const { jobId, fullName, email, phone, resumeLink, coverLetter } = applicationData;

  const job = await Job.findById(jobId);
  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (job.isActive === false) {
    throw new AppError('This job has expired and is no longer accepting applications.', 400);
  }

  const existingApp = await Application.findOne({ jobId, jobseekerId });
  if (existingApp) {
    throw new AppError('You have already applied for this job', 400);
  }

  let aiScore = 0;
  let aiScreeningSummary = "AI screening unavailable (no parsed resume).";

  try {
    const resumeDoc = await Embedding.findOne({ sourceType: 'resume', sourceId: jobseekerId, isActive: true });
    if (resumeDoc && resumeDoc.text) {
      const evaluation = await evaluateApplication(resumeDoc.text, job.description);
      aiScore = evaluation.score || 0;
      aiScreeningSummary = evaluation.summary || "Summary generation failed.";
    }
  } catch (err) {
    console.error("Failed to generate AI screening during application:", err);
  }

  return await Application.create({
    jobId,
    jobseekerId,
    employerId: job.employerId,
    fullName,
    email,
    phone,
    resumeLink,
    coverLetter,
    aiScore,
    aiScreeningSummary
  });
};

export const getMyApplications = async (jobseekerId, queryParams) => {
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 10));
  const skip = (page - 1) * limit;

  const applications = await Application.find({ jobseekerId })
    .populate('jobId', 'title company location type salary')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Application.countDocuments({ jobseekerId });

  return { applications, total, page, limit };
};

export const getJobApplicants = async (jobId, employerId, queryParams) => {
  const page = Math.max(1, parseInt(queryParams.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(queryParams.limit) || 10));
  const skip = (page - 1) * limit;

  const applications = await Application.find({ jobId, employerId })
    .populate('jobseekerId', 'name email profile')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .lean();
    
  const total = await Application.countDocuments({ jobId, employerId });

  return { applications, total, page, limit };
};

export const updateApplicationStatus = async (applicationId, employerId, status) => {
  const application = await Application.findById(applicationId);

  if (!application) {
    throw new AppError('Application not found', 404);
  }

  if (application.employerId.toString() !== employerId.toString()) {
    throw new AppError('Not authorized to update this application', 403);
  }

  application.status = status;
  return await application.save();
};
