/**
 * MONGODB DATABASE CONNECTION
 * 
 * Handles connection to MongoDB using Mongoose.
 * Provides singleton instance and connection utilities.
 */

import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

/**
 * DATABASE CLASS
 * 
 * Manages MongoDB connection lifecycle.
 */
export class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  /**
   * PRIVATE CONSTRUCTOR
   * 
   * Ensures singleton pattern.
   */
  private constructor() {}

  /**
   * GET INSTANCE
   * 
   * Returns singleton instance of Database.
   */
  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * CONNECT TO MONGODB
   * 
   * Establishes connection to MongoDB.
   * Logs connection status and handles errors.
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected) {
        logger.info("Database already connected", "Database.connect");
        return;
      }

      const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/lcel-examples";

      logger.info(`Connecting to MongoDB: ${mongoUri}`, "Database.connect");

      /**
       * CONNECTION OPTIONS
       * 
       * useNewUrlParser: Use new MongoDB connection string parser
       * useUnifiedTopology: Enable unified topology for connection pooling
       */
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      } as any);

      this.isConnected = true;

      logger.info("MongoDB connected successfully", "Database.connect");
    } catch (error: any) {
      logger.error(
        "MongoDB connection failed",
        "Database.connect",
        error
      );
      throw error;
    }
  }

  /**
   * DISCONNECT FROM MONGODB
   * 
   * Gracefully closes MongoDB connection.
   */
  async disconnect(): Promise<void> {
    try {
      if (!this.isConnected) {
        logger.info("Database already disconnected", "Database.disconnect");
        return;
      }

      await mongoose.disconnect();
      this.isConnected = false;

      logger.info("MongoDB disconnected successfully", "Database.disconnect");
    } catch (error: any) {
      logger.error(
        "MongoDB disconnection failed",
        "Database.disconnect",
        error
      );
      throw error;
    }
  }

  /**
   * CHECK CONNECTION STATUS
   */
  getConnectionStatus(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * GET MONGOOSE INSTANCE
   */
  getMongoose(): typeof mongoose {
    return mongoose;
  }
}

// Export singleton instance
export const database = Database.getInstance();

export default database;
