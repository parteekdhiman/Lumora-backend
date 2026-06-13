import express from 'express';
import { getSystemStats } from './stat.controller.js';

const router = express.Router();

router.get('/', getSystemStats);

export default router;
