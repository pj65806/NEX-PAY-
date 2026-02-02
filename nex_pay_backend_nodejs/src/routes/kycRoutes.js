import express from 'express';
import kycController from '../controllers/KYCController.js';
import { authenticate, requireVerifiedEmail } from '../middleware/authMiddleware.js';
import { validate, validationSchemas } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication and email verification
router.use(authenticate);
router.use(requireVerifiedEmail);

// KYC status
router.get('/status', kycController.getStatus);

// KYC submissions
router.post('/level1', kycController.submitLevel1);
router.post('/level2', kycController.submitLevel2);
router.post('/level3', kycController.submitLevel3);

// Document management
router.post('/documents', kycController.uploadDocument);

// Approval limits
router.get('/limits', kycController.getApprovalLimits);

export default router;
