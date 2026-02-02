import jwt from 'jsonwebtoken';
import { getLogger } from '../config/logger.js';

const logger = getLogger();

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { message: 'Access token is required' },
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Token verification failed:', error);
    return res.status(403).json({
      success: false,
      error: { message: 'Invalid or expired token' },
    });
  }
};

export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { message: 'User not authenticated' },
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        requiredRoles: roles,
        userRole: req.user.role,
      });
      return res.status(403).json({
        success: false,
        error: { message: 'Insufficient permissions' },
      });
    }

    next();
  };
};
