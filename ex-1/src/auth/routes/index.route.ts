/**
 * AUTHENTICATION ROUTES
 */

import express, { Router, Request, Response } from "express";
import authController from "../controllers/auth.controller.js";
import { protectRoute } from "../../middleware/auth.middleware.js";

const router: Router = express.Router();

/**
 * PUBLIC ROUTES (No authentication required)
 */

/**
 * POST /api/auth/register
 * Create new user account
 */
router.post("/register", async (req: Request, res: Response) => {
  await authController.register(req, res);
});

/**
 * POST /api/auth/login
 * Login and get JWT token
 */
router.post("/login", async (req: Request, res: Response) => {
  await authController.login(req, res);
});

/**
 * PROTECTED ROUTES (Require authentication)
 */

/**
 * GET /api/auth/profile
 * Get current user profile
 */
router.get("/profile", protectRoute, async (req: Request, res: Response) => {
  await authController.getProfile(req, res);
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post("/change-password", protectRoute, async (req: Request, res: Response) => {
  await authController.changePassword(req, res);
});

export default router;
