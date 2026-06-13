import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  jobseekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
  },
  resumeLink: {
    type: String,
    required: true,
  },
  coverLetter: {
    type: String,
  },
  status: {
    type: String,
    enum: ['submitted', 'viewed', 'shortlisted', 'interview', 'rejected', 'hired'],
    default: 'submitted',
  },
  aiScore: {
    type: Number,
    min: 0,
    max: 100
  },
  aiScreeningSummary: {
    type: String
  }
}, { timestamps: true });

// Add Indexes
applicationSchema.index({ jobId: 1, employerId: 1, createdAt: -1 }); // For employer seeing applicants
applicationSchema.index({ jobseekerId: 1, createdAt: -1 }); // For user seeing their applications
applicationSchema.index({ jobId: 1, jobseekerId: 1 }, { unique: true }); // Prevent duplicate applications

const Application = mongoose.model('Application', applicationSchema);
export default Application;
