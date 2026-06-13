import express from 'express';
import { protect, employerOnly, jobseekerOnly } from '../../shared/middleware/auth.middleware.js';
import { 
  getJobRecommendations, 
  generateJob, 
  processChatbotMessage, 
  getChatbotHistory, 
  clearChatbotHistory, 
  sendMessage,
  getResumeJobMatches,
  analyzeSkillGap
} from './ai.controller.js';

const router = express.Router();

// AI Tools
router.get('/recommendations', protect, jobseekerOnly, getJobRecommendations);
router.get('/resume-job-matches', protect, jobseekerOnly, getResumeJobMatches);
router.get('/skill-gap/:jobId', protect, jobseekerOnly, analyzeSkillGap);
router.post('/generate-job', protect, employerOnly, generateJob);

// Chatbot (Lumora Assistant)
router.post('/chatbot/chat', protect, processChatbotMessage);
router.get('/chatbot/history', protect, getChatbotHistory);
router.delete('/chatbot/history', protect, clearChatbotHistory);

// Standalone Chat
router.post('/chat', protect, sendMessage);

export default router;
