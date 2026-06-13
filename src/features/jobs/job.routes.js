import express from 'express';
import { getJobs, getJobById, createJob, updateJob, deleteJob, getEmployerJobs, toggleJobStatus } from './job.controller.js';
import { protect, employerOnly } from '../../shared/middleware/auth.middleware.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { createJobSchema } from './job.validation.js';

const router = express.Router();

router.get('/employer', protect, employerOnly, getEmployerJobs);

router.route('/')
  .get(getJobs)
  .post(protect, employerOnly, validate(createJobSchema), createJob);

router.route('/:id')
  .get(getJobById)
  .put(protect, employerOnly, validate(createJobSchema), updateJob)
  .delete(protect, employerOnly, deleteJob);

router.patch('/:id/status', protect, employerOnly, toggleJobStatus);

export default router;
