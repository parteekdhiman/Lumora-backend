import mongoose from 'mongoose';

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'],
    required: true,
  },
  salary: {
    type: String,
    required: true,
  },
  numericSalary: {
    type: Number,
    default: 0,
  },
  experienceLevel: {
    type: String,
    enum: ['Entry Level', 'Mid Level', 'Senior Level', 'Executive'],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
  }],
  responsibilities: [{
    type: String,
  }],
  requirements: [{
    type: String,
  }],
  benefits: [{
    type: String,
  }],
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

// Add Indexes for performance and secure search
jobSchema.index({ employerId: 1, createdAt: -1 }); // For employer's jobs
jobSchema.index({ isActive: 1, numericSalary: 1 }); // For filtering
jobSchema.index({ title: 'text', company: 'text', description: 'text', tags: 'text' }); // For text search

const Job = mongoose.model('Job', jobSchema);
export default Job;
