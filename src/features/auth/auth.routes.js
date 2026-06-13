import express from 'express';
import { registerUser, loginUser, googleLogin, logoutUser, forgotPassword, resetPassword } from './auth.controller.js';
import { validate } from '../../shared/middleware/validate.middleware.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.validation.js';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../../shared/services/redis.service.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per `window` (here, per 15 minutes)
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => {
      if (!redisClient.isReady) return Promise.reject(new Error('Redis not ready'));
      return redisClient.sendCommand(args);
    },
  }),
  passOnStoreError: true,
  message: 'Too many login/register attempts from this IP, please try again after 15 minutes',
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Increased to 10 for easier development/testing (was 3)
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => {
      if (!redisClient.isReady) return Promise.reject(new Error('Redis not ready'));
      return redisClient.sendCommand(args);
    },
  }),
  passOnStoreError: true,
  message: 'Too many password reset requests from this IP, please try again after an hour',
});

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), registerUser);
router.post('/login', authLimiter, validate(loginSchema), loginUser);
router.post('/logout', logoutUser);
router.post('/google', googleLogin);
router.post('/forgot-password', passwordResetLimiter, validate(forgotPasswordSchema), forgotPassword);
router.put('/reset-password/:token', validate(resetPasswordSchema), resetPassword);

export default router;
