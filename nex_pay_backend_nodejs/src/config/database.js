import mongoose from 'mongoose';
import { getLogger } from './logger.js';

const logger = getLogger();

export const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nex_pay';
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      minPoolSize: 5,
    });

    logger.info('MongoDB connection successful');
    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting MongoDB:', error);
    throw error;
  }
};
