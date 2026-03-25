/**
 * LOGGER UTILITY
 * 
 * Centralized logging system with different log levels.
 * Logs to console and file with timestamps and context.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

// Color codes for console output
const colors = {
  DEBUG: "\x1b[36m", // Cyan
  INFO: "\x1b[32m", // Green
  WARN: "\x1b[33m", // Yellow
  ERROR: "\x1b[31m", // Red
  RESET: "\x1b[0m",
};

/**
 * Logger Class
 * 
 * Provides centralized logging functionality.
 * Supports multiple log levels and file output.
 */
export class Logger {
  private logDir: string;
  private logFile: string;
  private logLevel: LogLevel;

  /**
   * CONSTRUCTOR
   * 
   * @param logDir Directory to store log files
   * @param minLogLevel Minimum log level to display
   */
  constructor(
    logDir: string = path.join(__dirname, "../../logs"),
    minLogLevel: LogLevel = LogLevel.DEBUG
  ) {
    this.logDir = logDir;
    this.logLevel = minLogLevel;

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Create log file path with current date
    const date = new Date().toISOString().split("T")[0];
    this.logFile = path.join(this.logDir, `app-${date}.log`);
  }

  /**
   * FORMAT LOG MESSAGE
   * 
   * Creates formatted log entry with timestamp and context.
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : "";

    let logMessage = `${timestamp} ${level} ${ctx} ${message}`;

    if (data) {
      logMessage += ` ${JSON.stringify(data)}`;
    }

    return logMessage;
  }

  /**
   * WRITE TO FILE
   * 
   * Appends log entry to file.
   */
  private writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message + "\n");
    } catch (error) {
      console.error("Failed to write to log file:", error);
    }
  }

  /**
   * LOG METHOD
   * 
   * Main logging method that handles all log levels.
   */
  private log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any
  ): void {
    // Only log if level is >= minLogLevel
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    if (levels.indexOf(level) < levels.indexOf(this.logLevel)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, context, data);

    // Console output with colors
    const color = colors[level];
    console.log(
      `${color}${formattedMessage}${colors.RESET}`
    );

    // File output
    this.writeToFile(formattedMessage);
  }

  /**
   * PUBLIC LOG METHODS
   */

  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  error(message: string, context?: string, error?: Error | any): void {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    this.log(LogLevel.ERROR, message, context, errorData);
  }
}

// Export singleton instance
export const logger = new Logger(
  process.env.LOG_DIR || path.join(__dirname, "../../logs"),
  (process.env.LOG_LEVEL as LogLevel) || LogLevel.DEBUG
);

export default logger;
