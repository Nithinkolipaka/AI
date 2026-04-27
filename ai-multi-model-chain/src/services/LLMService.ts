import { BaseLLMService } from './BaseLLMService';
import { StructuredOutputService } from './StructuredOutputService';
import { LLMProviderFactory } from './providers';
import { User } from '../models';
import { logger } from '../utils/logger';

/**
 * Main LLM Service
 * 
 * High-level interface for:
 * - Simple text generation
 * - Streaming responses
 * - Structured output extraction
 * - Provider switching
 */
export class LLMService {
  private currentProvider: BaseLLMService | null = null;
  private currentProviderName: string;

  constructor(provider?: 'openai' | 'ollama' | 'gemini' | 'claude') {
    this.currentProviderName = provider || 'openai';
    this.initializeProvider();
  }

  /**
   * Initialize the current provider
   */
  private initializeProvider(): void {
    try {
      this.currentProvider = LLMProviderFactory.createProvider(
        this.currentProviderName as any,
      );
      logger.info(`LLM Service initialized with ${this.currentProviderName}`);
    } catch (error) {
      logger.error(`Failed to initialize ${this.currentProviderName}`, error);
      throw error;
    }
  }

  /**
   * Switch to a different provider at runtime
   */
  switchProvider(provider: 'openai' | 'ollama' | 'gemini' | 'claude'): void {
    this.currentProviderName = provider;
    this.initializeProvider();
    logger.info(`Switched to ${provider} provider`);
  }

  /**
   * Get current provider info
   */
  getCurrentProvider(): { name: string; model: string } {
    if (!this.currentProvider) {
      throw new Error('Provider not initialized');
    }
    return {
      name: this.currentProvider.getProvider(),
      model: this.currentProvider.getModel(),
    };
  }

  /**
   * Generate simple text response
   *
   * Usage:
   * const response = await llmService.generateText('What is AI?');
   */
  async generateText(prompt: string): Promise<string> {
    if (!this.currentProvider) {
      throw new Error('Provider not initialized');
    }

    try {
      logger.debug('Generating text response');
      const response = await this.currentProvider.runSimpleChain(prompt);
      return response;
    } catch (error) {
      logger.error('Error generating text', error);
      throw error;
    }
  }

  /**
   * Stream text response
   *
   * Usage:
   * for await (const chunk of llmService.streamText('What is AI?')) {
   *   console.log(chunk);
   * }
   */
  async *streamText(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.currentProvider) {
      throw new Error('Provider not initialized');
    }

    logger.debug('Starting text stream');

    try {
      for await (const chunk of this.currentProvider.streamChain(prompt)) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Error streaming text', error);
      throw error;
    }
  }

  /**
   * Extract structured user data from text
   *
   * This demonstrates LCEL chains with output parsing:
   * - Builds typed chain with RunnableSequence
   * - Input validation
   * - LLM invocation
   * - Structured output parsing
   * - Type-safe response
   *
   * Usage:
   * const user = await llmService.extractUser(
   *   'My name is John Doe, email john@example.com, age 30'
   * );
   */
  async extractUser(text: string): Promise<User> {
    if (!this.currentProvider) {
      throw new Error('Provider not initialized');
    }

    try {
      logger.debug('Extracting structured user data');

      const chain = StructuredOutputService.buildUserExtractionChain(
        this.currentProvider.getLLM(),
      );

      const user = await chain.invoke(text);

      logger.debug('Successfully extracted user data', user);
      return user;
    } catch (error) {
      logger.error('Error extracting user', error);
      throw error;
    }
  }

  /**
   * Stream structured user data extraction
   *
   * Yields chunks as they arrive, then the parsed User object
   *
   * This shows the power of LCEL:
   * - Single chain definition
   * - Can be streamed or invoked
   * - Automatic type handling
   *
   * Usage:
   * for await (const item of llmService.streamExtractUser('...')) {
   *   if (item.type === 'chunk') {
   *     console.log('Token:', item.data);
   *   } else {
   *     console.log('Parsed user:', item.data);
   *   }
   * }
   */
  async *streamExtractUser(
    text: string,
  ): AsyncGenerator<{ type: 'chunk' | 'parsed'; data: string | User }, void, unknown> {
    if (!this.currentProvider) {
      throw new Error('Provider not initialized');
    }

    logger.debug('Starting structured user extraction stream');

    try {
      for await (const item of StructuredOutputService.streamUserExtraction(
        this.currentProvider.getLLM(),
        text,
      )) {
        yield item;
      }
    } catch (error) {
      logger.error('Error streaming user extraction', error);
      throw error;
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return LLMProviderFactory.getAvailableProviders();
  }

  /**
   * Check provider availability
   */
  isProviderAvailable(provider: string): boolean {
    return LLMProviderFactory.isProviderAvailable(provider);
  }
}

/**
 * Singleton instance
 * In production, consider using dependency injection
 */
let llmServiceInstance: LLMService | null = null;

export function getLLMService(): LLMService {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
}

export function initializeLLMService(provider?: 'openai' | 'ollama' | 'gemini' | 'claude'): LLMService {
  llmServiceInstance = new LLMService(provider);
  return llmServiceInstance;
}
