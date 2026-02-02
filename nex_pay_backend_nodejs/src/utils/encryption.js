import CryptoJS from 'crypto-js';
import { ethers } from 'ethers';
import { getLogger } from '../config/logger.js';

const logger = getLogger();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

/**
 * Encrypt data using AES
 */
export const encrypt = (data) => {
  try {
    const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    return encrypted;
  } catch (error) {
    logger.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
};

/**
 * Decrypt data using AES
 */
export const decrypt = (encryptedData) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    const decrypted = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decrypted;
  } catch (error) {
    logger.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
};

/**
 * Hash data using SHA256
 */
export const hashData = (data) => {
  try {
    const hash = CryptoJS.SHA256(data).toString();
    return hash;
  } catch (error) {
    logger.error('Hashing error:', error);
    throw new Error('Hashing failed');
  }
};

/**
 * Generate new Ethereum wallet
 */
export const generateWallet = () => {
  try {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic?.phrase,
    };
  } catch (error) {
    logger.error('Wallet generation error:', error);
    throw new Error('Failed to generate wallet');
  }
};

/**
 * Generate wallet address
 */
export const generateWalletAddress = async () => {
  try {
    const wallet = generateWallet();
    return wallet.address;
  } catch (error) {
    logger.error('Wallet address generation error:', error);
    throw new Error('Failed to generate wallet address');
  }
};

/**
 * Encrypt private key
 */
export const encryptPrivateKey = (privateKey) => {
  try {
    if (!privateKey) {
      return null;
    }
    const encrypted = encrypt(privateKey);
    return encrypted;
  } catch (error) {
    logger.error('Private key encryption error:', error);
    throw new Error('Failed to encrypt private key');
  }
};

/**
 * Decrypt private key
 */
export const decryptPrivateKey = (encryptedPrivateKey) => {
  try {
    if (!encryptedPrivateKey) {
      return null;
    }
    const decrypted = decrypt(encryptedPrivateKey);
    return decrypted;
  } catch (error) {
    logger.error('Private key decryption error:', error);
    throw new Error('Failed to decrypt private key');
  }
};

/**
 * Sign message with private key
 */
export const signMessage = (privateKey, message) => {
  try {
    const wallet = new ethers.Wallet(privateKey);
    const signature = wallet.signMessage(message);
    return signature;
  } catch (error) {
    logger.error('Message signing error:', error);
    throw new Error('Failed to sign message');
  }
};

/**
 * Verify message signature
 */
export const verifySignature = (message, signature, address) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
};

/**
 * Generate secure random token
 */
export const generateSecureToken = (length = 32) => {
  try {
    const array = new Uint8Array(length);
    const randomValues = crypto.getRandomValues(array);
    return Array.from(randomValues)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    logger.error('Token generation error:', error);
    throw new Error('Failed to generate secure token');
  }
};

/**
 * Hash password (using CryptoJS for compatibility)
 */
export const hashPassword = (password) => {
  try {
    const hash = CryptoJS.SHA256(password + ENCRYPTION_KEY).toString();
    return hash;
  } catch (error) {
    logger.error('Password hashing error:', error);
    throw new Error('Failed to hash password');
  }
};

/**
 * Validate wallet format
 */
export const isValidWalletAddress = (address, blockchain = 'ethereum') => {
  try {
    if (blockchain === 'ethereum' || blockchain === 'ethereum-like') {
      return ethers.isAddress(address);
    } else if (blockchain === 'bitcoin') {
      return /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address) || /^bc1[a-z0-9]{39,59}$/.test(address);
    }
    return false;
  } catch (error) {
    logger.error('Wallet validation error:', error);
    return false;
  }
};

/**
 * Get wallet info from address
 */
export const getWalletInfo = (address) => {
  try {
    if (ethers.isAddress(address)) {
      return {
        isValid: true,
        blockchain: 'ethereum',
        checksumAddress: ethers.getAddress(address),
      };
    }
    return {
      isValid: false,
      blockchain: null,
    };
  } catch (error) {
    logger.error('Wallet info error:', error);
    return {
      isValid: false,
      blockchain: null,
    };
  }
};

export default {
  encrypt,
  decrypt,
  hashData,
  generateWallet,
  generateWalletAddress,
  encryptPrivateKey,
  decryptPrivateKey,
  signMessage,
  verifySignature,
  generateSecureToken,
  hashPassword,
  isValidWalletAddress,
  getWalletInfo,
};
