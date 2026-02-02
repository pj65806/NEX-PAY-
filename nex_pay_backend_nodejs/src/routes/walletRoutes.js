import express from 'express';
import walletController from '../controllers/WalletController.js';
import { authenticate, requireVerifiedEmail } from '../middleware/authMiddleware.js';
import { validate, validationSchemas } from '../utils/validators.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);
router.use(requireVerifiedEmail);

// Wallet balance and details
router.get('/balance', walletController.getBalance);
router.get('/details', walletController.getDetails);

// Bank account operations
router.post('/bank-accounts', validate(validationSchemas.linkBankAccount), walletController.linkBankAccount);
router.delete('/bank-accounts/:accountId', walletController.removeBankAccount);
router.post('/bank-accounts/primary', walletController.setPrimaryBankAccount);

// Crypto address operations
router.post('/crypto-addresses', walletController.linkCryptoAddress);

// Transaction history
router.get('/transactions', walletController.getTransactionHistory);

// Wallet management
router.post('/freeze', walletController.freezeWallet);

export default router;
