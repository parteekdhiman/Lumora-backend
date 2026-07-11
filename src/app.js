import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { sanitizeMiddleware } from './shared/middleware/sanitize.middleware.js';
import { errorHandler } from './shared/middleware/error.middleware.js';
import routes from './routes/index.js';
import RedisStore from 'rate-limit-redis';
import { redisClient } from './shared/services/redis.service.js';

const app = express();

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(sanitizeMiddleware);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000, // Increased to prevent self-inflicted DoS
  standardHeaders: true, 
  legacyHeaders: false, 
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', limiter);

app.use('/api', routes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Lumora Server is running perfectly!' });
});

app.use(errorHandler);

export default app;
