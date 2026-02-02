import axios from 'axios';
import { getLogger } from '../config/logger.js';

const logger = getLogger();

/**
 * Exchange rate API calls
 */
export const getExchangeRates = async () => {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    return response.data.rates;
  } catch (error) {
    logger.warn('Failed to fetch exchange rates:', error.message);
    // Return default rates if API fails
    return {
      NGN: 410,
      EUR: 0.92,
      GBP: 0.79,
      KES: 130,
      GHS: 12,
      ZAR: 19,
    };
  }
};

/**
 * Get exchange rate between two currencies
 */
export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    const rates = await getExchangeRates();
    const baseRate = rates[toCurrency] || 1;
    return amount * baseRate;
  } catch (error) {
    logger.error('Currency conversion error:', error);
    return amount;
  }
};

/**
 * Generate unique reference
 */
export const generateReference = (prefix = 'TXN') => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Format transaction date
 */
export const formatDate = (date) => {
  return new Date(date).toISOString();
};

/**
 * Calculate transaction fee
 */
export const calculateFee = (amount, transactionType = 'peer-to-peer') => {
  const rates = {
    'peer-to-peer': 0.01, // 1%
    'international': 0.025, // 2.5%
    'cross-border': 0.03, // 3%
    'deposit': 0.005, // 0.5%
    'withdrawal': 0.015, // 1.5%
  };

  const rate = rates[transactionType] || 0.01;
  const fee = amount * rate;

  return {
    platformFee: fee,
    totalFee: fee,
  };
};

/**
 * Validate transaction
 */
export const validateTransaction = (transaction) => {
  const errors = [];

  if (!transaction.senderId) errors.push('Sender ID is required');
  if (!transaction.amount || transaction.amount <= 0) errors.push('Amount must be positive');
  if (!transaction.currencyFrom) errors.push('Source currency is required');
  if (!transaction.currencyTo) errors.push('Target currency is required');

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Get pagination info
 */
export const getPagination = (skip, limit) => {
  return {
    skip: parseInt(skip) || 0,
    limit: parseInt(limit) || 10,
  };
};

/**
 * Build query filters
 */
export const buildFilters = (queryParams) => {
  const filters = {};

  if (queryParams.status) filters.status = queryParams.status;
  if (queryParams.type) filters.transactionType = queryParams.type;
  if (queryParams.minAmount) filters.amount = { $gte: parseFloat(queryParams.minAmount) };
  if (queryParams.maxAmount) {
    if (filters.amount) {
      filters.amount.$lte = parseFloat(queryParams.maxAmount);
    } else {
      filters.amount = { $lte: parseFloat(queryParams.maxAmount) };
    }
  }

  return filters;
};

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Sleep utility
 */
export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry logic
 */
export const retry = async (fn, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await sleep(delay);
    }
  }
};

export default {
  getExchangeRates,
  convertCurrency,
  generateReference,
  formatDate,
  calculateFee,
  validateTransaction,
  getPagination,
  buildFilters,
  formatCurrency,
  sleep,
  retry,
};
