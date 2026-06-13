import * as jobService from './job.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';
import { buildPaginatedResponse } from '../../shared/utils/queryBuilder.js';

export const getJobs = asyncHandler(async (req, res) => {
  const { jobs, total, limit } = await jobService.getJobs(req.query);
  const response = buildPaginatedResponse(jobs, total, req.query.page, limit);
  res.json(response);
});

export const getJobById = asyncHandler(async (req, res) => {
  const job = await jobService.getJobById(req.params.id);
  res.json(job);
});

export const createJob = asyncHandler(async (req, res) => {
  const job = await jobService.createJob(req.body, req.user._id);
  res.status(201).json(job);
});

export const updateJob = asyncHandler(async (req, res) => {
  const updatedJob = await jobService.updateJob(req.params.id, req.user._id, req.body);
  res.json(updatedJob);
});

export const deleteJob = asyncHandler(async (req, res) => {
  await jobService.deleteJob(req.params.id, req.user._id);
  res.json({ message: 'Job removed' });
});

export const getEmployerJobs = asyncHandler(async (req, res) => {
  const jobs = await jobService.getEmployerJobs(req.user._id);
  res.status(200).json({
    success: true,
    data: jobs || [],
    message: "Employer jobs fetched safely"
  });
});

export const toggleJobStatus = asyncHandler(async (req, res) => {
  const updatedJob = await jobService.toggleJobStatus(req.params.id, req.user._id);
  res.status(200).json({
    success: true,
    data: updatedJob,
    message: `Job has been ${updatedJob.isActive ? 'reopened' : 'closed'}.`
  });
});
