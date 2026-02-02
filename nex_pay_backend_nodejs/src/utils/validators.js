import Joi from 'joi';
import { getLogger } from '../config/logger.js';

const logger = getLogger();

export const validationSchemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(8).required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    phoneNumber: Joi.string().required(),
    dateOfBirth: Joi.date().required(),
    nationality: Joi.string().required(),
  }),

  login: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  verifyEmail: Joi.object({
    token: Joi.string().uuid().required(),
  }),

  requestPasswordReset: Joi.object({
    email: Joi.string().email().lowercase().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().uuid().required(),
    newPassword: Joi.string().min(8).required(),
  }),

  // User schemas
  updateProfile: Joi.object({
    firstName: Joi.string(),
    lastName: Joi.string(),
    phoneNumber: Joi.string(),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      postalCode: Joi.string(),
      country: Joi.string(),
    }),
    profilePicture: Joi.string().uri(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }),

  // Payment schemas
  initiatePayment: Joi.object({
    recipientId: Joi.string().required(),
    amount: Joi.number().positive().required(),
    currencyFrom: Joi.string().required(),
    currencyTo: Joi.string().required(),
    description: Joi.string().optional(),
  }),

  confirmPayment: Joi.object({
    transactionId: Joi.string().required(),
    otp: Joi.string().length(6).optional(),
  }),

  // Wallet schemas
  linkBankAccount: Joi.object({
    accountNumber: Joi.string().required(),
    bankCode: Joi.string().required(),
    accountName: Joi.string().required(),
  }),

  withdraw: Joi.object({
    amount: Joi.number().positive().required(),
    currency: Joi.string().required(),
    destination: Joi.string().required(),
  }),

  // KYC schemas
  submitKYC: Joi.object({
    kycLevel: Joi.number().valid(1, 2, 3).required(),
    documents: Joi.array().items(
      Joi.object({
        documentType: Joi.string().required(),
        file: Joi.binary().required(),
      })
    ),
  }),

  // Admin schemas
  createAdminUser: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
    role: Joi.string().valid('admin', 'moderator', 'analyst').required(),
  }),

  updateUserKYCStatus: Joi.object({
    userId: Joi.string().required(),
    kycLevel: Joi.number().valid(1, 2, 3).required(),
    status: Joi.string().valid('approved', 'rejected', 'pending').required(),
    notes: Joi.string().optional(),
  }),
};

/**
 * Validation middleware
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error:', details);

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: details,
      });
    }

    // Replace body with validated data
    req.body = value;
    next();
  };
};

/**
 * Email validation
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Phone validation
 */
export const isValidPhoneNumber = (phone) => {
  const phoneRegex = /^[\d\+\-\s\(\)]{7,}$/;
  return phoneRegex.test(phone);
};

/**
 * Amount validation
 */
export const isValidAmount = (amount, min = 0.01, max = 999999999) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= min && num <= max;
};

/**
 * Currency validation
 */
export const isValidCurrency = (currency) => {
  const validCurrencies = [
    'USD',
    'EUR',
    'GBP',
    'NGN',
    'KES',
    'GHS',
    'ZAR',
    'BTC',
    'ETH',
    'USDC',
    'USDT',
    'DAI',
  ];
  return validCurrencies.includes(currency);
};

/**
 * Crypto address validation
 */
export const isValidCryptoAddress = (address, blockchain = 'ethereum') => {
  if (blockchain === 'ethereum' || blockchain === 'ethereum-like') {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  } else if (blockchain === 'bitcoin') {
    return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address);
  }
  return false;
};

/**
 * Strong password validation
 */
export const isStrongPassword = (password) => {
  const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return strongRegex.test(password);
};

/**
 * Request validation for query params and path params
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        code: 'QUERY_VALIDATION_ERROR',
        errors: error.details,
      });
    }

    req.query = value;
    next();
  };
};
