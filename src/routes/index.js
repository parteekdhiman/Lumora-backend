import express from 'express';
import authRoutes from '../features/auth/auth.routes.js';
import jobRoutes from '../features/jobs/job.routes.js';
import applicationRoutes from '../features/applications/application.routes.js';
import resumeRoutes from '../features/applications/resume.routes.js';
import userRoutes from '../features/users/user.routes.js';
import aiRoutes from '../features/ai/ai.routes.js';
import statRoutes from '../features/analytics/stat.routes.js';
import messageRoutes from '../features/messages/message.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/resumes', resumeRoutes);
router.use('/users', userRoutes);
router.use('/ai', aiRoutes);
router.use('/stats', statRoutes);
router.use('/messages', messageRoutes);


import { processChatbotMessage, getChatbotHistory, clearChatbotHistory, sendMessage } from '../features/ai/ai.controller.js';
import { protect } from '../shared/middleware/auth.middleware.js';

router.post('/chatbot/message', protect, processChatbotMessage); // fallback
router.get('/chatbot/history', protect, getChatbotHistory); // fallback
router.delete('/chatbot/clear', protect, clearChatbotHistory); // fallback
router.post('/chat', protect, sendMessage); // fallback

export default router;
