import { Ollama } from '@langchain/community/llms/ollama';
import { BaseLanguageModel } from '@langchain/core/language_model';
import { BaseLLMService } from '../BaseLLMService';
import { logger } from '../../utils/logger';

/**
 * Ollama LLM Provider Implementation
 * 
 * Local open-source LLM support
 * 
 * Requires Ollama to be running:
 * ollama serve
 * 
 * Supports:
 * - Llama 2
 * - Mistral
 * - Neural Chat
 * - And many others
 */
export class OllamaProvider extends BaseLLMService {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'llama2') {
    super('ollama', model);
    this.baseUrl = baseUrl;
  }

  async initialize(): Promise<void> {
    if (this.llm) {
      logger.debug('Ollama provider already initialized');
      return;
    }

    try {
      logger.info(`Initializing Ollama provider at ${this.baseUrl}`);

      this.llm = new Ollama({
        baseUrl: this.baseUrl,
        model: this.model,
        temperature: 0.7,
      });

      // Test connection
      // In production, add proper health check
      logger.info('Ollama provider initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Ollama provider', error);
      throw new Error(
        `Failed to connect to Ollama at ${this.baseUrl}. Make sure Ollama is running with: ollama serve`,
      );
    }
  }

  getLLM(): BaseLanguageModel {
    if (!this.llm) {
      throw new Error('Ollama provider not initialized. Call initialize() first.');
    }
    return this.llm;
  }
}
