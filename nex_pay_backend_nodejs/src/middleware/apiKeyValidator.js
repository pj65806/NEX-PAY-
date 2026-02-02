import { getLogger } from '../config/logger.js';

const logger = getLogger();

const apiKeyValidator = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    logger.warn('Missing API key', { path: req.path, ip: req.ip });
    return res.status(401).json({
      success: false,
      error: { message: 'API key is required' },
    });
  }

  if (apiKey !== process.env.API_GATEWAY_SECRET) {
    logger.warn('Invalid API key', { path: req.path, ip: req.ip });
    return res.status(403).json({
      success: false,
      error: { message: 'Invalid API key' },
    });
  }

  next();
};

export default apiKeyValidator;
