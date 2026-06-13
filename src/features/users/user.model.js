import mongoose from 'mongoose';
import crypto from 'crypto';

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
    sparse: true,
  },
  role: {
    type: String,
    enum: ['employer', 'jobseeker'],
    required: true,
  },
  savedJobs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
  }],
  profile: {
    bio: String,
    skills: [String],
    experience: Number,
    companyName: String,
  },
  resumeUrl: {
    type: String,
  },
  resumePublicId: {
    type: String,
  },
  resumeFileName: {
    type: String,
  },
  resumeUploadedAt: {
    type: Date,
  },
  resumeAnalysis: {
    type: Object,
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
}, { timestamps: true });

// Add Indexes
// Indexes removed because unique: true already creates them

// Generate and hash password reset token
userSchema.methods.getResetPasswordToken = function () {
  // Generate random 20-byte hex string
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash it and set to resetPasswordToken field (we store the hash, email the raw token)
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expiration to 15 minutes
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
export default User;
