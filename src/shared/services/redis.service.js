import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 3) {
        console.warn('Max retries reached. Running without cache.');
        return new Error('Max retries reached');
      }
      return Math.min(retries * 100, 3000);
    }
  }
});

let isConnected = false;

export const connectRedis = async () => {
  redisClient.on('error', (err) => {
    if (isConnected) {
      console.warn('Redis connection lost.', err.message);
    }
    isConnected = false;
  });

  redisClient.on('ready', () => {
    console.log('Redis connected successfully');
    isConnected = true;
  });

  try {
    await redisClient.connect();
  } catch (err) {
    console.warn('Initial Redis connection failed.');
  }
};

export const getCache = async (key) => {
  if (!isConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Redis Get Error:', error.message);
    return null;
  }
};

export const setCache = async (key, value, ttl = 60) => {
  if (!isConnected) return;
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Redis Set Error:', error.message);
  }
};

export const invalidatePattern = async (pattern) => {
  if (!isConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    console.error('Redis Invalidate Error:', error.message);
  }
};

// Auto-connect
connectRedis();
