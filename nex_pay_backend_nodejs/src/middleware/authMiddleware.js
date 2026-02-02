import jwt from 'jsonwebtoken';
import { getLogger } from '../config/logger.js';
import { cacheGet } from '../config/redis.js';
import User from '../models/User.js';

const logger = getLogger();

/**
 * JWT Authentication Middleware
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authorization token provided',
        code: 'NO_TOKEN',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token is cached and valid
    const cachedToken = await cacheGet(`access_token:${decoded.userId}`);
    if (!cachedToken) {
      // Token may have been invalidated
      return res.status(401).json({
        success: false,
        message: 'Token has been invalidated',
        code: 'TOKEN_INVALIDATED',
      });
    }

    // Get user from cache or database
    let user = await cacheGet(`user:${decoded.userId}`);
    if (!user) {
      user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }
      // Cache user
      // await cacheSet(`user:${user._id}`, user, 3600);
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account is inactive',
        code: 'ACCOUNT_INACTIVE',
      });
    }

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      accountType: decoded.accountType,
      ...user,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
        code: 'INVALID_TOKEN',
      });
    }

    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      code: 'AUTH_FAILED',
      error: error.message,
    });
  }
};

/**
 * Optional Authentication Middleware
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (user && user.isActive) {
      req.user = {
        id: decoded.userId,
        email: decoded.email,
        accountType: decoded.accountType,
        ...user,
      };
    }

    next();
  } catch (error) {
    // Even if token is invalid, continue
    req.user = null;
    next();
  }
};

/**
 * Role-based Authorization Middleware
 */
export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    const userRole = req.user.accountType;

    if (roles.length && !roles.includes(userRole)) {
      logger.warn(`Unauthorized access attempt by user: ${req.user.id}`);
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
};

/**
 * Admin Authorization Middleware
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NO_AUTH',
    });
  }

  // Check if user has admin role (you might store this differently)
  if (req.user.accountType !== 'admin') {
    logger.warn(`Admin access attempt by non-admin user: ${req.user.id}`);
    return res.status(403).json({
      success: false,
      message: 'Admin access required',
      code: 'ADMIN_REQUIRED',
    });
  }

  next();
};

/**
 * KYC Verification Middleware
 */
export const requireKYC = (minLevel = 1) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'NO_AUTH',
      });
    }

    if (req.user.kycStatus !== 'approved' || req.user.kycLevel < minLevel) {
      return res.status(403).json({
        success: false,
        message: `KYC Level ${minLevel} verification required`,
        code: 'KYC_REQUIRED',
        currentKYCLevel: req.user.kycLevel,
        kycStatus: req.user.kycStatus,
      });
    }

    next();
  };
};

/**
 * Verified Email Middleware
 */
export const requireVerifiedEmail = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      code: 'NO_AUTH',
    });
  }

  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }

  next();
};

/**
 * Rate limit by user
 */
export const rateLimitByUser = (maxRequests, windowMs) => {
  const requestMap = new Map();

  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user.id;
    const now = Date.now();

    if (!requestMap.has(userId)) {
      requestMap.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }

    const userData = requestMap.get(userId);

    if (now > userData.resetTime) {
      userData.count = 1;
      userData.resetTime = now + windowMs;
      return next();
    }

    userData.count++;

    if (userData.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000),
      });
    }

    next();
  };
};

export default {
  authenticate,
  optionalAuth,
  authorize,
  requireAdmin,
  requireKYC,
  requireVerifiedEmail,
  rateLimitByUser,
};
