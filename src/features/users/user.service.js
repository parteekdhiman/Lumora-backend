import User from './user.model.js';
import Job from '../jobs/job.model.js';
import AppError from '../../shared/errors/AppError.js';

export const getUserProfile = async (userId) => {
  const user = await User.findById(userId).select('-password').lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

export const updateUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (updateData.password) {
    throw new AppError('Password update should be done via a separate route', 400);
  }

  user.name = updateData.name || user.name;
  
  if (updateData.profile) {
    const { bio, resumeUrl, skills, experience, companyName } = updateData.profile;
    user.profile = {
      ...user.profile,
      ...(bio !== undefined && { bio }),
      ...(resumeUrl !== undefined && { resumeUrl }),
      ...(skills !== undefined && { skills }),
      ...(experience !== undefined && { experience }),
      ...(companyName !== undefined && { companyName }),
    };
  }

  const updatedUser = await user.save();
  const userToReturn = updatedUser.toObject();
  delete userToReturn.password;
  
  return userToReturn;
};

export const getSavedJobs = async (userId) => {
  const user = await User.findById(userId).populate('savedJobs').lean();
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user.savedJobs;
};

export const saveJob = async (userId, jobId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const jobExists = await Job.findById(jobId);
  if (!jobExists) {
    throw new AppError('Job not found', 404);
  }

  if (user.savedJobs.some(id => id.toString() === jobId.toString())) {
    throw new AppError('Job already saved', 400);
  }

  user.savedJobs.push(jobId);
  await user.save();
  
  return user.savedJobs;
};

export const removeSavedJob = async (userId, jobId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.savedJobs = user.savedJobs.filter(id => id.toString() !== jobId);
  await user.save();
  
  return user.savedJobs;
};
