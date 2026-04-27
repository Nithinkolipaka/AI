import mongoose from 'mongoose';
import { envConfig } from './env.config';
import { logger } from '../utils/logger';

/**
 * MongoDB connection management
 * Handles connection initialization, reconnection, and cleanup
 */
export class DatabaseConfig {
  private static instance: mongoose.Connection | null = null;

  static async connect(): Promise<mongoose.Connection> {
    if (this.instance) {
      logger.info('Using existing MongoDB connection');
      return this.instance;
    }

    try {
      logger.info(`Connecting to MongoDB at ${envConfig.mongoUri}`);

      const conn = await mongoose.connect(envConfig.mongoUri, {
        dbName: envConfig.mongoDbName,
        retryWrites: true,
        w: 'majority',
      });

      this.instance = conn.connection;
      logger.info('MongoDB connection established');

      // Connection event handlers
      conn.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
      });

      conn.connection.on('error', (error) => {
        logger.error('MongoDB connection error:', error);
      });

      return conn.connection;
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  static async disconnect(): Promise<void> {
    if (this.instance) {
      await mongoose.disconnect();
      this.instance = null;
      logger.info('MongoDB connection closed');
    }
  }

  static getConnection(): mongoose.Connection {
    if (!this.instance) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.instance;
  }
}
