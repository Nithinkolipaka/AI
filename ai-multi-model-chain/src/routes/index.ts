import { Router, Request, Response } from 'express';
import { LLMController, UserController } from '../controllers';

/**
 * API Routes
 * RESTful endpoints for LLM operations and user management
 */
export function setupRoutes(app: Router): void {
  /**
   * LLM Routes
   */
  app.post('/api/llm/generate', LLMController.generateText);
  app.post('/api/llm/extract-user', LLMController.extractUser);
  app.get('/api/llm/providers', LLMController.getAvailableProviders);
  app.get('/api/llm/current', LLMController.getCurrentProvider);

  /**
   * User Management Routes
   */
  app.get('/api/users', UserController.listUsers);
  app.get('/api/users/:email', UserController.getUser);
  app.get('/api/users/provider/:provider', UserController.getUsersByProvider);
  app.delete('/api/users/:email', UserController.deleteUser);
  app.get('/api/stats', UserController.getStats);

  /**
   * Health check
   */
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  /**
   * API documentation
   */
  app.get('/', (req: Request, res: Response) => {
    res.json({
      name: 'AI Multi-Model Chain API',
      version: '1.0.0',
      endpoints: {
        llm: {
          'POST /api/llm/generate': 'Generate text from prompt',
          'POST /api/llm/extract-user':
            'Extract structured user data from text',
          'GET /api/llm/providers': 'Get available LLM providers',
          'GET /api/llm/current': 'Get current provider info',
        },
        users: {
          'GET /api/users': 'List all extracted users',
          'GET /api/users/:email': 'Get specific user',
          'GET /api/users/provider/:provider':
            'Get users by provider',
          'DELETE /api/users/:email': 'Delete user',
          'GET /api/stats': 'Get statistics',
        },
        health: {
          'GET /health': 'Health check',
        },
      },
    });
  });
}
