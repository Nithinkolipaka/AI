import express, { Express } from 'express';
import { setupRoutes } from './routes';
import { envConfig } from './config/env.config';
import { logger } from './utils/logger';

/**
 * Create and configure Express application
 */
export function createApp(): Express {
  const app = express();

  /**
   * Middleware
   */
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  /**
   * Request logging middleware
   */
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.debug(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  /**
   * CORS middleware
   */
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  /**
   * Setup routes
   */
  setupRoutes(app);

  /**
   * Error handling middleware
   */
  app.use(
    (
      err: Error & { status?: number },
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      logger.error('Unhandled error', err);

      const status = err.status || 500;
      const message = err.message || 'Internal server error';

      res.status(status).json({
        error: message,
        status,
        timestamp: new Date().toISOString(),
      });
    },
  );

  /**
   * 404 handler
   */
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      method: req.method,
    });
  });

  return app;
}
