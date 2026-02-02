import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Wallet from '../models/Wallet.js';
import KYC from '../models/KYC.js';
import { getLogger } from '../config/logger.js';
import { cacheSet, cacheGet, cacheDel } from '../config/redis.js';
import { encryptPrivateKey, generateWalletAddress } from '../utils/encryption.js';

const logger = getLogger();

export class AuthController {
  /**
   * User Registration
   */
  async register(req, res) {
    try {
      const { email, password, firstName, lastName, phoneNumber, dateOfBirth, nationality } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email or phone number already registered',
          code: 'USER_EXISTS',
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        firstName,
        lastName,
        phoneNumber,
        dateOfBirth,
        nationality,
        isVerified: false,
        verificationToken: uuidv4(),
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      await user.save();

      // Create wallet for user
      const walletAddress = await generateWalletAddress();
      const wallet = new Wallet({
        userId: user._id,
        walletAddress,
        privateKeyEncrypted: encryptPrivateKey(''), // Will be set later
      });
      await wallet.save();

      // Create KYC record
      const kyc = new KYC({
        userId: user._id,
        kycLevel: 1,
        status: 'pending',
      });
      await kyc.save();

      // Update user with wallet address
      user.walletAddress = walletAddress;
      await user.save();

      logger.info(`New user registered: ${user._id}`);

      // Cache user data
      await cacheSet(`user:${user._id}`, user, 3600);

      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify your email.',
        code: 'REGISTRATION_SUCCESSFUL',
        data: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          walletAddress,
          verificationRequired: true,
        },
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        code: 'REGISTRATION_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * User Login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email and include password field
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Check if account is locked
      if (user.isLocked()) {
        return res.status(401).json({
          success: false,
          message: 'Account is temporarily locked. Try again later.',
          code: 'ACCOUNT_LOCKED',
        });
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        await user.incLoginAttempts();
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS',
        });
      }

      // Reset login attempts
      await user.resetLoginAttempts();

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const accessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          accountType: user.accountType,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      // Cache tokens
      await cacheSet(`refresh_token:${user._id}`, refreshToken, 7 * 24 * 60 * 60);
      await cacheSet(`access_token:${user._id}`, accessToken, 60 * 60);

      logger.info(`User logged in: ${user._id}`);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        code: 'LOGIN_SUCCESSFUL',
        data: {
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          accountType: user.accountType,
          kycStatus: user.kycStatus,
          accessToken,
          refreshToken,
          expiresIn: 3600,
        },
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        code: 'LOGIN_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Refresh Access Token
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token is required',
          code: 'REFRESH_TOKEN_MISSING',
        });
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      // Check if token is in cache (not invalidated)
      const cachedToken = await cacheGet(`refresh_token:${decoded.userId}`);
      if (!cachedToken || cachedToken !== refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN',
        });
      }

      // Get user
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found',
          code: 'USER_NOT_FOUND',
        });
      }

      // Generate new access token
      const newAccessToken = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          accountType: user.accountType,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Cache new token
      await cacheSet(`access_token:${user._id}`, newAccessToken, 60 * 60);

      logger.info(`Token refreshed for user: ${user._id}`);

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        code: 'TOKEN_REFRESHED',
        data: {
          accessToken: newAccessToken,
          expiresIn: 3600,
        },
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Token refresh failed',
        code: 'TOKEN_REFRESH_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Logout
   */
  async logout(req, res) {
    try {
      const userId = req.user?.id || req.body.userId;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required',
          code: 'USER_ID_REQUIRED',
        });
      }

      // Invalidate tokens
      await cacheDel(`refresh_token:${userId}`);
      await cacheDel(`access_token:${userId}`);
      await cacheDel(`user:${userId}`);

      logger.info(`User logged out: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        code: 'LOGOUT_SUCCESSFUL',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
        code: 'LOGOUT_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Verify Email
   */
  async verifyEmail(req, res) {
    try {
      const { token } = req.body;

      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification token',
          code: 'INVALID_TOKEN',
        });
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      logger.info(`Email verified for user: ${user._id}`);

      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        code: 'EMAIL_VERIFIED',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Email verification failed',
        code: 'VERIFICATION_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Request Password Reset
   */
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        // Don't reveal if email exists
        return res.status(200).json({
          success: true,
          message: 'If email exists, password reset link has been sent',
          code: 'RESET_LINK_SENT',
        });
      }

      // Generate reset token
      const resetToken = uuidv4();
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      // Cache token for verification
      await cacheSet(`password_reset:${resetToken}`, user._id, 3600);

      logger.info(`Password reset requested for user: ${user._id}`);

      res.status(200).json({
        success: true,
        message: 'If email exists, password reset link has been sent',
        code: 'RESET_LINK_SENT',
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset request failed',
        code: 'RESET_REQUEST_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Reset Password
   */
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;

      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token',
          code: 'INVALID_RESET_TOKEN',
        });
      }

      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Invalidate old tokens
      await cacheDel(`refresh_token:${user._id}`);
      await cacheDel(`access_token:${user._id}`);

      logger.info(`Password reset for user: ${user._id}`);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully',
        code: 'PASSWORD_RESET',
      });
    } catch (error) {
      logger.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        message: 'Password reset failed',
        code: 'RESET_FAILED',
        error: error.message,
      });
    }
  }
}

export default new AuthController();
