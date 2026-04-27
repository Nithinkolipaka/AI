import { z } from 'zod';

/**
 * Validation schemas for request/response data
 * Using Zod for runtime type validation
 */

// Zod schema for User structured output
export const UserSchema = z.object({
  name: z.string().describe('Full name of the person'),
  email: z.string().email().describe('Email address'),
  age: z.number().int().positive().describe('Age in years'),
});

export type User = z.infer<typeof UserSchema>;

// Request schema for LLM chain input
export const LLMChainRequestSchema = z.object({
  prompt: z.string().min(1),
  provider: z
    .enum(['openai', 'ollama', 'gemini', 'claude'])
    .optional()
    .describe('Override default LLM provider'),
  streaming: z.boolean().optional().default(true),
});

export type LLMChainRequest = z.infer<typeof LLMChainRequestSchema>;

// Response schema
export const LLMChainResponseSchema = z.object({
  text: z.string(),
  structured: UserSchema.optional(),
  provider: z.string(),
  streamed: z.boolean(),
  tokensUsed: z.object({
    prompt: z.number().optional(),
    completion: z.number().optional(),
    total: z.number().optional(),
  }),
});

export type LLMChainResponse = z.infer<typeof LLMChainResponseSchema>;

/**
 * Validates a JSON string against the User schema
 * Used by structured output parser
 */
export function validateUserData(jsonString: string): User {
  try {
    const parsed = JSON.parse(jsonString);
    return UserSchema.parse(parsed);
  } catch (error) {
    throw new Error(`Invalid user data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validates incoming requests
 */
export function validateLLMRequest(data: unknown): LLMChainRequest {
  return LLMChainRequestSchema.parse(data);
}
