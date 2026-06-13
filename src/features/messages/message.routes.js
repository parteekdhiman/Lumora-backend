import express from 'express';
import { sendMessage, getConversation, getInbox } from './message.controller.js';
import { protect } from '../../shared/middleware/auth.middleware.js';

const router = express.Router();

// Apply auth middleware to all message routes
router.use(protect);

router.post('/', sendMessage);
router.get('/inbox', getInbox);
router.get('/:userId', getConversation);

export default router;
