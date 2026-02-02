import express from 'express';
import paymentController from '../controllers/PaymentController.js';
import { authenticate, requireVerifiedEmail, requireKYC } from '../middleware/authMiddleware.js';
import { validate, validationSchemas } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication and email verification
router.use(authenticate);
router.use(requireVerifiedEmail);

// Payment operations
router.post('/initiate', validate(validationSchemas.initiatePayment), paymentController.initiatePayment);
router.post('/confirm', validate(validationSchemas.confirmPayment), paymentController.confirmPayment);
router.post('/cancel', paymentController.cancelPayment);

// Get transaction details
router.get('/:transactionId', paymentController.getTransactionDetails);

// Transaction history
router.get('/', paymentController.getTransactionHistory);

export default router;
