/**
 * JWT (JSON Web Token) UTILITIES
 * 
 * Handles token generation, verification, and decoding.
 * Used for user authentication and session management.
 */

import jwt from "jsonwebtoken";
import { logger } from "../utils/logger.js";
import { AuthenticationError } from "../utils/errors.js";

/**
 * JWT PAYLOAD INTERFACE
 * 
 * Standard payload structure for JWT tokens.
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT SERVICE CLASS
 * 
 * Handles all JWT operations.
 */
export class JWTService {
  private secret: string;
  private expiresIn: string;

  /**
   * CONSTRUCTOR
   */
  constructor(
    secret: string = process.env.JWT_SECRET || "your-secret-key",
    expiresIn: string = process.env.JWT_EXPIRES_IN || "7d"
  ) {
    this.secret = secret;
    this.expiresIn = expiresIn;

    if (!secret || secret === "your-secret-key") {
      logger.warn(
        "Using default JWT secret. Change JWT_SECRET in .env for production!",
        "JWTService"
      );
    }
  }

  /**
   * GENERATE TOKEN
   * 
   * Creates a new JWT token with the provided payload.
   * 
   * @param payload User data to encode in token
   * @returns Signed JWT token
   */
  generateToken(payload: JWTPayload): string {
    try {
      /**
       * STEPS:
       * 1. Sign the payload with secret key
       * 2. Include expiration time
       * 3. Return encoded token
       */
      const token = jwt.sign(payload, this.secret, {
        expiresIn: this.expiresIn,
        algorithm: "HS256",
      });

      logger.debug(
        `JWT token generated for user: ${payload.email}`,
        "JWTService.generateToken"
      );

      return token;
    } catch (error: any) {
      logger.error(
        "Failed to generate JWT token",
        "JWTService.generateToken",
        error
      );
      throw error;
    }
  }

  /**
   * VERIFY TOKEN
   * 
   * Validates and decodes a JWT token.
   * Throws error if token is invalid or expired.
   * 
   * @param token JWT token to verify
   * @returns Decoded payload if valid
   */
  verifyToken(token: string): JWTPayload {
    try {
      /**
       * STEPS:
       * 1. Verify signature using secret key
       * 2. Check expiration
       * 3. Return decoded payload
       */
      const payload = jwt.verify(token, this.secret, {
        algorithms: ["HS256"],
      }) as JWTPayload;

      logger.debug(
        `JWT token verified for user: ${payload.email}`,
        "JWTService.verifyToken"
      );

      return payload;
    } catch (error: any) {
      let message = "Invalid token";

      if (error.name === "TokenExpiredError") {
        message = "Token has expired";
      } else if (error.name === "JsonWebTokenError") {
        message = "Invalid token signature";
      }

      logger.warn(
        `Token verification failed: ${message}`,
        "JWTService.verifyToken"
      );

      throw new AuthenticationError(message);
    }
  }

  /**
   * DECODE TOKEN
   * 
   * Decodes token without verification.
   * Useful for extracting payload info without validation.
   * 
   * @param token JWT token to decode
   * @returns Decoded payload (unverified)
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch (error) {
      logger.error(
        "Failed to decode token",
        "JWTService.decodeToken",
        error
      );
      return null;
    }
  }

  /**
   * REFRESH TOKEN
   * 
   * Creates a new token with the same payload.
   * Useful for token rotation and extended sessions.
   * 
   * @param token Old JWT token to refresh
   * @returns New JWT token with updated expiration
   */
  refreshToken(token: string): string {
    try {
      // Verify and decode the old token
      const payload = this.verifyToken(token);

      // Remove old timestamps
      delete payload.iat;
      delete payload.exp;

      // Generate new token
      return this.generateToken(payload);
    } catch (error) {
      logger.error(
        "Failed to refresh token",
        "JWTService.refreshToken",
        error
      );
      throw error;
    }
  }

  /**
   * EXTRACT TOKEN FROM REQUEST HEADER
   * 
   * Extracts JWT token from Authorization header.
   * Expected format: "Bearer <token>"
   * 
   * @param authHeader Authorization header value
   * @returns Extracted token or null
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    /**
     * SPLIT HEADER
     * 
     * Authorization header format: "Bearer <token>"
     * Extract the token part (second element after split)
     */
    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      logger.warn(
        "Invalid Authorization header format",
        "JWTService.extractTokenFromHeader"
      );
      return null;
    }

    return parts[1];
  }
}

// Export singleton instance
export const jwtService = new JWTService();

export default jwtService;
