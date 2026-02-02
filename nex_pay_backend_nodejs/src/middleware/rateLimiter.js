import rateLimit from 'express-rate-limit';
import { cacheGet, cacheSet } from '../config/redis.js';

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health',
  store: new (class {
    async increment(key) {
      const count = await cacheGet(key) || 0;
      await cacheSet(key, count + 1, 900);
      return count + 1;
    }
    async resetKey(key) {
      await cacheSet(key, 0, 900);
    }
  })(),
});

export default limiter;
