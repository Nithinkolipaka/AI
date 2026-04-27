import {
  BaseLanguageModel,
  BaseLLMOutputParser,
  LLMResult,
  Generation,
} from '@langchain/core/language_model';
import {
  RunnableSequence,
  RunnablePassthrough,
  RunnableLambda,
} from '@langchain/core/runnables';
import { BaseOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { logger } from '../utils/logger';
import { User } from '../models';

/**
 * Abstract base service for all LLM providers
 * 
 * Key concepts:
 * - LCEL (LangChain Expression Language): Declarative chains using RunnableSequence
 * - Runnables: Consistent interface for LLMs, parsers, and custom functions
 * - Streaming: Built-in support for streaming responses
 * - vs raw fetch: LCEL chains are composable, type-safe, and handle streaming natively
 */
export abstract class BaseLLMService {
  protected llm: BaseLanguageModel | null = null;
  protected provider: string;
  protected model: string;

  constructor(provider: string, model: string) {
    this.provider = provider;
    this.model = model;
  }

  /**
   * Initialize the LLM instance
   * Must be implemented by subclasses
   */
  abstract initialize(): Promise<void>;

  /**
   * Get the LLM instance
   */
  abstract getLLM(): BaseLanguageModel;

  /**
   * Simple chain: prompt → model → output
   * Returns raw text response
   *
   * LCEL Benefits vs raw fetch:
   * - Chainable and composable
   * - Built-in streaming support
   * - Type-safe interfaces
   * - Automatic error handling
   */
  async runSimpleChain(prompt: string): Promise<string> {
    if (!this.llm) {
      await this.initialize();
    }

    /**
     * LCEL Chain Definition:
     * - RunnablePassthrough: Pass input through unchanged
     * - PromptTemplate: Format the prompt
     * - LLM: Send to model
     * - StringOutputParser: Extract text response
     *
     * | operator chains runnables together
     */
    const chain = RunnableSequence.from([
      RunnablePassthrough.assign({
        text: new RunnableLambda({ func: async (input: string) => input }),
      }),
      new RunnableLambda({
        func: async (input: { text: string }) => {
          const template = PromptTemplate.fromTemplate('You are a helpful assistant.\n\n{text}');
          return template.format({ text: input.text });
        },
      }),
      this.getLLM(),
      new StringOutputParser(),
    ]);

    logger.debug('Running simple chain', { provider: this.provider, model: this.model });

    try {
      const result = await chain.invoke(prompt);
      return result;
    } catch (error) {
      logger.error('Error in simple chain', error);
      throw error;
    }
  }

  /**
   * Stream chain: show tokens as they arrive
   *
   * Benefits:
   * - Real-time feedback to user
   * - Better UX for long responses
   * - Can be cancelled mid-stream
   */
  async *streamChain(prompt: string): AsyncGenerator<string, void, unknown> {
    if (!this.llm) {
      await this.initialize();
    }

    const chain = RunnableSequence.from([
      new RunnableLambda({
        func: async (input) => {
          const template = PromptTemplate.fromTemplate(
            'You are a helpful assistant.\n\n{text}',
          );
          return template.format({ text: input });
        },
      }),
      this.getLLM(),
      new StringOutputParser(),
    ]);

    logger.debug('Running stream chain', { provider: this.provider });

    try {
      for await (const chunk of await chain.stream(prompt)) {
        yield chunk;
      }
    } catch (error) {
      logger.error('Error in stream chain', error);
      throw error;
    }
  }

  /**
   * Get the provider name
   */
  getProvider(): string {
    return this.provider;
  }

  /**
   * Get the model name
   */
  getModel(): string {
    return this.model;
  }
}
