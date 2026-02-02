import { createClient } from 'redis';
import { getLogger } from './logger.js';

const logger = getLogger();

let redisClient;

export const initializeRedis = async () => {
  try {
    redisClient = createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      db: process.env.REDIS_DB || 0,
      password: process.env.REDIS_PASSWORD || undefined,
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on('error', (err) => {
      logger.error('Redis error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Redis connection error:', error);
    throw error;
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized');
  }
  return redisClient;
};

export const cacheGet = async (key) => {
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.error(`Cache get error for key ${key}:`, error);
    return null;
  }
};

export const cacheSet = async (key, value, ttl = 3600) => {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error(`Cache set error for key ${key}:`, error);
    return false;
  }
};

export const cacheDelete = async (key) => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error(`Cache delete error for key ${key}:`, error);
    return false;
  }
};

export const cacheClear = async (pattern = '*') => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('Cache clear error:', error);
    return false;
  }
};
