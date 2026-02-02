import express from 'express';
import paymentController from '../controllers/PaymentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get transaction details
router.get('/:transactionId', paymentController.getTransactionDetails);

// List transactions
router.get('/', paymentController.getTransactionHistory);

export default router;
