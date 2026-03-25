/**
 * CUSTOM ERROR CLASSES
 * 
 * Standardized error handling across the application.
 * Each error type contains error code, message, and HTTP status.
 */

/**
 * APPLICATION ERROR BASE CLASS
 * 
 * All custom errors extend this class.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: string = "INTERNAL_ERROR",
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);

    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * VALIDATION ERROR
 * 
 * Thrown when input validation fails.
 * Usually returns HTTP 400 (Bad Request).
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(
      message,
      "VALIDATION_ERROR",
      400,
      true
    );
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * AUTHENTICATION ERROR
 * 
 * Thrown when authentication fails.
 * Usually returns HTTP 401 (Unauthorized).
 */
export class AuthenticationError extends AppError {
  constructor(message: string = "Authentication failed") {
    super(
      message,
      "AUTHENTICATION_ERROR",
      401,
      true
    );
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * AUTHORIZATION ERROR
 * 
 * Thrown when user lacks required permissions.
 * Usually returns HTTP 403 (Forbidden).
 */
export class AuthorizationError extends AppError {
  constructor(message: string = "Access denied") {
    super(
      message,
      "AUTHORIZATION_ERROR",
      403,
      true
    );
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

/**
 * NOT FOUND ERROR
 * 
 * Thrown when resource doesn't exist.
 * Usually returns HTTP 404 (Not Found).
 */
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(
      `${resource} not found`,
      "NOT_FOUND_ERROR",
      404,
      true
    );
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * CONFLICT ERROR
 * 
 * Thrown when resource already exists or conflicts.
 * Usually returns HTTP 409 (Conflict).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(
      message,
      "CONFLICT_ERROR",
      409,
      true
    );
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * EXTERNAL SERVICE ERROR
 * 
 * Thrown when external service (OpenAI, MongoDB, etc.) fails.
 * Usually returns HTTP 502 (Bad Gateway).
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string) {
    super(
      `${service} error: ${message}`,
      "EXTERNAL_SERVICE_ERROR",
      502,
      true
    );
    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }
}

/**
 * ERROR RESPONSE FORMATTER
 * 
 * Standardizes error responses sent to clients.
 */
export function formatErrorResponse(error: any) {
  if (error instanceof AppError) {
    return {
      status: "error",
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: new Date().toISOString(),
    };
  }

  // Handle unknown errors
  return {
    status: "error",
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred",
    statusCode: 500,
    timestamp: new Date().toISOString(),
  };
}
