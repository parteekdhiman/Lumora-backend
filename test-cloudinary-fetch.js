import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/features/users/user.model.js';
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function testFetch() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/lumora');
  
  const user = await User.findOne({ resumeUrl: { $exists: true, $ne: null } }).sort({ resumeUploadedAt: -1 });
  
  if (!user) {
    console.log("No user with a resume found.");
    process.exit(0);
  }
  
  console.log("Found resume Public ID:", user.resumePublicId);
  
  // Try generating a signed URL
  const signedUrl = cloudinary.url(user.resumePublicId, {
    resource_type: "raw",
    sign_url: true
  });
  
  console.log("Signed URL:", signedUrl);
  
  try {
    const response = await fetch(signedUrl);
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    if (!response.ok) {
      const text = await response.text();
      console.log("Error text:", text);
    } else {
      console.log("Fetch successful.");
      const buf = await response.arrayBuffer();
      console.log("Buffer byte length:", buf.byteLength);
    }
  } catch (error) {
    console.error("Fetch failed:", error);
  }
  
  process.exit(0);
}

testFetch();
