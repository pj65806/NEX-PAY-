import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '../config/logger.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { encryptAES } from '../config/encryption.js';

const logger = getLogger();

export class WalletService {
  async createDualWallet(userId) {
    try {
      const walletId = uuidv4();

      // Create fiat wallet
      const fiatWallet = {
        _id: uuidv4(),
        userId,
        walletType: 'fiat',
        walletAddress: `FIAT_${uuidv4().substr(0, 8).toUpperCase()}`,
        balance: 0,
        currency: 'USD',
        blockchain: null,
        status: 'active',
        createdAt: new Date(),
      };

      // Create crypto wallet (Ethereum-based)
      const ethWallet = ethers.Wallet.createRandom();
      const cryptoWallet = {
        _id: uuidv4(),
        userId,
        walletType: 'crypto',
        walletAddress: ethWallet.address,
        balance: 0,
        currency: 'ETH',
        blockchain: 'ethereum',
        publicKey: ethWallet.publicKey,
        encryptedPrivateKey: encryptAES(ethWallet.privateKey),
        status: 'active',
        createdAt: new Date(),
      };

      // Cache both wallets
      await cacheSet(`wallet:${fiatWallet._id}`, fiatWallet, 86400);
      await cacheSet(`wallet:${cryptoWallet._id}`, cryptoWallet, 86400);

      // Store mapping for user
      const userWallets = {
        userId,
        fiatWalletId: fiatWallet._id,
        cryptoWalletId: cryptoWallet._id,
        createdAt: new Date(),
      };

      await cacheSet(`user_wallets:${userId}`, userWallets, 86400);

      logger.info('Dual wallet created', {
        userId,
        fiatWalletId: fiatWallet._id,
        cryptoWalletId: cryptoWallet._id,
      });

      return {
        success: true,
        wallets: {
          fiat: fiatWallet,
          crypto: cryptoWallet,
        },
      };
    } catch (error) {
      logger.error('Dual wallet creation error:', error);
      throw error;
    }
  }

  async getUserWallets(userId) {
    try {
      const userWallets = await cacheGet(`user_wallets:${userId}`);

      if (!userWallets) {
        throw new Error('No wallets found for user');
      }

      const fiatWallet = await cacheGet(`wallet:${userWallets.fiatWalletId}`);
      const cryptoWallet = await cacheGet(`wallet:${userWallets.cryptoWalletId}`);

      return {
        success: true,
        wallets: {
          fiat: fiatWallet,
          crypto: cryptoWallet,
        },
      };
    } catch (error) {
      logger.error('Get user wallets error:', error);
      throw error;
    }
  }

  async updateWalletBalance(walletId, newBalance) {
    try {
      const wallet = await cacheGet(`wallet:${walletId}`);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      wallet.balance = newBalance;
      wallet.updatedAt = new Date();

      await cacheSet(`wallet:${walletId}`, wallet, 86400);

      logger.info('Wallet balance updated', {
        walletId,
        newBalance,
      });

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      logger.error('Wallet balance update error:', error);
      throw error;
    }
  }

  async getWalletBalance(walletId) {
    try {
      const wallet = await cacheGet(`wallet:${walletId}`);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      return {
        success: true,
        balance: wallet.balance,
        currency: wallet.currency,
        wallet,
      };
    } catch (error) {
      logger.error('Get wallet balance error:', error);
      throw error;
    }
  }

  async freezeWallet(walletId) {
    try {
      const wallet = await cacheGet(`wallet:${walletId}`);

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      wallet.status = 'frozen';
      await cacheSet(`wallet:${walletId}`, wallet, 86400);

      logger.warn('Wallet frozen', { walletId });

      return {
        success: true,
        wallet,
      };
    } catch (error) {
      logger.error('Freeze wallet error:', error);
      throw error;
    }
  }
}

export default new WalletService();
