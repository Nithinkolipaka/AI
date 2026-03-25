/**
 * AUTHENTICATION MIDDLEWARE
 * 
 * Middleware functions to protect routes and verify user authentication.
 */

import { Request, Response, NextFunction } from "express";
import { jwtService, type JWTPayload } from "../auth/jwt.service.js";
import { AuthenticationError, AuthorizationError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

/**
 * EXTEND EXPRESS REQUEST INTERFACE
 * 
 * Add custom properties to Request object for authenticated user data.
 */
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userId?: string;
      userRole?: string;
    }
  }
}

/**
 * PROTECT ROUTE MIDDLEWARE
 * 
 * Verifies JWT token and ensures user is authenticated.
 * Must be placed before routes that require authentication.
 * 
 * FLOW:
 * 1. Extract token from Authorization header
 * 2. Verify token signature and expiration
 * 3. Decode user data from token
 * 4. Continue to next middleware/route
 * 5. Or return 401 if authentication fails
 */
export function protectRoute(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    /**
     * STEP 1: EXTRACT TOKEN FROM HEADER
     * 
     * Authorization header format: "Bearer <token>"
     * Example: "Bearer eyJhbGciOiJIUzI1NiIs..."
     */
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      logger.warn("Missing authorization header", "protectRoute");
      throw new AuthenticationError("Missing authorization header");
    }

    /**
     * STEP 2: EXTRACT TOKEN FROM "Bearer <token>" FORMAT
     */
    const token = jwtService.extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn("Invalid authorization header format", "protectRoute");
      throw new AuthenticationError(
        "Invalid authorization header format. Use: Bearer <token>"
      );
    }

    /**
     * STEP 3: VERIFY TOKEN
     * 
     * This will:
     * - Verify signature with secret key
     * - Check if token has expired
     * - Throw error if invalid
     */
    const payload = jwtService.verifyToken(token);

    /**
     * STEP 4: ATTACH USER DATA TO REQUEST
     * 
     * The decoded payload is available to subsequent middleware/routes.
     */
    req.user = payload;
    req.userId = payload.userId;
    req.userRole = payload.role;

    logger.debug(
      `User authenticated: ${payload.email}`,
      "protectRoute"
    );

    /**
     * STEP 5: CONTINUE TO NEXT MIDDLEWARE
     */
    next();
  } catch (error: any) {
    /**
     * ERROR HANDLING
     * 
     * If authentication fails, return 401 (Unauthorized) error.
     */
    logger.error(
      "Authentication failed",
      "protectRoute",
      error
    );

    if (error instanceof AuthenticationError) {
      return res.status(error.statusCode).json({
        status: "error",
        code: error.code,
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    }

    res.status(500).json({
      status: "error",
      code: "INTERNAL_SERVER_ERROR",
      message: "Authentication check failed",
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * AUTHORIZE ROLE MIDDLEWARE
 * 
 * Checks if user has required role.
 * Must be placed after protectRoute middleware.
 * 
 * @param allowedRoles Array of roles that can access the route
 * 
 * EXAMPLE USAGE:
 * router.delete('/admin/users/:id', protectRoute, authorizeRole(['admin']), controller.deleteUser)
 */
export function authorizeRole(allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      /**
       * STEP 1: CHECK IF USER IS AUTHENTICATED
       * 
       * This middleware should always follow protectRoute,
       * so req.user should always be defined.
       */
      if (!req.user) {
        logger.warn("User not authenticated in authorizeRole", "authorizeRole");
        throw new AuthenticationError("User not authenticated");
      }

      /**
       * STEP 2: CHECK IF USER ROLE IS ALLOWED
       * 
       * Compare user's role against allowed roles array.
       */
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(
          `User ${req.user.email} unauthorized for role: ${allowedRoles.join(", ")}`,
          "authorizeRole"
        );
        throw new AuthorizationError(
          `This action requires one of these roles: ${allowedRoles.join(", ")}`
        );
      }

      logger.debug(
        `User ${req.user.email} authorized with role: ${req.user.role}`,
        "authorizeRole"
      );

      /**
       * STEP 3: CONTINUE TO NEXT MIDDLEWARE
       */
      next();
    } catch (error: any) {
      logger.error(
        "Authorization check failed",
        "authorizeRole",
        error
      );

      if (error instanceof AuthorizationError) {
        return res.status(error.statusCode).json({
          status: "error",
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      if (error instanceof AuthenticationError) {
        return res.status(error.statusCode).json({
          status: "error",
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }

      res.status(500).json({
        status: "error",
        code: "INTERNAL_SERVER_ERROR",
        message: "Authorization check failed",
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * OPTIONAL AUTH MIDDLEWARE
 * 
 * Attempts to verify token but doesn't fail if missing.
 * Useful for routes that can work with or without authentication.
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const token = jwtService.extractTokenFromHeader(authHeader);

      if (token) {
        try {
          const payload = jwtService.verifyToken(token);
          req.user = payload;
          req.userId = payload.userId;
          req.userRole = payload.role;

          logger.debug(
            `Optional auth successful for: ${payload.email}`,
            "optionalAuth"
          );
        } catch (error) {
          // Token verification failed, but we don't throw - continue as unauthenticated
          logger.debug("Optional auth token verification failed", "optionalAuth");
        }
      }
    }

    next();
  } catch (error: any) {
    logger.error(
      "Optional auth error",
      "optionalAuth",
      error
    );
    next();
  }
}
