import { v4 as uuidv4 } from 'uuid';
import { getLogger } from '../config/logger.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const logger = getLogger();

export class PaymentService {
  async initiatePayment(payload) {
    const {
      senderId,
      recipientId,
      amount,
      currencyFrom,
      currencyTo,
      transactionType = 'domestic',
    } = payload;

    try {
      // Validate amounts
      const minAmount = parseFloat(process.env.FIAT_TRANSACTION_MIN);
      const maxAmount = parseFloat(process.env.FIAT_TRANSACTION_MAX);

      if (amount < minAmount || amount > maxAmount) {
        throw new Error(`Amount must be between ${minAmount} and ${maxAmount}`);
      }

      // Get exchange rate from oracle
      const exchangeRate = await this.getExchangeRate(currencyFrom, currencyTo);

      // Calculate received amount
      const receivedAmount = amount * exchangeRate;

      // Create transaction object
      const transaction = {
        transactionId: uuidv4(),
        senderId,
        recipientId,
        amount,
        currencyFrom,
        currencyTo,
        exchangeRate,
        receivedAmount,
        transactionType,
        status: 'pending',
        riskScore: 0,
        createdAt: new Date(),
      };

      // Calculate processing timeout based on transaction type
      const timeout =
        transactionType === 'domestic'
          ? parseInt(process.env.DOMESTIC_TRANSACTION_TIMEOUT)
          : parseInt(process.env.CROSS_BORDER_TRANSACTION_TIMEOUT);

      // Cache transaction for fast lookup
      await cacheSet(
        `transaction:${transaction.transactionId}`,
        transaction,
        3600
      );

      logger.info('Payment initiated', { transactionId: transaction.transactionId });

      return {
        success: true,
        transaction,
        timeout,
      };
    } catch (error) {
      logger.error('Payment initiation error:', error);
      throw error;
    }
  }

  async getExchangeRate(currencyFrom, currencyTo) {
    try {
      // Try to get from cache first
      const cacheKey = `exchange_rate:${currencyFrom}:${currencyTo}`;
      const cachedRate = await cacheGet(cacheKey);

      if (cachedRate) {
        return cachedRate;
      }

      // For development, use mock rates
      const mockRates = {
        'USD:EUR': 0.92,
        'EUR:USD': 1.09,
        'USD:ETH': 0.00055,
        'ETH:USD': 1818,
        'USD:USDC': 1.0,
        'USDC:USD': 1.0,
      };

      const rate = mockRates[`${currencyFrom}:${currencyTo}`] || 1.0;

      // Cache for ORACLE_UPDATE_INTERVAL
      await cacheSet(cacheKey, rate, 60);

      return rate;
    } catch (error) {
      logger.error('Exchange rate error:', error);
      throw error;
    }
  }

  async getPaymentQuote(amount, currencyFrom, currencyTo) {
    try {
      const exchangeRate = await this.getExchangeRate(currencyFrom, currencyTo);
      const receivedAmount = amount * exchangeRate;

      // Calculate fees (1.5% platform fee)
      const platformFee = amount * 0.015;
      const totalCost = amount + platformFee;

      return {
        success: true,
        quote: {
          amount,
          currencyFrom,
          currencyTo,
          exchangeRate,
          receivedAmount,
          platformFee,
          totalCost,
          validUntil: new Date(Date.now() + 300000), // 5 minutes
        },
      };
    } catch (error) {
      logger.error('Quote generation error:', error);
      throw error;
    }
  }

  async processPayment(transactionId) {
    try {
      const transaction = await cacheGet(`transaction:${transactionId}`);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      transaction.status = 'processing';
      transaction.processingStartedAt = new Date();

      await cacheSet(`transaction:${transactionId}`, transaction, 3600);

      logger.info('Payment processing started', { transactionId });

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      logger.error('Payment processing error:', error);
      throw error;
    }
  }

  async settlePayment(transactionId, blockchainTxHash) {
    try {
      const transaction = await cacheGet(`transaction:${transactionId}`);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      transaction.status = 'settled';
      transaction.blockchainTxHash = blockchainTxHash;
      transaction.settledAt = new Date();
      transaction.processingTime =
        transaction.settledAt - transaction.createdAt;

      await cacheSet(`transaction:${transactionId}`, transaction, 3600);

      logger.info('Payment settled', {
        transactionId,
        blockchainTxHash,
        processingTime: transaction.processingTime,
      });

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      logger.error('Payment settlement error:', error);
      throw error;
    }
  }

  async failPayment(transactionId, reason) {
    try {
      const transaction = await cacheGet(`transaction:${transactionId}`);

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      transaction.status = 'failed';
      transaction.failureReason = reason;
      transaction.failedAt = new Date();

      await cacheSet(`transaction:${transactionId}`, transaction, 3600);

      logger.warn('Payment failed', {
        transactionId,
        reason,
      });

      return {
        success: true,
        transaction,
      };
    } catch (error) {
      logger.error('Payment failure handling error:', error);
      throw error;
    }
  }
}

export default new PaymentService();
