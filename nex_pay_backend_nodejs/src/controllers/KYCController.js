import KYC from '../models/KYC.js';
import User from '../models/User.js';
import { getLogger } from '../config/logger.js';
import { cacheSet, cacheDel } from '../config/redis.js';

const logger = getLogger();

export class KYCController {
  /**
   * Get KYC status
   */
  async getStatus(req, res) {
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
        message: 'KYC status retrieved',
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
   * Submit KYC level 1
   */
  async submitLevel1(req, res) {
    try {
      const userId = req.user?.id;
      const {
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        governmentIdType,
        governmentIdNumber,
        governmentIdExpiry,
        governmentIdDocument,
        selfieUrl,
      } = req.body;

      let kyc = await KYC.findOne({ userId });

      if (!kyc) {
        kyc = new KYC({
          userId,
          kycLevel: 1,
          status: 'under_review',
        });
      }

      // Update level 1 data
      kyc.level1 = {
        firstName,
        lastName,
        dateOfBirth,
        nationality,
        governmentIdType,
        governmentIdNumber,
        governmentIdExpiry,
        governmentIdDocument: {
          url: governmentIdDocument,
          uploadedAt: new Date(),
          verified: false,
        },
        facialRecognition: {
          selfieUrl,
          uploadedAt: new Date(),
          livenessCheck: false,
        },
        completed: true,
        completedAt: new Date(),
      };

      kyc.status = 'under_review';
      kyc.submissionDate = new Date();
      await kyc.save();

      // Update user KYC level
      const user = await User.findByIdAndUpdate(userId, { kycLevel: 1 }, { new: true });

      // Invalidate cache
      await cacheDel(`kyc:${userId}`);

      logger.info(`KYC Level 1 submitted by user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'KYC Level 1 submitted successfully',
        code: 'KYC_LEVEL1_SUBMITTED',
        data: {
          kycLevel: 1,
          status: kyc.status,
          nextSteps: 'Your application is under review. This may take 1-2 business days.',
        },
      });
    } catch (error) {
      logger.error('Submit KYC Level 1 error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit KYC Level 1',
        code: 'KYC_SUBMIT_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Submit KYC level 2 (Address Verification)
   */
  async submitLevel2(req, res) {
    try {
      const userId = req.user?.id;
      const { address, addressProof, addressProofDocument, proofDate } = req.body;

      let kyc = await KYC.findOne({ userId });

      if (!kyc || kyc.level1?.completed !== true) {
        return res.status(400).json({
          success: false,
          message: 'KYC Level 1 must be approved before submitting Level 2',
          code: 'LEVEL1_NOT_APPROVED',
        });
      }

      kyc.level2 = {
        address,
        addressProof,
        addressProofDocument: {
          url: addressProofDocument,
          uploadedAt: new Date(),
          verified: false,
        },
        proofDate,
        completed: true,
        completedAt: new Date(),
      };

      kyc.status = 'under_review';
      kyc.submissionDate = new Date();
      await kyc.save();

      // Update user KYC level
      await User.findByIdAndUpdate(userId, { kycLevel: 2 }, { new: true });

      await cacheDel(`kyc:${userId}`);

      logger.info(`KYC Level 2 submitted by user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'KYC Level 2 submitted successfully',
        code: 'KYC_LEVEL2_SUBMITTED',
        data: {
          kycLevel: 2,
          status: kyc.status,
        },
      });
    } catch (error) {
      logger.error('Submit KYC Level 2 error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit KYC Level 2',
        code: 'KYC_SUBMIT_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Submit KYC level 3 (Enhanced Verification)
   */
  async submitLevel3(req, res) {
    try {
      const userId = req.user?.id;
      const {
        businessName,
        businessRegistration,
        businessType,
        businessDocuments,
        businessOwners,
        sourceOfFunds,
        politicallyExposedPerson,
      } = req.body;

      let kyc = await KYC.findOne({ userId });

      if (!kyc || kyc.level2?.completed !== true) {
        return res.status(400).json({
          success: false,
          message: 'KYC Level 2 must be approved before submitting Level 3',
          code: 'LEVEL2_NOT_APPROVED',
        });
      }

      kyc.level3 = {
        businessName,
        businessRegistration,
        businessType,
        businessDocuments,
        businessOwners,
        sourceOfFunds,
        politicallyExposedPerson,
        completed: true,
        completedAt: new Date(),
      };

      kyc.status = 'under_review';
      kyc.submissionDate = new Date();
      await kyc.save();

      // Update user KYC level
      await User.findByIdAndUpdate(userId, { kycLevel: 3 }, { new: true });

      await cacheDel(`kyc:${userId}`);

      logger.info(`KYC Level 3 submitted by user: ${userId}`);

      res.status(200).json({
        success: true,
        message: 'KYC Level 3 submitted successfully',
        code: 'KYC_LEVEL3_SUBMITTED',
        data: {
          kycLevel: 3,
          status: kyc.status,
        },
      });
    } catch (error) {
      logger.error('Submit KYC Level 3 error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit KYC Level 3',
        code: 'KYC_SUBMIT_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Upload KYC document
   */
  async uploadDocument(req, res) {
    try {
      const userId = req.user?.id;
      const { documentType, documentUrl, description } = req.body;

      let kyc = await KYC.findOne({ userId });

      if (!kyc) {
        return res.status(404).json({
          success: false,
          message: 'KYC record not found',
          code: 'KYC_NOT_FOUND',
        });
      }

      const newDocument = {
        documentType,
        url: documentUrl,
        uploadedAt: new Date(),
        verified: false,
        description,
      };

      kyc.documents.push(newDocument);
      await kyc.save();

      await cacheDel(`kyc:${userId}`);

      logger.info(`Document uploaded for user: ${userId} (Type: ${documentType})`);

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        code: 'DOCUMENT_UPLOADED',
        data: newDocument,
      });
    } catch (error) {
      logger.error('Upload document error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload document',
        code: 'UPLOAD_FAILED',
        error: error.message,
      });
    }
  }

  /**
   * Get approval limits
   */
  async getApprovalLimits(req, res) {
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
        message: 'Approval limits retrieved',
        code: 'LIMITS_RETRIEVED',
        data: {
          kycLevel: kyc.kycLevel,
          status: kyc.status,
          limits: kyc.approvalLimits,
        },
      });
    } catch (error) {
      logger.error('Get approval limits error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve approval limits',
        code: 'LIMITS_ERROR',
        error: error.message,
      });
    }
  }
}

export default new KYCController();
