/**
 * MAIN APPLICATION ENTRY POINT
 * 
 * Combines all services and starts the main server.
 * This demonstrates full MVC architecture with all features:
 * - JWT Authentication
 * - Activity Logging
 * - MongoDB Integration
 * - Error Handling
 * - LCEL Examples as separate micro-services
 */

import express, { Express, Request, Response, NextFunction } from "express";
import * as dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import { database } from "./database/mongodb.js";
import { protectRoute, authorizeRole, optionalAuth } from "./middleware/auth.middleware.js";
import { activityLogger } from "./activity/middleware/activity.middleware.js";
import authRoutes from "./auth/routes/index.route.js";

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

/**
 * GLOBAL MIDDLEWARE
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`, "Server");
  next();
});

// Activity logging (protected routes)
app.use("/api/*", activityLogger);

/**
 * ============================================================
 * PUBLIC ENDPOINTS
 * ============================================================
 */

/**
 * ROOT ENDPOINT
 */
app.get("/", (req: Request, res: Response) => {
  res.json({
    name: "LangChain LCEL Examples API",
    version: "1.0.0",
    description: "Complete TypeScript project with MVC, JWT, MongoDB, and LCEL examples",
    auth: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
    },
    features: [
      "JWT Authentication",
      "MongoDB Integration",
      "Activity Logging & Audit Trail",
      "4 LCEL Examples with Full MVC",
      "Error Handling",
      "Request Logging",
    ],
    examples: {
      simple_chain: "POST /api/chains/simple/execute",
      stream_responses: "GET /api/chains/stream",
      structured_output: "POST /api/chains/structured/extract",
      lcel_vs_fetch: "POST /api/chains/compare",
    },
    docs: "GET /api/docs",
  });
});

/**
 * HEALTH CHECK
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "LCEL Examples API",
    database: database.getConnectionStatus() ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

/**
 * ============================================================
 * AUTHENTICATION ROUTES (PUBLIC)
 * ============================================================
 * 
 * No authentication required for register/login.
 */
app.use("/api/auth", authRoutes);

/**
 * ============================================================
 * PROTECTED API ROUTES
 * ============================================================
 * 
 * All routes below require valid JWT token in Authorization header.
 * Format: Authorization: Bearer <token>
 */

/**
 * USER PROFILE ROUTE
 * 
 * GET /api/profile - Get current user profile
 */
app.get("/api/profile", protectRoute, (req: Request, res: Response) => {
  res.json({
    status: "success",
    user: req.user,
    message: "Successfully retrieved profile",
  });
});

/**
 * ACTIVITY ROUTES
 * 
 * GET /api/activities - Get user's activity log
 */
app.get("/api/activities", protectRoute, async (req: Request, res: Response) => {
  try {
    const { activityService } = await import("./activity/services/activity.service.js");
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = parseInt(req.query.skip as string) || 0;

    const result = await activityService.getUserActivities(
      req.userId!,
      limit,
      skip
    );

    res.json({
      status: "success",
      activities: result.activities,
      pagination: { limit, skip, total: result.total },
    });
  } catch (error: any) {
    logger.error("[Route] Error getting activities", "app", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * ADMIN ROUTES
 * 
 * These routes require admin role.
 * Regular users cannot access them.
 */

/**
 * GET /api/admin/activities - View all activities (admin only)
 */
app.get("/api/admin/activities", protectRoute, authorizeRole(["admin"]), async (req: Request, res: Response) => {
  try {
    const { activityService } = await import("./activity/services/activity.service.js");
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = parseInt(req.query.skip as string) || 0;

    const { activities, total } = await activityService.getResourceActivities(
      req.query.resource as string || "all",
      limit,
      skip
    );

    res.json({
      status: "success",
      activities,
      pagination: { limit, skip, total },
    });
  } catch (error: any) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * ============================================================
 * LCEL EXAMPLE ROUTES
 * ============================================================
 * 
 * Mount individual example routes.
 * Each example can be run as a standalone service.
 */

// Import example routes
const { default: simpleChainRoutes } = await import("./examples/01-simple-chain/routes/index.route.js");

// Mount routes
app.use("/api/chains/simple", protectRoute, simpleChainRoutes);

/**
 * ============================================================
 * ERROR HANDLING
 * ============================================================
 */

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, "Server", err);

  res.status(err.statusCode || 500).json({
    status: "error",
    code: err.code || "INTERNAL_SERVER_ERROR",
    message: err.message || "An unexpected error occurred",
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: "error",
    code: "NOT_FOUND",
    message: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * ============================================================
 * SERVER STARTUP
 * ============================================================
 */

export async function startServer(): Promise<void> {
  try {
    // Connect to MongoDB
    logger.info("Connecting to MongoDB...", "Server");
    await database.connect();

    // Start HTTP server
    app.listen(PORT, () => {
      const banner = `
╔═══════════════════════════════════════════════════════════════╗
║     LangChain LCEL Examples - TypeScript & MongoDB           ║
║                                                              ║
║  ✓ Server running on http://localhost:${PORT}                ║
║  ✓ MongoDB connected                                        ║
║  ✓ JWT authentication enabled                              ║
║  ✓ Activity tracking enabled                               ║
║                                                              ║
║  Quick Start:                                               ║
║  1. POST /api/auth/register - Create account              ║
║  2. POST /api/auth/login - Get JWT token                  ║
║  3. Use token to access: /api/chains/simple/execute      ║
║                                                              ║
║  Examples:                                                  ║
║  - Simple Chain (prompt → model → parser)                ║
║  - Stream Responses (real-time SSE)                      ║
║  - Structured Output (typed objects)                     ║
║  - LCEL vs Fetch (comparison & benefits)                 ║
║                                                              ║
╚═══════════════════════════════════════════════════════════════╝
`;
      logger.info(banner, "Server");
    });
  } catch (error: any) {
    logger.error("Failed to start server", "Server", error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

export default app;
