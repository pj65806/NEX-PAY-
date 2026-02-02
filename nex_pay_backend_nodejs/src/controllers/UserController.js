import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import KYC from '../models/KYC.js';
import { getLogger } from '../config/logger.js';
import { cacheSet, cacheGet, cacheDel } from '../config/redis.js';

const logger = getLogger();

export class UserController {
  /**
   * Get user profile
   */
  async getProfile(req, res) {
    try {
      const userId = req.user?.id;

      let user = await cacheGet(`user:${userId}`);
      if (!user) {
        user = await User.findById(userId).select('-password -verificationToken -passwordResetToken');
        if (!user) {
          return res.status(404).json({
            success: false,
            message: 'User not found',
            code: 'USER_NOT_FOUND',
          });
        }
        await cacheSet(`user:${userId}`, user, 3600);
      }

      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        code: 'PROFILE_RETRIEVED',
        data: user,
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve profile',
        code: 'PROFILE_ERROR',
        error: error.message,
      });
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user?.id;
      const { firstName, lastName, address, phoneNumber, profilePicture } = req.body;

      const updateData = {};
      if (firstName) updateData.firstName = firstName;
      if (lastName) updateData.lastName = lastName;
      if (address) updateData.address = address;
      if (phoneNumber) updateData.phoneNumber = phoneNumber;
      if (profilePicture) updateData.profilePicture = profilePicture;

      const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Invalidate cache
      await cacheDel(`user:${userId}`);

      logger.info(`User profile updated: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        code: 'PROFILE_UPDATED',
        data: user,
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        code: 'UPDATE_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user?.id;
      const { currentPassword, newPassword } = req.body;

      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Current password is incorrect',
          code: 'INVALID_PASSWORD',
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      logger.info(`Password changed for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        code: 'PASSWORD_CHANGED',
      });
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to change password',
        code: 'CHANGE_PASSWORD_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Get user wallet
   */
  async getWallet(req, res) {
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

      res.status(200).json({
        success: true,
        message: 'Wallet retrieved successfully',
        code: 'WALLET_RETRIEVED',
        data: wallet,
      });
    } catch (error) {
      logger.error('Get wallet error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve wallet',
        code: 'WALLET_ERROR',
        error: error.message,
      });
    }
  }

  /**
   * Enable two-factor authentication
   */
  async enableTwoFactor(req, res) {
    try {
      const userId = req.user?.id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Generate 2FA secret (in real implementation, use speakeasy or similar)
      const twoFactorSecret = Math.random().toString(36).substr(2, 9);

      user.twoFactorSecret = twoFactorSecret;
      await user.save();

      logger.info(`Two-factor authentication enabled for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication enabled',
        code: 'TWO_FA_ENABLED',
        data: {
          secret: twoFactorSecret,
          instructions: 'Scan this QR code with your authenticator app',
        },
      });
    } catch (error) {
      logger.error('Enable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable two-factor authentication',
        code: '2FA_ENABLE_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Disable two-factor authentication
   */
  async disableTwoFactor(req, res) {
    try {
      const userId = req.user?.id;
      const { password } = req.body;

      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Password is incorrect',
          code: 'INVALID_PASSWORD',
        });
      }

      user.twoFactorEnabled = false;
      user.twoFactorSecret = undefined;
      await user.save();

      logger.info(`Two-factor authentication disabled for user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Two-factor authentication disabled',
        code: 'TWO_FA_DISABLED',
      });
    } catch (error) {
      logger.error('Disable 2FA error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to disable two-factor authentication',
        code: '2FA_DISABLE_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Get KYC status
   */
  async getKYCStatus(req, res) {
    try {
      const userId = req.user?.id;

      const kyc = await KYC.findOne({ userId });

      if (!kyc) {
        return res.status(404).json({
          success: false,
          message: 'KYC record not found',
          code: 'KYC_NOT_FOUND',
        });
      }

      res.status(200).json({
        success: true,
        message: 'KYC status retrieved successfully',
        code: 'KYC_STATUS_RETRIEVED',
        data: kyc,
      });
    } catch (error) {
      logger.error('Get KYC status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve KYC status',
        code: 'KYC_ERROR',
        error: error.message,
      });
    }
  }

  /**
   * Get user transactions
   */
  async getTransactions(req, res) {
    try {
      const userId = req.user?.id;
      const { skip = 0, limit = 10, status } = req.query;

      const Transaction = (await import('../models/Transaction.js')).default;

      const query = { $or: [{ senderId: userId }, { recipientId: userId }] };
      if (status) {
        query.status = status;
      }

      const transactions = await Transaction.find(query)
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .sort({ createdAt: -1 });

      const total = await Transaction.countDocuments(query);

      res.status(200).json({
        success: true,
        message: 'Transactions retrieved successfully',
        code: 'TRANSACTIONS_RETRIEVED',
        data: {
          transactions,
          pagination: {
            skip: parseInt(skip),
            limit: parseInt(limit),
            total,
          },
        },
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transactions',
        code: 'TRANSACTIONS_ERROR',
        error: error.message,
      });
    }
  }

  /**
   * Delete account
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user?.id;
      const { password } = req.body;

      const user = await User.findById(userId).select('+password');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Password is incorrect',
          code: 'INVALID_PASSWORD',
        });
      }

      // Mark account as inactive instead of deleting
      user.isActive = false;
      await user.save();

      // Invalidate cache
      await cacheDel(`user:${userId}`);
      await cacheDel(`access_token:${userId}`);
      await cacheDel(`refresh_token:${userId}`);

      logger.info(`User account deleted (marked inactive): ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
        code: 'ACCOUNT_DELETED',
      });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete account',
        code: 'DELETE_ACCOUNT_FAILED',
        error: error.message,
      });
    }
  }
}

export default new UserController();
