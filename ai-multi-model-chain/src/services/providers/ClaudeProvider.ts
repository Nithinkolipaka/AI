import { Anthropic } from '@anthropic-ai/sdk';
import { BaseLanguageModel } from '@langchain/core/language_model';
import { BaseLLMService } from '../BaseLLMService';
import { logger } from '../../utils/logger';

/**
 * Wrapper for Claude API to match BaseLanguageModel interface
 * 
 * Direct implementation using Anthropic SDK since
 * @langchain/anthropic may not have all features
 */
class ClaudeLLM implements BaseLanguageModel {
  lc_namespace = ['langchain', 'llms', 'claude'];
  lc_serializable = true;

  private client: Anthropic;
  private modelName: string;

  constructor(apiKey: string, modelName = 'claude-3-sonnet-20240229') {
    this.client = new Anthropic({ apiKey });
    this.modelName = modelName;
  }

  async invoke(input: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: input,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }
    throw new Error('Unexpected response type from Claude');
  }

  async *stream(input: string): AsyncGenerator<string> {
    const stream = await this.client.messages.create({
      model: this.modelName,
      max_tokens: 2048,
      stream: true,
      messages: [
        {
          role: 'user',
          content: input,
        },
      ],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  _llmType(): string {
    return 'claude';
  }
}

/**
 * Anthropic Claude LLM Provider Implementation
 * 
 * Supports:
 * - Claude 3 (Opus, Sonnet, Haiku)
 * - Streaming
 * - Extended thinking (in some models)
 */
export class ClaudeProvider extends BaseLLMService {
  constructor(apiKey: string, model = 'claude-3-sonnet-20240229') {
    super('claude', model);
    try {
      this.llm = new ClaudeLLM(apiKey, model);
      logger.info('Claude provider initialized');
    } catch (error) {
      logger.error('Failed to initialize Claude provider', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    if (this.llm) {
      logger.debug('Claude provider already initialized');
      return;
    }
    logger.info('Initializing Claude provider');
  }

  getLLM(): BaseLanguageModel {
    if (!this.llm) {
      throw new Error('Claude provider not initialized. Call initialize() first.');
    }
    return this.llm;
  }

  /**
   * Override stream to use Claude's native streaming
   */
  async *streamChain(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.llm) {
      await this.initialize();
    }

    logger.debug('Running Claude stream chain');

    const llm = this.llm as unknown as ClaudeLLM;
    try {
      for await (const chunk of (llm as any).stream(prompt)) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Error in Claude stream chain', error);
      throw error;
    }
  }
}
