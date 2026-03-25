/**
 * EXAMPLE 1: SIMPLE CHAIN - Service (TypeScript)
 * 
 * ============================================================
 * CONCEPT: Build a simple chain: prompt → model → output parser
 * ============================================================
 * 
 * This service demonstrates the fundamental LCEL pattern:
 * 1. Create a PromptTemplate (format input for LLM)
 * 2. Initialize ChatOpenAI (the language model)
 * 3. Create StringOutputParser (convert output to text)
 * 4. Pipe them together using LCEL syntax
 * 5. Invoke the chain with input
 * 
 * LCEL = LangChain Expression Language
 * The "|" operator chains components together.
 * Data flows left-to-right through the pipeline.
 */

import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { validateSimpleChainRequest, type SimpleChainRequest } from "../models/chain.model.js";
import { logger } from "../../../utils/logger.js";
import { ExternalServiceError } from "../../../utils/errors.js";

/**
 * SIMPLE CHAIN SERVICE CLASS
 */
export class SimpleChainService {
  private promptTemplate: PromptTemplate | null = null;
  private model: ChatOpenAI | null = null;
  private outputParser: StringOutputParser | null = null;
  private chain: any = null;

  /**
   * CONSTRUCTOR
   */
  constructor(private debug: boolean = false) {}

  /**
   * ============================================================
   * INITIALIZE COMPONENTS
   * ============================================================
   * 
   * This method sets up the three components of our chain.
   * Called once and reused for multiple invocations (performance optimization).
   */
  private initializeComponents(
    temperature: number,
    model: string
  ): void {
    if (this.debug) {
      logger.debug(
        `[Chain] Initializing with temperature=${temperature}, model=${model}`,
        "SimpleChainService"
      );
    }

    /**
     * STEP 1: CREATE PROMPT TEMPLATE
     * 
     * PromptTemplate formats user input into a string the LLM understands.
     * Placeholders (in {brackets}) are replaced with actual values.
     * 
     * This template:
     * - Sets system context: "You are a helpful assistant"
     * - Defines the actual question format
     * - Keeps the format consistent across invocations
     */
    this.promptTemplate = PromptTemplate.fromTemplate(
      `You are a helpful assistant that provides clear, accurate answers.

Question: {question}

Answer:`
    );

    if (this.debug) {
      logger.debug("[Chain] Prompt template created", "SimpleChainService");
    }

    /**
     * STEP 2: INITIALIZE THE LANGUAGE MODEL
     * 
     * ChatOpenAI manages the connection to OpenAI's API.
     * 
     * Parameters:
     * - temperature: Controls randomness of responses
     *   0.0 = deterministic (always same answer)
     *   1.0 = creative (varied answers)
     *   Default 0.7 = balanced
     * 
     * - model: Which model to use
     *   "gpt-4-turbo-preview" = faster, cheeper than GPT-4
     *   "gpt-3.5-turbo" = even faster/cheaper but less capable
     * 
     * Uses OPENAI_API_KEY from environment automatically.
     */
    this.model = new ChatOpenAI({
      temperature,
      model,
    });

    if (this.debug) {
      logger.debug("[Chain] Language model initialized", "SimpleChainService");
    }

    /**
     * STEP 3: CREATE OUTPUT PARSER
     * 
     * StringOutputParser converts the LLM's output to plain text.
     * 
     * LLMs return complex objects with metadata:
     * {
     *   message: { content: "...", role: "assistant" },
     *   metadata: { usage: { tokens: 123 } },
     *   ...
     * }
     * 
     * StringOutputParser extracts just the text content.
     */
    this.outputParser = new StringOutputParser();

    if (this.debug) {
      logger.debug("[Chain] Output parser created", "SimpleChainService");
    }

    /**
     * STEP 4: PIPE COMPONENTS TOGETHER
     * 
     * ============================================================
     * THIS IS THE CORE OF LCEL!
     * ============================================================
     * 
     * The pipe operator (|) chains components:
     * prompt | model | parser
     * 
     * Data flows left-to-right:
     * 1. Input goes to prompt
     * 2. Prompt output goes to model
     * 3. Model output goes to parser
     * 4. Parser output is returned to caller
     * 
     * Each component's output matches the next component's input.
     * LCEL ensures type compatibility automatically.
     * 
     * Example flow:
     * - Input: { question: "What is AI?" }
     * - After prompt: "You are helpful...\nQuestion: What is AI?\n\nAnswer:"
     * - After model: { content: "AI is...", role: "assistant" }
     * - After parser: "AI is..."
     */
    this.chain = this.promptTemplate.pipe(this.model).pipe(this.outputParser);

    if (this.debug) {
      logger.debug("[Chain] Chain created successfully", "SimpleChainService");
    }
  }

  /**
   * ============================================================
   * EXECUTE CHAIN
   * ============================================================
   * 
   * Main method that runs the chain and returns the result.
   */
  async executeChain(input: SimpleChainRequest | any): Promise<any> {
    const startTime = Date.now();

    try {
      /**
       * STEP 1: VALIDATE INPUT
       * 
       * Use Zod schema to ensure input is correct.
       * Throws error if validation fails (prevents API waste).
       */
      const validatedInput = validateSimpleChainRequest(input);

      if (this.debug) {
        logger.debug(
          `[Chain] Input validated: ${validatedInput.question.substring(0, 50)}...`,
          "SimpleChainService"
        );
      }

      /**
       * STEP 2: INITIALIZE CHAIN COMPONENTS
       * 
       * Set up prompt, model, and parser with specified parameters.
       */
      this.initializeComponents(
        validatedInput.temperature,
        validatedInput.model
      );

      if (this.debug) {
        logger.debug("[Chain] Invoking chain...", "SimpleChainService");
      }

      /**
       * ============================================================
       * STEP 3: INVOKE THE CHAIN
       * ============================================================
       * 
       * This is where the actual work happens!
       * 
       * chain.invoke() calls:
       * 1. prompt.invoke({ question: ... })
       *    → Formats the prompt template
       * 2. model.invoke(formatted_prompt)
       *    → Sends to OpenAI API
       *    → Waits for response
       * 3. parser.invoke(model_response)
       *    → Extracts text from response
       * 
       * The entire pipeline completes before returning.
       * This is "blocking" - request waits for full response.
       */
      const output = await this.chain.invoke({
        question: validatedInput.question,
      });

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      if (this.debug) {
        logger.debug(
          `[Chain] Execution complete: ${processingTime}ms, ${output.length} chars`,
          "SimpleChainService"
        );
      }

      /**
       * RETURN FORMATTED RESULT
       */
      return {
        status: "success",
        output,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTime,
          outputLength: output.length,
          temperature: validatedInput.temperature,
          model: validatedInput.model,
        },
      };
    } catch (error: any) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      logger.error(
        `[Chain] Execution failed: ${error.message}`,
        "SimpleChainService",
        error
      );

      /**
       * ERROR HANDLING
       * 
       * Convert various errors to standardized format.
       */
      let errorMessage = error.message;

      if (error.code === "INVALID_REQUEST_MODEL") {
        errorMessage = `Model not found: ${(input as any).model}`;
      } else if (error.status === 429) {
        errorMessage = "Rate limited by OpenAI API";
      } else if (error.status === 401) {
        errorMessage = "Invalid OpenAI API key";
      }

      throw new ExternalServiceError("OpenAI", errorMessage);
    }
  }

  /**
   * ============================================================
   * STREAM CHAIN
   * ============================================================
   * 
   * Streams response in real-time instead of waiting for completion.
   * Returns an async generator that yields chunks.
   * 
   * Use cases:
   * - Long-running requests (show response as it arrives)
   * - Improved UX (don't show loading spinner)
   * - Streaming to SSE, WebSocket, or WebRTC
   */
  async *streamChain(input: SimpleChainRequest | any): AsyncGenerator<string> {
    try {
      const validatedInput = validateSimpleChainRequest(input);

      this.initializeComponents(
        validatedInput.temperature,
        validatedInput.model
      );

      if (this.debug) {
        logger.debug("[Chain] Starting stream...", "SimpleChainService");
      }

      /**
       * STREAM VS INVOKE
       * 
       * stream() instead of invoke() returns chunks as they arrive.
       * The LLM generates tokens one at a time.
       * We receive and yield each token/chunk.
       */
      const stream = await this.chain.stream({
        question: validatedInput.question,
      });

      /**
       * YIELD EACH CHUNK
       * 
       * Async generator pattern allows consumer to get updates.
       * Can be used with Server-Sent Events (SSE).
       */
      for await (const chunk of stream) {
        yield chunk;
      }

      if (this.debug) {
        logger.debug("[Chain] Stream complete", "SimpleChainService");
      }
    } catch (error: any) {
      logger.error(
        `[Chain] Stream failed: ${error.message}`,
        "SimpleChainService",
        error
      );
      yield `Error: ${error.message}`;
    }
  }

  /**
   * HEALTH CHECK
   */
  getHealth(): any {
    return {
      status: "healthy",
      service: "Simple Chain Service",
      timestamp: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const simpleChainService = new SimpleChainService(
  process.env.DEBUG === "true"
);

export default simpleChainService;
