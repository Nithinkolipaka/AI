import { Request, Response } from 'express';
import { LLMService } from '../services/LLMService';
import { UserRepository } from '../models';
import { logger } from '../utils/logger';
import { validateLLMRequest } from '../utils/validators';

/**
 * Controller for LLM chain operations
 * Handles HTTP requests for text generation and structured extraction
 */
export class LLMController {
  /**
   * POST /api/llm/generate
   * Simple text generation
   *
   * Request body:
   * {
   *   "prompt": "What is machine learning?",
   *   "provider": "openai", // optional
   *   "streaming": true // optional
   * }
   */
  static async generateText(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, provider, streaming } = await validateLLMRequest(req.body);

      const llmService = new LLMService(provider);

      logger.info('Generating text', { provider: llmService.getCurrentProvider().name });

      // Handle streaming
      if (streaming && req.accepts('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const startTime = Date.now();
        let textLength = 0;

        for await (const chunk of llmService.streamText(prompt)) {
          textLength += chunk.length;
          res.write(`data: ${JSON.stringify({ chunk, type: 'text' })}\n\n`);
        }

        const duration = Date.now() - startTime;
        res.write(
          `data: ${JSON.stringify({
            type: 'complete',
            stats: {
              totalChars: textLength,
              duration,
              provider: llmService.getCurrentProvider().name,
            },
          })}\n\n`,
        );

        res.end();
        return;
      }

      // Non-streaming response
      const response = await llmService.generateText(prompt);

      res.json({
        text: response,
        provider: llmService.getCurrentProvider(),
      });
    } catch (error) {
      logger.error('Error generating text', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * POST /api/llm/extract-user
   * Extract structured user data using LLM
   *
   * Request body:
   * {
   *   "prompt": "Extract user info: John Doe, john@example.com, 30 years old",
   *   "provider": "openai", // optional
   *   "streaming": true // optional
   * }
   *
   * Response (non-streaming):
   * {
   *   "structured": {
   *     "name": "John Doe",
   *     "email": "john@example.com",
   *     "age": 30
   *   },
   *   "provider": "openai"
   * }
   */
  static async extractUser(req: Request, res: Response): Promise<void> {
    try {
      const { prompt, provider, streaming } = await validateLLMRequest(req.body);

      const llmService = new LLMService(provider);

      logger.info('Extracting user data', { provider: llmService.getCurrentProvider().name });

      // Handle streaming
      if (streaming && req.accepts('text/event-stream')) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let extractedUser = null;

        for await (const item of llmService.streamExtractUser(prompt)) {
          if (item.type === 'chunk') {
            res.write(`data: ${JSON.stringify({ chunk: item.data, type: 'chunk' })}\n\n`);
          } else {
            extractedUser = item.data;
            res.write(
              `data: ${JSON.stringify({
                type: 'parsed',
                data: extractedUser,
              })}\n\n`,
            );
          }
        }

        res.write('data: [DONE]\n\n');
        res.end();
        return;
      }

      // Non-streaming response
      const user = await llmService.extractUser(prompt);

      // Save to database
      await UserRepository.upsert({
        ...user,
        extractedFrom: prompt,
        provider: llmService.getCurrentProvider().name,
      });

      res.json({
        structured: user,
        provider: llmService.getCurrentProvider(),
        saved: true,
      });
    } catch (error) {
      logger.error('Error extracting user', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/llm/providers
   * Get list of available providers
   */
  static async getAvailableProviders(req: Request, res: Response): Promise<void> {
    try {
      const llmService = new LLMService();
      const available = llmService.getAvailableProviders();

      const providers = available.map((name) => ({
        name,
        available: llmService.isProviderAvailable(name),
      }));

      res.json({ providers });
    } catch (error) {
      logger.error('Error getting providers', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/llm/current
   * Get current provider info
   */
  static async getCurrentProvider(req: Request, res: Response): Promise<void> {
    try {
      const llmService = new LLMService();
      const provider = llmService.getCurrentProvider();

      res.json({ provider });
    } catch (error) {
      logger.error('Error getting current provider', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * Controller for User management
 * Handles CRUD operations for extracted users
 */
export class UserController {
  /**
   * GET /api/users
   * List all extracted users
   */
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      const users = await UserRepository.findAll(limit, skip);

      res.json({
        data: users,
        count: users.length,
        limit,
        skip,
      });
    } catch (error) {
      logger.error('Error listing users', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/users/:email
   * Get specific user
   */
  static async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      const user = await UserRepository.findByEmail(email);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ data: user });
    } catch (error) {
      logger.error('Error getting user', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/users/provider/:provider
   * Get users extracted by specific provider
   */
  static async getUsersByProvider(req: Request, res: Response): Promise<void> {
    try {
      const { provider } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const skip = parseInt(req.query.skip as string) || 0;

      const users = await UserRepository.findByProvider(provider, limit, skip);

      res.json({
        data: users,
        count: users.length,
        provider,
        limit,
        skip,
      });
    } catch (error) {
      logger.error('Error getting users by provider', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * DELETE /api/users/:email
   * Delete user
   */
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.params;
      const deleted = await UserRepository.deleteByEmail(email);

      if (!deleted) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      logger.error('Error deleting user', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/users/stats
   * Get user statistics
   */
  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const total = await UserRepository.count();

      res.json({
        stats: {
          total,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error getting stats', error);
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
