import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { connectDB } from './config/database.js';
import { initializeRedis } from './config/redis.js';
import { setupLogger } from './config/logger.js';
import errorHandler from './middleware/errorHandler.js';
import rateLimiter from './middleware/rateLimiter.js';
import apiKeyValidator from './middleware/apiKeyValidator.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import kycRoutes from './routes/kycRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import merchantRoutes from './routes/merchantRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();
const logger = setupLogger();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
app.use(rateLimiter);

// API Key validation for protected endpoints
app.use('/api/v1/admin', apiKeyValidator);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    path: req.path,
    method: req.method,
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize connections and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('Connected to MongoDB');

    // Initialize Redis
    await initializeRedis();
    logger.info('Connected to Redis');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      logger.info(`N3X PAY Backend Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Blockchain Network: ${process.env.BLOCKCHAIN_NETWORK}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
