/**
 * ACTIVITY LOGGING MIDDLEWARE
 * 
 * Automatically logs all API requests as user activities.
 * Records action, resource, method, status code, and metadata.
 */

import { Request, Response, NextFunction } from "express";
import { activityService } from "../services/activity.service.js";
import { logger } from "../../utils/logger.js";

/**
 * EXTRACT IP ADDRESS
 * 
 * Gets client IP address from request.
 * Considers proxy headers for accurate IP detection.
 */
function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }

  return req.socket.remoteAddress || "unknown";
}

/**
 * EXTRACT USER AGENT
 */
function getUserAgent(req: Request): string {
  return req.headers["user-agent"] || "unknown";
}

/**
 * ACTIVITY LOGGING MIDDLEWARE
 * 
 * FLOW:
 * 1. Intercept request
 * 2. Store original response.send method
 * 3. Override response.send to capture status code
 * 4. After response is sent, log the activity
 * 5. Call original send method
 * 
 * @param req Express request
 * @param res Express response
 * @param next Next middleware
 */
export function activityLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    /**
     * STEP 1: EXTRACT REQUEST INFORMATION
     * 
     * Get HTTP method, path, user info, IP, user agent.
     */
    const method = req.method;
    const path = req.path;
    const userId = (req as any).userId; // Set by auth middleware

    // If no authenticated user, skip activity logging
    if (!userId) {
      return next();
    }

    const ipAddress = getClientIP(req);
    const userAgent = getUserAgent(req);

    /**
     * STEP 2: OVERRIDE RESPONSE.SEND
     * 
     * Store original send method, then override it.
     */
    const originalSend = res.send;

    // Track if send has been called (avoid logging twice)
    let sendCalled = false;

    res.send = function (data: any) {
      if (!sendCalled) {
        sendCalled = true;

        /**
         * STEP 3: EXTRACT RESOURCE AND ACTION
         * 
         * Derive from HTTP method and path.
         * Example: POST /api/chains → action: "CREATE", resource: "chains"
         */
        const resource = extractResource(path);
        const action = methodToAction(method);
        const statusCode = res.statusCode;

        /**
         * STEP 4: EXTRACT METADATA
         * 
         * Include request body (remove sensitive fields) and response.
         */
        const metadata = {
          requestBody: req.body ? sanitizeBody(req.body) : null,
          responseSize: data?.length || 0,
          duration: Date.now() - (res.locals.startTime || Date.now()),
        };

        /**
         * STEP 5: LOG ACTIVITY ASYNCHRONOUSLY
         * 
         * Log in background without blocking response.
         */
        activityService.logActivity({
          userId,
          action,
          resource,
          method,
          statusCode,
          description: `${method} ${path}`,
          metadata,
          ipAddress,
          userAgent,
        }).catch((error) => {
          logger.error(
            "Failed to log activity",
            "activityLogger",
            error
          );
        });
      }

      return originalSend.call(this, data);
    };

    /**
     * STEP 6: RECORD START TIME
     * 
     * Store start time in response locals for duration calculation.
     */
    res.locals.startTime = Date.now();

    /**
     * STEP 7: CONTINUE TO NEXT MIDDLEWARE
     */
    next();
  } catch (error: any) {
    logger.error(
      "Activity logger middleware error",
      "activityLogger",
      error
    );
    next();
  }
}

/**
 * EXTRACT RESOURCE FROM PATH
 * 
 * Converts API path to resource name.
 * Examples:
 * /api/chains → "chains"
 * /api/users/123 → "users"
 * /api/auth/login → "auth"
 */
function extractResource(path: string): string {
  // Remove leading/trailing slashes
  const segments = path.split("/").filter(Boolean);

  // Return first meaningful segment (skip "api" prefix)
  for (const segment of segments) {
    if (segment !== "api" && !segment.match(/^\d+$/)) {
      return segment;
    }
  }

  return "unknown";
}

/**
 * CONVERT HTTP METHOD TO ACTION
 * 
 * Maps HTTP methods to activity actions.
 * GET → READ
 * POST → CREATE
 * PUT/PATCH → UPDATE
 * DELETE → DELETE
 */
function methodToAction(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "READ";
    case "POST":
      return "CREATE";
    case "PUT":
    case "PATCH":
      return "UPDATE";
    case "DELETE":
      return "DELETE";
    default:
      return "READ";
  }
}

/**
 * SANITIZE REQUEST BODY
 * 
 * Removes sensitive fields from logged metadata.
 * Prevents passwords and tokens from being logged.
 */
function sanitizeBody(body: any): any {
  if (!body || typeof body !== "object") {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = [
    "password",
    "token",
    "apiKey",
    "secret",
    "creditCard",
  ];

  /**
   * ITERATE SENSITIVE FIELDS AND REMOVE
   */
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = "***REDACTED***";
    }
  }

  return sanitized;
}
