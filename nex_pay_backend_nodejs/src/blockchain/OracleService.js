import { getLogger } from '../config/logger.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import axios from 'axios';

const logger = getLogger();

export class OracleService {
  async getExchangeRate(assetFrom, assetTo) {
    try {
      // Try cache first
      const cacheKey = `oracle:rate:${assetFrom}:${assetTo}`;
      const cached = await cacheGet(cacheKey);

      if (cached) {
        return cached;
      }

      // Fetch from CoinGecko API
      const rate = await this.fetchFromCoinGecko(assetFrom, assetTo);

      // Cache for ORACLE_UPDATE_INTERVAL
      await cacheSet(
        cacheKey,
        rate,
        parseInt(process.env.ORACLE_UPDATE_INTERVAL) / 1000 || 60
      );

      logger.info('Exchange rate fetched', {
        assetFrom,
        assetTo,
        rate,
      });

      return rate;
    } catch (error) {
      logger.error('Oracle exchange rate error:', error);
      // Return fallback rate
      return this.getFallbackRate(assetFrom, assetTo);
    }
  }

  async fetchFromCoinGecko(assetFrom, assetTo) {
    try {
      const response = await axios.get(
        `${process.env.ORACLE_API_URL}/simple/price`,
        {
          params: {
            ids: assetFrom.toLowerCase(),
            vs_currencies: assetTo.toLowerCase(),
          },
          timeout: 5000,
        }
      );

      return response.data[assetFrom.toLowerCase()][assetTo.toLowerCase()] || 1;
    } catch (error) {
      logger.warn('CoinGecko API error:', error.message);
      throw error;
    }
  }

  getFallbackRate(assetFrom, assetTo) {
    // Fallback rates for development/testing
    const fallbackRates = {
      'ETH:USD': 2000,
      'USD:ETH': 0.0005,
      'USDC:USD': 1.0,
      'USD:USDC': 1.0,
      'EUR:USD': 1.09,
      'USD:EUR': 0.92,
    };

    const key = `${assetFrom}:${assetTo}`;
    return fallbackRates[key] || 1.0;
  }

  async getFeeData() {
    try {
      // Simulate fetching gas prices and network fee data
      const feeData = {
        gasPrice: process.env.GAS_PRICE || '20',
        gasPriceWei: ethers.parseUnits(
          process.env.GAS_PRICE || '20',
          'gwei'
        ),
        networkFee: 0.01,
        platformFee: 0.015, // 1.5%
        timestamp: new Date(),
      };

      return feeData;
    } catch (error) {
      logger.error('Fee data fetch error:', error);
      throw error;
    }
  }

  async validateOracleData(oracleData) {
    try {
      // Validate oracle data freshness and accuracy
      const isValid =
        oracleData &&
        oracleData.timestamp &&
        Date.now() - oracleData.timestamp < 60000; // Less than 1 minute old

      return isValid;
    } catch (error) {
      logger.error('Oracle data validation error:', error);
      return false;
    }
  }

  async recordOracleData(assetPair, rate, source = 'coingecko') {
    try {
      const record = {
        assetPair,
        rate,
        source,
        timestamp: new Date(),
      };

      // Store in cache
      const historyKey = `oracle:history:${assetPair}`;
      const history = (await cacheGet(historyKey)) || [];
      history.push(record);

      await cacheSet(
        historyKey,
        history,
        86400 * 30 // Store for 30 days
      );

      logger.debug('Oracle data recorded', {
        assetPair,
        rate,
        source,
      });

      return record;
    } catch (error) {
      logger.error('Record oracle data error:', error);
      throw error;
    }
  }
}

export default new OracleService();
