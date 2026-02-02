import { getLogger } from '../config/logger.js';
import { cacheGet, cacheSet } from '../config/redis.js';
import { v4 as uuidv4 } from 'uuid';

const logger = getLogger();

export class KYCService {
  async initiateKYC(userId, identityData) {
    try {
      const kycId = uuidv4();

      const kyc = {
        _id: kycId,
        userId,
        identityType: identityData.type,
        identityNumber: identityData.number,
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000 * 30), // 30 days
      };

      // Cache KYC record
      await cacheSet(`kyc:${kycId}`, kyc, 86400); // 24 hours

      logger.info('KYC initiated', { userId, kycId });

      return {
        success: true,
        kyc,
      };
    } catch (error) {
      logger.error('KYC initiation error:', error);
      throw error;
    }
  }

  async updateKYCStatus(kycId, status, verificationProof = null) {
    try {
      const kyc = await cacheGet(`kyc:${kycId}`);

      if (!kyc) {
        throw new Error('KYC record not found');
      }

      kyc.status = status;
      if (verificationProof) {
        kyc.verificationProof = verificationProof;
      }
      if (status === 'verified') {
        kyc.verifiedAt = new Date();
      }

      await cacheSet(`kyc:${kycId}`, kyc, 86400);

      logger.info('KYC status updated', { kycId, status });

      return {
        success: true,
        kyc,
      };
    } catch (error) {
      logger.error('KYC status update error:', error);
      throw error;
    }
  }

  async getKYCStatus(kycId) {
    try {
      const kyc = await cacheGet(`kyc:${kycId}`);

      if (!kyc) {
        throw new Error('KYC record not found');
      }

      return {
        success: true,
        kyc,
      };
    } catch (error) {
      logger.error('KYC status retrieval error:', error);
      throw error;
    }
  }

  async verifyIdentity(kycId, externalKYCData) {
    try {
      const kyc = await cacheGet(`kyc:${kycId}`);

      if (!kyc) {
        throw new Error('KYC record not found');
      }

      // Simulate external KYC provider verification
      const isVerified =
        externalKYCData.status === 'approved' &&
        externalKYCData.confidence > 0.9;

      if (isVerified) {
        kyc.status = 'verified';
        kyc.verifiedAt = new Date();
        kyc.verificationProof = externalKYCData.proofId;
      } else {
        kyc.status = 'rejected';
        kyc.rejectionReason = externalKYCData.reason || 'Verification failed';
      }

      await cacheSet(`kyc:${kycId}`, kyc, 86400);

      logger.info('Identity verification complete', {
        kycId,
        isVerified,
      });

      return {
        success: true,
        kyc,
        isVerified,
      };
    } catch (error) {
      logger.error('Identity verification error:', error);
      throw error;
    }
  }
}

export default new KYCService();
