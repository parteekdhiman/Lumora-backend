import Job from './job.model.js';
import Application from '../applications/application.model.js';
import AppError from '../../shared/errors/AppError.js';
import { buildQuery } from '../../shared/utils/queryBuilder.js';
import { embeddingService } from '../ai/embedding.service.js';
import { getCache, setCache, invalidatePattern } from '../../shared/services/redis.service.js';

const extractSalaryValue = (salary) => {
  if (!salary) return 0;
  const numbers = salary.match(/\d+/g)?.map(Number) || [];
  return numbers.length > 0 ? numbers[0] : 0;
};

export const getJobs = async (queryParams) => {
  const { query, skip, limit, sort } = buildQuery(queryParams);
  const cacheKey = `jobs:list:${JSON.stringify(queryParams)}`;

  const cachedData = await getCache(cacheKey);
  if (cachedData) return cachedData;

  const jobs = await Job.find(query)
    .populate('employerId', 'name companyName')
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Job.countDocuments(query);
  const result = { jobs, total, limit };

  await setCache(cacheKey, result, 60); // 60 second cache
  return result;
};

export const getJobById = async (jobId) => {
  if (!jobId.match(/^[0-9a-fA-F]{24}$/)) {
    throw new AppError('Job not found (Invalid ID format)', 404);
  }
  
  const cacheKey = `jobs:detail:${jobId}`;
  const cachedData = await getCache(cacheKey);
  if (cachedData) return cachedData;

  const job = await Job.findOne({ _id: jobId, isActive: true }).populate('employerId', 'name companyName').lean();
  if (!job) {
    throw new AppError('Job not found', 404);
  }
  
  await setCache(cacheKey, job, 120); // 120 second cache
  return job;
};

export const createJob = async (jobData, employerId) => {
  const data = {
    ...jobData,
    numericSalary: extractSalaryValue(jobData.salary),
    employerId,
  };
  const job = await Job.create(data);
  
  // Upsert embedding for job
  const jobText = [
    job.title, job.company, job.location, job.type, job.salary, job.experienceLevel, job.description,
    ...(job.tags || []), ...(job.responsibilities || []), ...(job.requirements || []), ...(job.benefits || [])
  ].filter(Boolean).join(' ');
  
  // Don't block response waiting for embedding
  embeddingService.upsertEmbedding({
    sourceType: 'job',
    sourceId: job._id,
    text: jobText,
    metadata: { title: job.title, company: job.company, location: job.location, type: job.type }
  });

  await invalidatePattern('jobs:list:*'); // Clear stale lists
  return job;
};

export const updateJob = async (jobId, employerId, updateData) => {
  const job = await Job.findById(jobId);

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (job.employerId.toString() !== employerId.toString()) {
    throw new AppError('Not authorized to update this job', 403);
  }

  const allowedUpdates = [
    'title', 'description', 'location', 'type', 'salary', 
    'experienceLevel', 'company', 'tags', 'responsibilities', 
    'requirements', 'benefits'
  ];
  
  allowedUpdates.forEach(field => {
    if (updateData[field] !== undefined) job[field] = updateData[field];
  });
  
  if (updateData.salary) {
    job.numericSalary = extractSalaryValue(updateData.salary);
  }

  await job.save();

  // Update embedding for job
  const jobText = [
    job.title, job.company, job.location, job.type, job.salary, job.experienceLevel, job.description,
    ...(job.tags || []), ...(job.responsibilities || []), ...(job.requirements || []), ...(job.benefits || [])
  ].filter(Boolean).join(' ');
  
  embeddingService.upsertEmbedding({
    sourceType: 'job',
    sourceId: job._id,
    text: jobText,
    metadata: { title: job.title, company: job.company, location: job.location, type: job.type }
  });

  await invalidatePattern('jobs:list:*');
  await invalidatePattern(`jobs:detail:${job._id}`);
  return job;
};

export const deleteJob = async (jobId, employerId) => {
  const job = await Job.findById(jobId);

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (job.employerId.toString() !== employerId.toString()) {
    throw new AppError('Not authorized to delete this job', 403);
  }
  
  job.isActive = false;
  await job.save();
  
  // Deactivate embedding
  embeddingService.deactivateEmbedding('job', job._id);
  
  await invalidatePattern('jobs:list:*');
  await invalidatePattern(`jobs:detail:${job._id}`);
};

export const getEmployerJobs = async (employerId) => {
  if (!employerId) {
    throw new AppError('User ID is missing', 400);
  }

  const jobs = await Job.find({ employerId })
    .sort({ createdAt: -1 })
    .lean();

  const jobIds = jobs.map(j => j._id);
  const applications = await Application.find({ jobId: { $in: jobIds } }).select('jobId').lean();

  return jobs.map(job => {
    const jobApplicants = applications.filter(app => app.jobId.toString() === job._id.toString());
    return { ...job, applicants: jobApplicants };
  });
};

export const toggleJobStatus = async (jobId, employerId) => {
  const job = await Job.findById(jobId);

  if (!job) {
    throw new AppError('Job not found', 404);
  }

  if (job.employerId.toString() !== employerId.toString()) {
    throw new AppError('Not authorized to update this job', 403);
  }
  
  job.isActive = !job.isActive;
  await job.save();
  
  // If closing, deactivate embedding. If reopening, reactivate (upsert).
  if (!job.isActive) {
    embeddingService.deactivateEmbedding('job', job._id);
  } else {
    const jobText = [
      job.title, job.company, job.location, job.type, job.salary, job.experienceLevel, job.description,
      ...(job.tags || []), ...(job.responsibilities || []), ...(job.requirements || []), ...(job.benefits || [])
    ].filter(Boolean).join(' ');
    
    embeddingService.upsertEmbedding({
      sourceType: 'job',
      sourceId: job._id,
      text: jobText,
      metadata: { title: job.title, company: job.company, location: job.location, type: job.type }
    });
  }
  
  await invalidatePattern('jobs:list:*');
  await invalidatePattern(`jobs:detail:${job._id}`);
  
  return job;
};
