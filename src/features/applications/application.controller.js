import * as applicationService from './application.service.js';
import * as resumeService from './resume.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const applyForJob = asyncHandler(async (req, res) => {
  const application = await applicationService.applyForJob(req.user._id, req.body);
  res.status(201).json(application);
});

export const getMyApplications = asyncHandler(async (req, res) => {
  const { applications, total, page, limit } = await applicationService.getMyApplications(req.user._id, req.query);
  res.json({
    data: applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
});

export const getJobApplicants = asyncHandler(async (req, res) => {
  const { applications, total, page, limit } = await applicationService.getJobApplicants(req.params.jobId, req.user._id, req.query);
  res.json({
    data: applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    }
  });
});

export const updateApplicationStatus = asyncHandler(async (req, res) => {
  const updatedApplication = await applicationService.updateApplicationStatus(req.params.id, req.user._id, req.body.status);
  res.json(updatedApplication);
});

export const uploadResume = asyncHandler(async (req, res) => {
  const resume = await resumeService.uploadResume(req.user._id, req.file);
  res.status(200).json({
    message: "Resume uploaded successfully",
    resume
  });
});

export const getResume = asyncHandler(async (req, res) => {
  const resumeDetails = await resumeService.getResume(req.user._id);
  res.status(200).json(resumeDetails);
});

export const deleteResume = asyncHandler(async (req, res) => {
  await resumeService.deleteResume(req.user._id);
  res.status(200).json({ message: "Resume deleted successfully" });
});

export const analyzeResume = asyncHandler(async (req, res) => {
  const analysis = await resumeService.analyzeResume(req.user._id);
  res.status(200).json({
    message: "Resume analyzed successfully",
    analysis
  });
});
