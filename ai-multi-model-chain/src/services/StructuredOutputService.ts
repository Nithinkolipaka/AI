import { OutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnableLambda } from '@langchain/core/runnables';
import { PromptTemplate } from '@langchain/core/prompts';
import { BaseLanguageModel } from '@langchain/core/language_model';
import { logger } from '../utils/logger';
import { User, UserSchema, extractJSON, sanitizeResponse, validateUserData } from '../utils';

/**
 * Custom Output Parser for structured user data
 *
 * This parser:
 * - Instructs the model to return JSON
 * - Extracts JSON from response
 * - Validates against Zod schema
 * - Returns typed User object
 *
 * Benefits of using OutputParser vs manual parsing:
 * - Composable with LCEL chains
 * - Consistent error handling
 * - Type safety
 * - Reusable across providers
 */
export class StructuredUserParser extends OutputParser<User> {
  lc_namespace = ['custom', 'parsers'];

  async parse(text: string): Promise<User> {
    logger.debug('Parsing structured output', { textLength: text.length });

    // Extract JSON from response
    const jsonStr = extractJSON(text);
    const sanitized = sanitizeResponse(jsonStr);

    // Validate and return typed object
    const userData = validateUserData(sanitized);
    logger.debug('Successfully parsed user data', userData);

    return userData;
  }

  getFormatInstructions(): string {
    return `You must return ONLY a valid JSON object with the following structure (no additional text):
{
  "name": "full name",
  "email": "email@example.com",
  "age": number
}

Important:
- Return ONLY valid JSON, no markdown, no code blocks
- Email must be valid format
- Age must be a positive number
- Name and email are required`;
  }
}

/**
 * Service for building structured output chains
 * Uses LCEL to compose prompt → model → parser
 */
export class StructuredOutputService {
  /**
   * Build a chain that extracts structured user data
   *
   * Chain flow:
   * 1. PromptTemplate: Adds extraction instructions
   * 2. LLM: Generates response with JSON
   * 3. StructuredUserParser: Validates and extracts User object
   *
   * This is what LCEL gives you:
   * - Composable: Each step is a Runnable
   * - Streamable: Can stream chunks while parsing
   * - Type-safe: Return type is known
   * - Testable: Each component can be tested independently
   * - Swappable: Change LLM without changing parser
   */
  static buildUserExtractionChain(
    llm: BaseLanguageModel,
  ): RunnableSequence<string, User> {
    const parser = new StructuredUserParser();

    // System prompt that instructs structured output
    const systemPrompt = `You are an expert data extraction assistant.
Extract user information from input text and return ONLY valid JSON.
${parser.getFormatInstructions()}`;

    const promptTemplate = PromptTemplate.fromTemplate(`${systemPrompt}

Input text:
{input}`);

    /**
     * LCEL Chain Construction
     * Each element in the array becomes a step in the sequence
     * Runnables can be:
     * - PromptTemplate: Formats input
     * - BaseLanguageModel: Generates text
     * - OutputParser: Parses output
     * - RunnableLambda: Custom functions
     */
    return RunnableSequence.from([
      promptTemplate,
      llm,
      parser,
    ]);
  }

  /**
   * Stream structured output with progress tracking
   * Yields chunks as they arrive, then full parsed object
   */
  static async *streamUserExtraction(
    llm: BaseLanguageModel,
    input: string,
  ): AsyncGenerator<
    { type: 'chunk' | 'parsed'; data: string | User },
    void,
    unknown
  > {
    const parser = new StructuredUserParser();
    const systemPrompt = `You are an expert data extraction assistant.
Extract user information from input text and return ONLY valid JSON.
${parser.getFormatInstructions()}`;

    const promptTemplate = PromptTemplate.fromTemplate(`${systemPrompt}

Input text:
{input}`);

    // Stream the raw LLM output first
    let fullText = '';

    logger.debug('Starting structured output stream');

    /**
     * Stream setup:
     * 1. Prompt is formatted
     * 2. LLM streams tokens
     * 3. Collect full response
     * 4. Parse into typed object
     */
    const chain = RunnableSequence.from([promptTemplate, llm]);

    for await (const chunk of await chain.stream(input)) {
      if (typeof chunk === 'string') {
        fullText += chunk;
        yield { type: 'chunk', data: chunk };
      }
    }

    // Parse collected text into structured data
    try {
      const parsed = await parser.parse(fullText);
      yield { type: 'parsed', data: parsed };
    } catch (error) {
      logger.error('Error parsing structured output', error);
      throw error;
    }
  }
}
