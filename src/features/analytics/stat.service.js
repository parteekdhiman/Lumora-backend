import User from '../users/user.model.js';
import Job from '../jobs/job.model.js';
import Application from '../applications/application.model.js';

export const getSystemStats = async () => {
  const totalUsers = await User.countDocuments();
  const totalJobs = await Job.countDocuments({ isActive: true });
  const totalApplications = await Application.countDocuments();
  const totalHired = await Application.countDocuments({ status: 'hired' });

  return {
    totalUsers: totalUsers > 0 ? totalUsers : 0,
    totalJobs: totalJobs > 0 ? totalJobs : 0,
    totalApplications: totalApplications > 0 ? totalApplications : 0,
    totalHired: totalHired > 0 ? totalHired : 0,
  };
};
