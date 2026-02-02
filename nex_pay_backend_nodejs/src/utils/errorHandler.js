import { getLogger } from '../config/logger.js';

const logger = getLogger();

/**
 * Custom API Error
 */
export class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', data = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
    this.name = 'APIError';
  }
}

/**
 * Validation Error
 */
export class ValidationError extends APIError {
  constructor(message, errors = []) {
    super(message, 400, 'VALIDATION_ERROR', { errors });
  }
}

/**
 * Authentication Error
 */
export class AuthenticationError extends APIError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

/**
 * Authorization Error
 */
export class AuthorizationError extends APIError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

/**
 * Not Found Error
 */
export class NotFoundError extends APIError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict Error
 */
export class ConflictError extends APIError {
  constructor(message) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Rate Limit Error
 */
export class RateLimitError extends APIError {
  constructor(retryAfter = 60) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', { retryAfter });
  }
}

/**
 * Business Logic Error
 */
export class BusinessLogicError extends APIError {
  constructor(message, code = 'BUSINESS_LOGIC_ERROR') {
    super(message, 400, code);
  }
}

/**
 * Safe async wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error response formatter
 */
export const formatErrorResponse = (error, req) => {
  let statusCode = 500;
  let message = 'Internal Server Error';
  let code = 'INTERNAL_ERROR';
  let data = null;

  if (error instanceof APIError) {
    statusCode = error.statusCode;
    message = error.message;
    code = error.code;
    data = error.data;
  } else if (error instanceof ValidationError) {
    statusCode = 400;
    message = error.message;
    code = 'VALIDATION_ERROR';
    data = error.data;
  } else if (error.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_ERROR';
    data = {
      errors: Object.keys(error.errors).map((field) => ({
        field,
        message: error.errors[field].message,
      })),
    };
  } else if (error.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
    code = 'INVALID_ID_FORMAT';
  } else if (error.code === 11000) {
    statusCode = 409;
    message = 'Duplicate field value';
    code = 'DUPLICATE_ERROR';
  } else if (error instanceof TypeError) {
    logger.error('Type error:', error);
    statusCode = 400;
    message = 'Invalid request';
    code = 'TYPE_ERROR';
  }

  return {
    success: false,
    message,
    code,
    data,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };
};

export default {
  APIError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BusinessLogicError,
  asyncHandler,
  formatErrorResponse,
};
