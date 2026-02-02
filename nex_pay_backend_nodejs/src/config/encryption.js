import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import { getLogger } from './logger.js';

const logger = getLogger();

const ENCRYPTION_KEY = process.env.AES_ENCRYPTION_KEY || '00000000000000000000000000000000';
const ALGORITHM = 'aes-256-cbc';

export const encryptAES = (text, key = ENCRYPTION_KEY) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw error;
  }
};

export const decryptAES = (encryptedText, key = ENCRYPTION_KEY) => {
  try {
    const [iv, encrypted] = encryptedText.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw error;
  }
};

export const hashSHA256 = (text) => {
  return CryptoJS.SHA256(text).toString();
};

export const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};
