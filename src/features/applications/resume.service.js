import User from '../users/user.model.js';
import AppError from '../../shared/errors/AppError.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../../shared/utils/cloudinary.js';
import { analyzeResume as analyzeResumeWithAI } from '../ai/ai.service.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export const uploadResume = async (userId, file) => {
  if (!file) {
    throw new AppError("No PDF file provided.", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  // Extract text from PDF buffer right now to avoid Cloudinary fetching issues later
  let text = "";
  try {
    const pdfData = await pdfParse(file.buffer);
    text = pdfData.text;
  } catch (error) {
    throw new AppError("Failed to parse PDF text. Please ensure it is a valid PDF document.", 400);
  }

  let cloudRes;
  try {
    cloudRes = await uploadBufferToCloudinary(file.buffer, "lumora/resumes");
  } catch (error) {
    throw new AppError("Cloudinary upload failed.", 500);
  }

  if (user.resumePublicId) {
    try {
      await deleteFromCloudinary(user.resumePublicId, "raw");
    } catch (err) {
      console.error("Failed to delete old resume from Cloudinary:", err);
    }
  }

  user.resumeUrl = cloudRes.secure_url;
  user.resumePublicId = cloudRes.public_id;
  user.resumeFileName = file.originalname;
  user.resumeUploadedAt = new Date();
  user.resumeAnalysis = null; 
  user.resumeText = text;

  await user.save();

  return {
    url: user.resumeUrl,
    fileName: user.resumeFileName,
    uploadedAt: user.resumeUploadedAt
  };
};

export const getResume = async (userId) => {
  const user = await User.findById(userId);
  
  if (!user || !user.resumeUrl) {
    throw new AppError("No resume found for this user.", 404);
  }

  return {
    resumeUrl: user.resumeUrl,
    resumePublicId: user.resumePublicId,
    resumeFileName: user.resumeFileName,
    resumeUploadedAt: user.resumeUploadedAt,
    resumeAnalysis: user.resumeAnalysis
  };
};

export const deleteResume = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.resumePublicId) {
    throw new AppError("No resume to delete.", 404);
  }

  try {
    await deleteFromCloudinary(user.resumePublicId, "raw");
  } catch (err) {
    console.error("Cloudinary delete error:", err);
    throw new AppError("Failed to delete file from Cloudinary.", 500);
  }

  user.resumeUrl = undefined;
  user.resumePublicId = undefined;
  user.resumeFileName = undefined;
  user.resumeUploadedAt = undefined;
  user.resumeAnalysis = undefined;
  user.resumeText = undefined;

  await user.save();
};

export const analyzeResume = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.resumeText) {
    throw new AppError("Please upload a valid resume first to analyze it.", 400);
  }

  try {
    const text = user.resumeText;

    if (!text || text.trim().length < 50) {
      throw new AppError("PDF contains too little text to analyze.", 400);
    }

    const analysis = await analyzeResumeWithAI(text);

    user.resumeAnalysis = analysis;
    await user.save();

    // Embed resume text for matching
    import('../ai/embedding.service.js').then(({ embeddingService }) => {
      embeddingService.upsertEmbedding({
        sourceType: 'resume',
        sourceId: user._id,
        text: text,
        metadata: { userId: user._id, type: 'parsed_resume' }
      });
    }).catch(err => console.error("Failed to load embedding service for resume:", err));

    return analysis;

  } catch (error) {
    console.error("Analysis Error:", error);
    throw new AppError(error.message || "Failed to analyze resume. Please try again.", 500);
  }
};
