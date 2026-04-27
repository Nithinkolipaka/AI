import { GoogleGenerativeAI } from '@google/generative-ai';
import { BaseLanguageModel } from '@langchain/core/language_model';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { BaseLLMService } from '../BaseLLMService';
import { logger } from '../../utils/logger';

/**
 * Wrapper for Google Gemini API to match BaseLanguageModel interface
 * 
 * LangChain doesn't have built-in Gemini support in all versions,
 * so we create a wrapper that implements the LLM interface
 */
class GeminiLLM implements BaseLanguageModel {
  lc_namespace = ['langchain', 'llms', 'gemini'];
  lc_serializable = true;

  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName = 'gemini-pro') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async invoke(input: string): Promise<string> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContent(input);
    const response = result.response;
    return response.text();
  }

  async *stream(input: string): AsyncGenerator<string> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const result = await model.generateContentStream(input);

    for await (const chunk of result.stream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  }

  _llmType(): string {
    return 'gemini';
  }
}

/**
 * Google Gemini LLM Provider Implementation
 * 
 * Supports:
 * - Gemini Pro
 * - Streaming
 * - Multi-turn conversations
 */
export class GeminiProvider extends BaseLLMService {
  constructor(apiKey: string, model = 'gemini-pro') {
    super('gemini', model);
    try {
      this.llm = new GeminiLLM(apiKey, model);
      logger.info('Gemini provider initialized');
    } catch (error) {
      logger.error('Failed to initialize Gemini provider', error);
      throw error;
    }
  }

  async initialize(): Promise<void> {
    if (this.llm) {
      logger.debug('Gemini provider already initialized');
      return;
    }
    logger.info('Initializing Gemini provider');
  }

  getLLM(): BaseLanguageModel {
    if (!this.llm) {
      throw new Error('Gemini provider not initialized. Call initialize() first.');
    }
    return this.llm;
  }

  /**
   * Override stream to use Gemini's native streaming
   */
  async *streamChain(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.llm) {
      await this.initialize();
    }

    logger.debug('Running Gemini stream chain');

    const llm = this.llm as unknown as GeminiLLM;
    try {
      for await (const chunk of (llm as any).stream(prompt)) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Error in Gemini stream chain', error);
      throw error;
    }
  }
}
