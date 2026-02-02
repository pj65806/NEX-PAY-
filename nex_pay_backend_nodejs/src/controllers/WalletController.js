import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { getLogger } from '../config/logger.js';
import { cacheSet, cacheGet, cacheDel } from '../config/redis.js';

const logger = getLogger();

export class WalletController {
  /**
   * Get wallet balance
   */
  async getBalance(req, res) {
    try {
      const userId = req.user?.id;

      const wallet = await Wallet.findOne({ userId }).select('-privateKeyEncrypted');

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      // Calculate available balance
      const availableBalance = wallet.totalBalance - wallet.holdAmount;

      res.status(200).json({
        success: true,
        message: 'Wallet balance retrieved successfully',
        code: 'BALANCE_RETRIEVED',
        data: {
          walletAddress: wallet.walletAddress,
          totalBalance: wallet.totalBalance,
          holdAmount: wallet.holdAmount,
          availableBalance,
          balances: wallet.balances,
          currency: wallet.balances.fiat.currency,
          dailyLimit: wallet.dailyLimit,
          monthlyLimit: wallet.monthlyLimit,
          yearlyLimit: wallet.yearlyLimit,
        },
      });
    } catch (error) {
      logger.error('Get balance error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve wallet balance',
        code: 'BALANCE_ERROR',
        error: error.message,
      });
    }
  }

  /**
   * Get wallet details
   */
  async getDetails(req, res) {
    try {
      const userId = req.user?.id;

      let wallet = await cacheGet(`wallet:${userId}`);

      if (!wallet) {
        wallet = await Wallet.findOne({ userId })
          .select('-privateKeyEncrypted')
          .populate('linkedBankAccounts')
          .populate('linkedCryptoAddresses');

        if (!wallet) {
          return res.status(404).json({
            success: false,
            message: 'Wallet not found',
            code: 'WALLET_NOT_FOUND',
          });
        }

        await cacheSet(`wallet:${userId}`, wallet, 3600);
      }

      res.status(200).json({
        success: true,
        message: 'Wallet details retrieved successfully',
        code: 'WALLET_DETAILS_RETRIEVED',
        data: wallet,
      });
    } catch (error) {
      logger.error('Get wallet details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve wallet details',
        code: 'WALLET_ERROR',
        error: error.message,
      });
    }
  }

  /**
   * Link bank account
   */
  async linkBankAccount(req, res) {
    try {
      const userId = req.user?.id;
      const { accountNumber, bankCode, accountName } = req.body;

      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      // Check if account already linked
      const alreadyLinked = wallet.linkedBankAccounts.some((acc) => acc.accountNumber === accountNumber);

      if (alreadyLinked) {
        return res.status(409).json({
          success: false,
          message: 'Bank account already linked',
          code: 'ACCOUNT_ALREADY_LINKED',
        });
      }

      const newAccount = {
        accountId: `${bankCode}-${accountNumber}`,
        accountNumber,
        bankCode,
        accountName,
        isVerified: false,
        isPrimary: wallet.linkedBankAccounts.length === 0,
      };

      wallet.linkedBankAccounts.push(newAccount);
      await wallet.save();

      // Invalidate cache
      await cacheDel(`wallet:${userId}`);

      logger.info(`Bank account linked for wallet: ${wallet._id}`);

      res.status(201).json({
        success: true,
        message: 'Bank account linked successfully',
        code: 'ACCOUNT_LINKED',
        data: newAccount,
      });
    } catch (error) {
      logger.error('Link bank account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to link bank account',
        code: 'LINK_ACCOUNT_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Link crypto address
   */
  async linkCryptoAddress(req, res) {
    try {
      const userId = req.user?.id;
      const { address, blockchain } = req.body;

      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      // Check if address already linked
      const alreadyLinked = wallet.linkedCryptoAddresses.some(
        (addr) => addr.address.toLowerCase() === address.toLowerCase() && addr.blockchain === blockchain
      );

      if (alreadyLinked) {
        return res.status(409).json({
          success: false,
          message: 'Crypto address already linked',
          code: 'ADDRESS_ALREADY_LINKED',
        });
      }

      const newAddress = {
        address,
        blockchain,
        isVerified: false,
        isPrimary: wallet.linkedCryptoAddresses.length === 0,
      };

      wallet.linkedCryptoAddresses.push(newAddress);
      await wallet.save();

      await cacheDel(`wallet:${userId}`);

      logger.info(`Crypto address linked for wallet: ${wallet._id}`);

      res.status(201).json({
        success: true,
        message: 'Crypto address linked successfully',
        code: 'ADDRESS_LINKED',
        data: newAddress,
      });
    } catch (error) {
      logger.error('Link crypto address error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to link crypto address',
        code: 'LINK_ADDRESS_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Remove linked bank account
   */
  async removeBankAccount(req, res) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.params;

      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      const accountIndex = wallet.linkedBankAccounts.findIndex((acc) => acc.accountId === accountId);

      if (accountIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Bank account not found',
          code: 'ACCOUNT_NOT_FOUND',
        });
      }

      wallet.linkedBankAccounts.splice(accountIndex, 1);

      // If primary was removed, set new primary
      if (wallet.linkedBankAccounts.length > 0 && !wallet.linkedBankAccounts.some((acc) => acc.isPrimary)) {
        wallet.linkedBankAccounts[0].isPrimary = true;
      }

      await wallet.save();
      await cacheDel(`wallet:${userId}`);

      logger.info(`Bank account removed from wallet: ${wallet._id}`);

      res.status(200).json({
        success: true,
        message: 'Bank account removed successfully',
        code: 'ACCOUNT_REMOVED',
      });
    } catch (error) {
      logger.error('Remove bank account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove bank account',
        code: 'REMOVE_ACCOUNT_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Set primary bank account
   */
  async setPrimaryBankAccount(req, res) {
    try {
      const userId = req.user?.id;
      const { accountId } = req.body;

      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      // Update all accounts
      wallet.linkedBankAccounts.forEach((acc) => {
        acc.isPrimary = acc.accountId === accountId;
      });

      await wallet.save();
      await cacheDel(`wallet:${userId}`);

      logger.info(`Primary bank account set for wallet: ${wallet._id}`);

      res.status(200).json({
        success: true,
        message: 'Primary bank account set successfully',
        code: 'PRIMARY_SET',
      });
    } catch (error) {
      logger.error('Set primary bank account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to set primary bank account',
        code: 'SET_PRIMARY_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(req, res) {
    try {
      const userId = req.user?.id;
      const { skip = 0, limit = 20 } = req.query;

      const wallet = await Wallet.findOne({ userId })
        .populate({
          path: 'transactions',
          options: {
            skip: parseInt(skip),
            limit: parseInt(limit),
            sort: { createdAt: -1 },
          },
        })
        .select('transactionHistory transactions');

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Transaction history retrieved successfully',
        code: 'HISTORY_RETRIEVED',
        data: {
          summary: wallet.transactionHistory,
          transactions: wallet.transactions,
          pagination: {
            skip: parseInt(skip),
            limit: parseInt(limit),
          },
        },
      });
    } catch (error) {
      logger.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transaction history',
        code: 'HISTORY_ERROR',
        error: error.message,
      });
    }
  }

  /**
   * Freeze wallet
   */
  async freezeWallet(req, res) {
    try {
      const userId = req.user?.id;
      const { reason } = req.body;

      const wallet = await Wallet.findOne({ userId });

      if (!wallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      wallet.freezeStatus = 'frozen';
      wallet.freezeReason = reason;
      wallet.freezeUntil = null; // Indefinite freeze
      await wallet.save();

      await cacheDel(`wallet:${userId}`);

      logger.info(`Wallet frozen: ${wallet._id} (Reason: ${reason})`);

      res.status(200).json({
        success: true,
        message: 'Wallet frozen successfully',
        code: 'WALLET_FROZEN',
      });
    } catch (error) {
      logger.error('Freeze wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to freeze wallet',
        code: 'FREEZE_FAILED',
        error: error.message,
      });
    }
  }
}

export default new WalletController();
