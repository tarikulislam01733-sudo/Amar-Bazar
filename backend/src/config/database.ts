import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export const connectDatabase = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      maxPoolSize: 10,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle graceful disconnect
    const gracefulDisconnect = async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection disconnected through app termination');
      process.exit(0);
    };

    process.on('SIGINT', gracefulDisconnect);
    process.on('SIGTERM', gracefulDisconnect);

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};
