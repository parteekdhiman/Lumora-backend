import express from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getSavedJobs,
  saveJob,
  removeSavedJob
} from './user.controller.js';
import { protect, jobseekerOnly } from '../../shared/middleware/auth.middleware.js';

const router = express.Router();

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

router.route('/saved-jobs')
  .get(protect, jobseekerOnly, getSavedJobs);

router.route('/saved-jobs/:jobId')
  .post(protect, jobseekerOnly, saveJob)
  .delete(protect, jobseekerOnly, removeSavedJob);

export default router;
