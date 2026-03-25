/**
 * EXAMPLE 1: SIMPLE CHAIN - Routes (TypeScript)
 * 
 * Defines HTTP endpoints and maps them to controller handlers.
 */

import express, { Router, Request, Response, NextFunction } from "express";
import simpleChainController from "../controllers/chain.controller.js";

const router: Router = express.Router();

/**
 * REQUEST LOGGING MIDDLEWARE
 * 
 * Logs all requests to this router.
 */
router.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[Routes] ${req.method} ${req.path}`);
  next();
});

/**
 * ENDPOINT 1: EXECUTE CHAIN
 * 
 * POST /execute
 * Full path when mounted: POST /api/chains/simple/execute
 */
router.post("/execute", async (req: Request, res: Response) => {
  await simpleChainController.handleExecuteChain(req, res);
});

/**
 * ENDPOINT 2: STREAM CHAIN
 * 
 * GET /stream
 * Full path when mounted: GET /api/chains/simple/stream
 * 
 * Streams response in real-time.
 */
router.get("/stream", async (req: Request, res: Response) => {
  await simpleChainController.handleStreamChain(req, res);
});

/**
 * ENDPOINT 3: HEALTH CHECK
 * 
 * GET /health
 */
router.get("/health", (req: Request, res: Response) => {
  simpleChainController.handleHealth(req, res);
});

/**
 * ENDPOINT 4: API DOCUMENTATION
 * 
 * GET /info
 */
router.get("/info", (req: Request, res: Response) => {
  simpleChainController.handleInfo(req, res);
});

export default router;
