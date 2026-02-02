import express from 'express';
import userController from '../controllers/UserController.js';
import { authenticate, requireVerifiedEmail, requireKYC } from '../middleware/authMiddleware.js';
import { validate, validationSchemas } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Profile routes
router.get('/profile', userController.getProfile);
router.put('/profile', validate(validationSchemas.updateProfile), userController.updateProfile);
router.post('/change-password', validate(validationSchemas.changePassword), userController.changePassword);

// Wallet routes
router.get('/wallet', userController.getWallet);

// KYC routes
router.get('/kyc-status', userController.getKYCStatus);

// Transaction routes
router.get('/transactions', userController.getTransactions);

// Two-factor authentication
router.post('/2fa/enable', userController.enableTwoFactor);
router.post('/2fa/disable', userController.disableTwoFactor);

// Account deletion
router.delete('/account', userController.deleteAccount);

export default router;
