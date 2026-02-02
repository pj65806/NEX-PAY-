import { v4 as uuidv4 } from 'uuid';
import Transaction from '../models/Transaction.js';
import Wallet from '../models/Wallet.js';
import User from '../models/User.js';
import { getLogger } from '../config/logger.js';
import { cacheSet, cacheGet } from '../config/redis.js';

const logger = getLogger();

export class PaymentController {
  /**
   * Initiate payment
   */
  async initiatePayment(req, res) {
    try {
      const senderId = req.user?.id;
      const {
        recipientId,
        amount,
        currencyFrom,
        currencyTo,
        description,
        reference,
      } = req.body;

      // Validation
      if (!recipientId || !amount || !currencyFrom || !currencyTo) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          code: 'MISSING_FIELDS',
        });
      }

      // Check if recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Recipient not found',
          code: 'RECIPIENT_NOT_FOUND',
        });
      }

      // Get sender and recipient wallets
      const senderWallet = await Wallet.findOne({ userId: senderId });
      const recipientWallet = await Wallet.findOne({ userId: recipientId });

      if (!senderWallet || !recipientWallet) {
        return res.status(404).json({
          success: false,
          message: 'Wallet not found',
          code: 'WALLET_NOT_FOUND',
        });
      }

      // Check sender has sufficient balance
      const availableBalance = senderWallet.totalBalance - senderWallet.holdAmount;
      if (availableBalance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient balance',
          code: 'INSUFFICIENT_BALANCE',
          availableBalance,
        });
      }

      // Check transaction limits
      if (!this.checkTransactionLimits(senderWallet, amount)) {
        return res.status(400).json({
          success: false,
          message: 'Transaction exceeds daily/monthly/yearly limits',
          code: 'LIMIT_EXCEEDED',
        });
      }

      // Estimate exchange rate
      const exchangeRate = await this.getExchangeRate(currencyFrom, currencyTo);
      const receivedAmount = amount * exchangeRate;

      // Calculate fees
      const platformFee = amount * 0.01; // 1% platform fee
      const totalFee = platformFee;

      // Create transaction
      const transaction = new Transaction({
        transactionId: uuidv4(),
        senderId,
        recipientId,
        senderWallet: senderWallet._id,
        recipientWallet: recipientWallet._id,
        amount,
        currencyFrom,
        currencyTo,
        exchangeRate,
        receivedAmount,
        fees: {
          platformFee,
          totalFee,
        },
        status: 'pending',
        transactionType: 'peer-to-peer',
        paymentMethod: 'wallet',
        description,
        reference,
        riskScore: await this.calculateRiskScore(senderId, recipientId, amount),
      });

      await transaction.save();

      // Update wallet hold amount
      senderWallet.holdAmount += amount + totalFee;
      senderWallet.pendingTransactions.push(transaction._id);
      await senderWallet.save();

      // Cache transaction
      await cacheSet(`transaction:${transaction.transactionId}`, transaction, 3600);

      logger.info(`Payment initiated: ${transaction.transactionId}`);

      res.status(201).json({
        success: true,
        message: 'Payment initiated successfully',
        code: 'PAYMENT_INITIATED',
        data: {
          transactionId: transaction.transactionId,
          amount,
          receivedAmount,
          fees: transaction.fees,
          exchangeRate,
          status: transaction.status,
          expiresIn: 3600, // 1 hour to confirm
        },
      });
    } catch (error) {
      logger.error('Payment initiation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to initiate payment',
        code: 'PAYMENT_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Confirm payment
   */
  async confirmPayment(req, res) {
    try {
      const senderId = req.user?.id;
      const { transactionId, otp } = req.body;

      const transaction = await Transaction.findOne({ transactionId });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND',
        });
      }

      if (transaction.senderId.toString() !== senderId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Transaction cannot be confirmed. Current status: ${transaction.status}`,
          code: 'INVALID_STATUS',
        });
      }

      // Update transaction status
      transaction.status = 'processing';
      transaction.approvalStatus = 'approved';
      transaction.approvedAt = new Date();
      await transaction.save();

      // Get wallets
      const senderWallet = await Wallet.findById(transaction.senderWallet);
      const recipientWallet = await Wallet.findById(transaction.recipientWallet);

      // Deduct from sender
      senderWallet.totalBalance -= transaction.amount + transaction.fees.totalFee;
      senderWallet.holdAmount -= transaction.amount + transaction.fees.totalFee;
      senderWallet.transactions.push(transaction._id);
      const pendingIndex = senderWallet.pendingTransactions.indexOf(transaction._id);
      if (pendingIndex > -1) {
        senderWallet.pendingTransactions.splice(pendingIndex, 1);
      }
      await senderWallet.save();

      // Add to recipient
      recipientWallet.totalBalance += transaction.receivedAmount;
      recipientWallet.balances.fiat.amount += transaction.receivedAmount;
      recipientWallet.transactions.push(transaction._id);
      recipientWallet.transactionHistory.successCount += 1;
      recipientWallet.transactionHistory.totalVolume += transaction.receivedAmount;
      await recipientWallet.save();

      // Update transaction to completed
      transaction.status = 'completed';
      transaction.completedAt = new Date();
      await transaction.save();

      logger.info(`Payment confirmed: ${transactionId}`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        code: 'PAYMENT_CONFIRMED',
        data: {
          transactionId: transaction.transactionId,
          status: transaction.status,
          completedAt: transaction.completedAt,
        },
      });
    } catch (error) {
      logger.error('Payment confirmation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to confirm payment',
        code: 'CONFIRMATION_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Cancel payment
   */
  async cancelPayment(req, res) {
    try {
      const senderId = req.user?.id;
      const { transactionId } = req.body;

      const transaction = await Transaction.findOne({ transactionId });

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND',
        });
      }

      if (transaction.senderId.toString() !== senderId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        });
      }

      if (transaction.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: `Transaction cannot be cancelled. Current status: ${transaction.status}`,
          code: 'INVALID_STATUS',
        });
      }

      // Update transaction
      transaction.status = 'cancelled';
      await transaction.save();

      // Release hold
      const senderWallet = await Wallet.findById(transaction.senderWallet);
      senderWallet.holdAmount -= transaction.amount + transaction.fees.totalFee;
      const pendingIndex = senderWallet.pendingTransactions.indexOf(transaction._id);
      if (pendingIndex > -1) {
        senderWallet.pendingTransactions.splice(pendingIndex, 1);
      }
      await senderWallet.save();

      logger.info(`Payment cancelled: ${transactionId}`);

      res.status(200).json({
        success: true,
        message: 'Payment cancelled successfully',
        code: 'PAYMENT_CANCELLED',
      });
    } catch (error) {
      logger.error('Payment cancellation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cancel payment',
        code: 'CANCELLATION_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Get transaction details
   */
  async getTransactionDetails(req, res) {
    try {
      const { transactionId } = req.params;
      const userId = req.user?.id;

      const transaction = await Transaction.findOne({ transactionId })
        .populate('senderId', 'firstName lastName email')
        .populate('recipientId', 'firstName lastName email');

      if (!transaction) {
        return res.status(404).json({
          success: false,
          message: 'Transaction not found',
          code: 'TRANSACTION_NOT_FOUND',
        });
      }

      // Check authorization
      if (
        transaction.senderId._id.toString() !== userId.toString() &&
        transaction.recipientId?._id.toString() !== userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
          code: 'UNAUTHORIZED',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Transaction details retrieved',
        code: 'TRANSACTION_RETRIEVED',
        data: transaction,
      });
    } catch (error) {
      logger.error('Get transaction details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transaction details',
        code: 'TRANSACTION_ERROR',
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
      const { skip = 0, limit = 20, status } = req.query;

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
        message: 'Transaction history retrieved',
        code: 'HISTORY_RETRIEVED',
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
   * Helper: Get exchange rate
   */
  async getExchangeRate(from, to) {
    // In production, integrate with real API
    const rates = {
      'USD/NGN': 410,
      'USD/EUR': 0.92,
      'USD/GBP': 0.79,
    };
    return rates[`${from}/${to}`] || 1;
  }

  /**
   * Helper: Check transaction limits
   */
  checkTransactionLimits(wallet, amount) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Reset limits if needed
    if (wallet.dailyLimit.resetDate < today) {
      wallet.dailyLimit.used = 0;
      wallet.dailyLimit.resetDate = today;
    }

    // Check limits
    if (wallet.dailyLimit.used + amount > wallet.dailyLimit.amount) {
      return false;
    }

    return true;
  }

  /**
   * Helper: Calculate risk score
   */
  async calculateRiskScore(senderId, recipientId, amount) {
    let score = 0;

    // Amount-based risk
    if (amount > 50000) score += 20;
    if (amount > 100000) score += 30;

    // User history-based risk
    const sender = await User.findById(senderId);
    if (!sender.isVerified) score += 15;
    if (sender.kycStatus !== 'approved') score += 20;

    return Math.min(score, 100);
  }
}

export default new PaymentController();
