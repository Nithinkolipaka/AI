import { envConfig } from '../config/env.config';

/**
 * Simple logger utility
 * In production, consider using Winston or Pino
 */
export const logger = {
  debug: (message: string, data?: unknown) => {
    if (envConfig.logLevel === 'debug') {
      console.log(`[DEBUG] ${message}`, data || '');
    }
  },

  info: (message: string, data?: unknown) => {
    console.log(`[INFO] ${message}`, data || '');
  },

  warn: (message: string, data?: unknown) => {
    console.warn(`[WARN] ${message}`, data || '');
  },

  error: (message: string, error?: unknown) => {
    console.error(`[ERROR] ${message}`, error || '');
  },
};
