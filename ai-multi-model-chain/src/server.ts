import { createApp } from './app';
import { DatabaseConfig, envConfig } from './config';
import { logger } from './utils/logger';

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    // Validate environment configuration
    envConfig.validate();

    // Connect to database
    await DatabaseConfig.connect();

    // Create Express app
    const app = createApp();

    // Start listening
    const port = envConfig.port;
    const server = app.listen(port, '0.0.0.0', () => {
      logger.info(`🚀 Server started on http://localhost:${port}`);
      logger.info(`📚 API docs: http://localhost:${port}/`);
      logger.info(`💾 Database: ${envConfig.mongoDbName}`);
      logger.info(`🤖 LLM Provider: ${envConfig.llmProvider}`);
    });

    /**
     * Graceful shutdown
     */
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(async () => {
        await DatabaseConfig.disconnect();
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      server.close(async () => {
        await DatabaseConfig.disconnect();
        process.exit(0);
      });
    });

    /**
     * Error handling
     */
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', error);
    process.exit(1);
  }
}

// Start the server
startServer();
