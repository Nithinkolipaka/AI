/**
 * AUTHENTICATION CONTROLLER
 * 
 * Handles user registration, login, and profile endpoints.
 */

import { Request, Response } from "express";
import { authService } from "../services/auth.service.js";
import { logger } from "../../utils/logger.js";
import { ValidationError } from "../../utils/errors.js";

export class AuthController {
  /**
   * REGISTER ENDPOINT
   * 
   * POST /api/auth/register
   * Creates a new user account
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password, firstName, lastName } = req.body;

      logger.debug(
        `Registration attempt: ${email}`,
        "AuthController.register"
      );

      // Validate required fields
      if (!email || !password || !firstName || !lastName) {
        throw new ValidationError("Missing required fields");
      }

      const result = await authService.register(
        email,
        password,
        firstName,
        lastName
      );

      logger.info(
        `User registered: ${email}`,
        "AuthController.register"
      );

      return res.status(201).json({
        status: "success",
        message: "User registered successfully",
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      logger.error(
        "Registration failed",
        "AuthController.register",
        error
      );

      return res.status(error.statusCode || 400).json({
        status: "error",
        code: error.code || "REGISTRATION_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * LOGIN ENDPOINT
   * 
   * POST /api/auth/login
   * Authenticates user and returns JWT token
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      logger.debug(
        `Login attempt: ${email}`,
        "AuthController.login"
      );

      if (!email || !password) {
        throw new ValidationError("Email and password are required");
      }

      const result = await authService.login(email, password);

      logger.info(
        `User logged in: ${email}`,
        "AuthController.login"
      );

      return res.status(200).json({
        status: "success",
        message: "User logged in successfully",
        user: result.user,
        token: result.token,
      });
    } catch (error: any) {
      logger.error(
        "Login failed",
        "AuthController.login",
        error
      );

      return res.status(error.statusCode || 401).json({
        status: "error",
        code: error.code || "LOGIN_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * GET PROFILE ENDPOINT
   * 
   * GET /api/auth/profile (requires authentication)
   * Returns current user profile
   */
  async getProfile(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.userId) {
        throw new ValidationError("User ID not found");
      }

      const user = await authService.getUserById(req.userId);

      logger.debug(
        `Profile retrieved: ${user.email}`,
        "AuthController.getProfile"
      );

      return res.status(200).json({
        status: "success",
        user: user.toJSON ? user.toJSON() : user,
      });
    } catch (error: any) {
      logger.error(
        "Get profile failed",
        "AuthController.getProfile",
        error
      );

      return res.status(error.statusCode || 500).json({
        status: "error",
        code: error.code || "PROFILE_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * CHANGE PASSWORD ENDPOINT
   * 
   * POST /api/auth/change-password (requires authentication)
   * Changes user password with old password verification
   */
  async changePassword(req: Request, res: Response): Promise<Response> {
    try {
      const { oldPassword, newPassword } = req.body;

      if (!req.userId) {
        throw new ValidationError("User ID not found");
      }

      if (!oldPassword || !newPassword) {
        throw new ValidationError("Old and new passwords are required");
      }

      await authService.changePassword(req.userId, oldPassword, newPassword);

      logger.info(
        `Password changed for user: ${req.userId}`,
        "AuthController.changePassword"
      );

      return res.status(200).json({
        status: "success",
        message: "Password changed successfully",
      });
    } catch (error: any) {
      logger.error(
        "Change password failed",
        "AuthController.changePassword",
        error
      );

      return res.status(error.statusCode || 400).json({
        status: "error",
        code: error.code || "PASSWORD_ERROR",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export const authController = new AuthController();

export default authController;
