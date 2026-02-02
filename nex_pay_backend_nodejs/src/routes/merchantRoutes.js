import express from 'express';
import { authenticate, requireKYC } from '../middleware/authMiddleware.js';

const router = express.Router();

// Merchant registration (public)
router.post('/register', (req, res) => {
  res.json({
    success: true,
    message: 'Merchant registration',
    code: 'MERCHANT_REGISTER',
  });
});

// Protected merchant routes
router.use(authenticate);
router.use(requireKYC(2));

// Get merchant details
router.get('/:merchantId', (req, res) => {
  res.json({
    success: true,
    message: 'Get merchant details',
    code: 'MERCHANT_DETAILS',
  });
});

// Merchant dashboard (requires auth)
router.get('/dashboard', (req, res) => {
  res.json({
    success: true,
    message: 'Merchant dashboard',
    code: 'MERCHANT_DASHBOARD',
  });
});

export default router;
