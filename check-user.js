import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/features/users/user.model.js';

dotenv.config();

async function checkUser() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lumora');
  
  const user = await User.findOne({ resumeUrl: { $exists: true, $ne: null } }).sort({ resumeUploadedAt: -1 });
  
  if (!user) {
    console.log("No user with a resume found.");
  } else {
    console.log("User Email:", user.email);
    console.log("Resume Uploaded At:", user.resumeUploadedAt);
    console.log("Has resumeText:", !!user.resumeText);
  }
  process.exit(0);
}

checkUser();
