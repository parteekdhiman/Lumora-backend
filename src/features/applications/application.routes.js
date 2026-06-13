import express from 'express';
import { applyForJob, getMyApplications, getJobApplicants, updateApplicationStatus } from './application.controller.js';
import { protect, employerOnly, jobseekerOnly } from '../../shared/middleware/auth.middleware.js';

const router = express.Router();

router.post('/apply', protect, jobseekerOnly, applyForJob);
router.get('/me', protect, jobseekerOnly, getMyApplications);

router.get('/job/:jobId', protect, employerOnly, getJobApplicants);
router.put('/:id/status', protect, employerOnly, updateApplicationStatus);

export default router;
