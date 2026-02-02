import express from 'express';
import authController from '../controllers/AuthController.js';
import { validate, validationSchemas } from '../utils/validators.js';
import { authenticate, optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
router.post('/register', validate(validationSchemas.register), authController.register);
router.post('/login', validate(validationSchemas.login), authController.login);
router.post('/refresh-token', validate(validationSchemas.refreshToken), authController.refreshToken);
router.post('/verify-email', validate(validationSchemas.verifyEmail), authController.verifyEmail);
router.post('/request-password-reset', validate(validationSchemas.requestPasswordReset), authController.requestPasswordReset);
router.post('/reset-password', validate(validationSchemas.resetPassword), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);

export default router;
