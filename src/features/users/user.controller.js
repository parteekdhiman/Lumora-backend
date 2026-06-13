import * as userService from './user.service.js';
import { asyncHandler } from '../../shared/utils/asyncHandler.js';

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await userService.getUserProfile(req.user._id);
  res.json(user);
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const updatedUser = await userService.updateUserProfile(req.user._id, req.body);
  res.json(updatedUser);
});

export const getSavedJobs = asyncHandler(async (req, res) => {
  const savedJobs = await userService.getSavedJobs(req.user._id);
  res.json({ savedJobs });
});

export const saveJob = asyncHandler(async (req, res) => {
  const savedJobs = await userService.saveJob(req.user._id, req.params.jobId);
  res.json({ message: 'Job saved successfully', savedJobs });
});

export const removeSavedJob = asyncHandler(async (req, res) => {
  const savedJobs = await userService.removeSavedJob(req.user._id, req.params.jobId);
  res.json({ message: 'Job removed from saved jobs', savedJobs });
});
