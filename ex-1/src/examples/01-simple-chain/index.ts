/**
 * EXAMPLE 1: SIMPLE CHAIN - Express Server (TypeScript)
 * 
 * Sets up Express.js server with all middleware and routes.
 * This file demonstrates the typical server setup for MVC applications.
 */

import express, { Express, Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import simpleChainRoutes from "./routes/index.route.js";
import { logger } from "../../../utils/logger.js";
import { database } from "../../../database/mongodb.js";
import { protectRoute } from "../../../middleware/auth.middleware.js";
import { activityLogger } from "../../../activity/middleware/activity.middleware.js";

/**
 * LOAD ENVIRONMENT VARIABLES
 * 
 * Reads from .env file.
 * Must be done before creating service instances.
 * Services need OPENAI_API_KEY to work.
 */
dotenv.config();

/**
 * INITIALIZE EXPRESS APP
 * 
 * Express is a web framework for Node.js.
 * It handles HTTP requests, routing, middleware, etc.
 */
const app: Express = express();
const PORT = process.env.PORT || 3001;

/**
 * ============================================================
 * MIDDLEWARE SETUP
 * ============================================================
 * 
 * Middleware functions intercept requests before they reach routes.
 * They can modify requests, validate data, add logging, etc.
 * Middleware runs in order of registration.
 */

/**
 * MIDDLEWARE 1: JSON BODY PARSER
 * 
 * Automatically parses incoming JSON bodies.
 * Makes req.body available as JavaScript objects.
 * Limit: Max 10mb per request to prevent abuse.
 */
app.use(express.json({ limit: "10mb" }));

/**
 * MIDDLEWARE 2: URL-ENCODED BODY PARSER
 * 
 * For form submissions (application/x-www-form-urlencoded).
 */
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * MIDDLEWARE 3: CORS (Cross-Origin Resource Sharing)
 * 
 * Allows requests from different domains.
 * Important for browser-based clients (SPAs, web apps).
 * 
 * In production, you should restrict this to known domains.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle OPTIONS requests (preflight)
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

/**
 * MIDDLEWARE 4: REQUEST LOGGING
 * 
 * Logs basic info about every request.
 * Useful for debugging and monitoring.
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  logger.debug(
    `HTTP ${req.method} ${req.path}`,
    "Server",
    {
      query: req.query,
      bodySize: JSON.stringify(req.body).length,
    }
  );
  next();
});

/**
 * MIDDLEWARE 5: ACTIVITY LOGGING (Protected Routes Only)
 * 
 * Logs user activities for audit trail.
 * Only logs authenticated requests.
 */
app.use("/api/*", activityLogger);

/**
 * ============================================================
 * ROUTES SETUP
 * ============================================================
 * 
 * Mount the chain routes under /api/chains/simple prefix.
 */

/**
 * PUBLIC HEALTH ENDPOINT
 * 
 * No authentication required.
 * Used for uptime monitoring and load balancing.
 */
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    service: "Simple Chain API",
    timestamp: new Date().toISOString(),
  });
});

/**
 * PUBLIC ROOT ENDPOINT
 * 
 * Returns basic API information.
 */
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    name: "Simple Chain API",
    version: "1.0.0",
    description: "LangChain LCEL example: prompt → model → parser",
    endpoints: "/info",
    docs: "http://localhost:3001/info",
  });
});

/**
 * PROTECTED CHAIN ROUTES
 * 
 * All chain routes require JWT authentication.
 * Users must provide valid Auth token in header.
 */
app.use("/api/chains/simple", protectRoute, simpleChainRoutes);

/**
 * ============================================================
 * ERROR HANDLING
 * ============================================================
 * 
 * Global error handler catches unhandled errors.
 * Must be registered after all other middleware and routes.
 */
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(
    `Unhandled error: ${err.message}`,
    "Server",
    err
  );

  res.status(err.statusCode || 500).json({
    status: "error",
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred",
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * 404 HANDLER
 * 
 * Catch all undefined routes.
 */
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    error: {
      code: "NOT_FOUND",
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * ============================================================
 * START SERVER
 * ============================================================
 */
async function startServer(): Promise<void> {
  try {
    /**
     * STEP 1: CONNECT TO DATABASE
     */
    logger.info("Connecting to MongoDB...", "Server");
    await database.connect();

    /**
     * STEP 2: START HTTP SERVER
     */
    app.listen(PORT, () => {
      const banner = `
╔════════════════════════════════════════════════════════════╗
║           EXAMPLE 1: SIMPLE CHAIN API                      ║
║                                                            ║
║  server running on http://localhost:${PORT}                ║
║  database connected: MongoDB                              ║
╠════════════════════════════════════════════════════════════╣
║  LCEL Concept: prompt → model → parser                    ║
║                                                            ║
║  Endpoints:                                               ║
║    POST   /api/chains/simple/execute   Execute with full ║
║    GET    /api/chains/simple/stream    Stream response  ║
║    GET    /api/chains/simple/health    Health check      ║
║    GET    /api/chains/simple/info      Documentation    ║
║                                                            ║
║  curl -X GET http://localhost:${PORT}/health              ║
╚════════════════════════════════════════════════════════════╝
`;
      logger.info(banner, "Server");
    });
  } catch (error: any) {
    logger.error(
      "Failed to start server",
      "Server",
      error
    );
    process.exit(1);
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
