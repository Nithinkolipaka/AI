import { OpenAI } from '@langchain/openai';
import { BaseLanguageModel } from '@langchain/core/language_model';
import { BaseLLMService } from '../BaseLLMService';
import { logger } from '../../utils/logger';

/**
 * OpenAI LLM Provider Implementation
 * 
 * Supports:
 * - GPT-3.5-turbo
 * - GPT-4
 * - GPT-4-turbo
 * - Streaming
 */
export class OpenAIProvider extends BaseLLMService {
  constructor(apiKey: string, model = 'gpt-3.5-turbo') {
    super('openai', model);
    // Initialize once to validate API key
    this.llm = new OpenAI({
      openAIApiKey: apiKey,
      modelName: model,
      temperature: 0.7,
      streaming: true,
    });
  }

  async initialize(): Promise<void> {
    if (this.llm) {
      logger.debug('OpenAI provider already initialized');
      return;
    }

    // This would be called if needed, but we initialize in constructor
    logger.info('Initializing OpenAI provider');
  }

  getLLM(): BaseLanguageModel {
    if (!this.llm) {
      throw new Error('OpenAI provider not initialized. Call initialize() first.');
    }
    return this.llm;
  }
}
