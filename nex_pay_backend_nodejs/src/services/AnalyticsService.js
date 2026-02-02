import { getLogger } from '../config/logger.js';
import { cacheGet, cacheSet } from '../config/redis.js';

const logger = getLogger();

export class AnalyticsService {
  async recordTransaction(transaction) {
    try {
      const metric = {
        transactionId: transaction.transactionId,
        type: transaction.transactionType,
        amount: transaction.amount,
        status: transaction.status,
        processingTime: transaction.processingTime || 0,
        riskScore: transaction.riskScore,
        timestamp: new Date(),
      };

      // Store metric
      const metricsKey = `metrics:${new Date().toISOString().split('T')[0]}`;
      const metrics = (await cacheGet(metricsKey)) || [];
      metrics.push(metric);
      await cacheSet(metricsKey, metrics, 86400 * parseInt(process.env.METRICS_RETENTION_DAYS));

      logger.info('Transaction recorded for analytics', {
        transactionId: transaction.transactionId,
      });

      return {
        success: true,
        metric,
      };
    } catch (error) {
      logger.error('Analytics recording error:', error);
      throw error;
    }
  }

  async getMetrics(dateFrom, dateTo) {
    try {
      const metrics = [];

      // Simulate fetching metrics from cache
      const startDate = new Date(dateFrom);
      const endDate = new Date(dateTo);

      while (startDate <= endDate) {
        const metricsKey = `metrics:${startDate.toISOString().split('T')[0]}`;
        const dayMetrics = await cacheGet(metricsKey);

        if (dayMetrics) {
          metrics.push(...dayMetrics);
        }

        startDate.setDate(startDate.getDate() + 1);
      }

      // Calculate aggregates
      const aggregate = {
        totalTransactions: metrics.length,
        totalVolume: metrics.reduce((sum, m) => sum + m.amount, 0),
        successfulTransactions: metrics.filter((m) => m.status === 'settled').length,
        failedTransactions: metrics.filter((m) => m.status === 'failed').length,
        averageProcessingTime:
          metrics.reduce((sum, m) => sum + m.processingTime, 0) / metrics.length || 0,
        averageRiskScore:
          metrics.reduce((sum, m) => sum + m.riskScore, 0) / metrics.length || 0,
      };

      logger.info('Metrics retrieved', { dateFrom, dateTo });

      return {
        success: true,
        metrics: aggregate,
        transactions: metrics,
      };
    } catch (error) {
      logger.error('Metrics retrieval error:', error);
      throw error;
    }
  }

  async calculateRiskScore(transaction) {
    try {
      let riskScore = 0;

      // Amount-based risk
      if (transaction.amount > 50000) {
        riskScore += 30;
      } else if (transaction.amount > 10000) {
        riskScore += 15;
      }

      // Transaction type risk
      if (transaction.transactionType === 'cross_border') {
        riskScore += 20;
      }

      // Velocity-based risk
      const userTransactions = await this.getUserTransactionVelocity(transaction.senderId);
      if (userTransactions > 5) {
        riskScore += 10;
      }

      // Cap risk score at 100
      riskScore = Math.min(riskScore, 100);

      logger.debug('Risk score calculated', {
        transactionId: transaction.transactionId,
        riskScore,
      });

      return riskScore;
    } catch (error) {
      logger.error('Risk calculation error:', error);
      return 50; // Default to medium risk on error
    }
  }

  async getUserTransactionVelocity(userId, timeWindow = 3600) {
    try {
      // Simulate getting user transaction count in time window
      const velocityKey = `velocity:${userId}`;
      const count = (await cacheGet(velocityKey)) || 0;

      return count;
    } catch (error) {
      logger.error('Velocity calculation error:', error);
      return 0;
    }
  }

  async recordRiskScore(transactionId, riskScore) {
    try {
      const riskKey = `risk_score:${transactionId}`;
      await cacheSet(riskKey, riskScore, 86400 * 365);

      logger.info('Risk score recorded', {
        transactionId,
        riskScore,
      });

      return {
        success: true,
        transactionId,
        riskScore,
      };
    } catch (error) {
      logger.error('Risk score recording error:', error);
      throw error;
    }
  }
}

export default new AnalyticsService();
