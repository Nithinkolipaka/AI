/**
 * EXAMPLE 1: SIMPLE CHAIN - Models (TypeScript)
 * 
 * Zod schemas for request/response validation.
 * Ensures type safety at runtime and in TypeScript.
 */

import { z } from "zod";

/**
 * REQUEST SCHEMA
 * 
 * Defines the structure and validation rules for incoming requests.
 */
export const simpleChainRequestSchema = z.object({
  question: z
    .string()
    .min(1, "Question is required")
    .min(5, "Question must be at least 5 characters")
    .max(1000, "Question must not exceed 1000 characters")
    .describe("The question to answer"),

  temperature: z
    .number()
    .min(0, "Temperature must be at least 0")
    .max(1, "Temperature must not exceed 1")
    .optional()
    .default(0.7)
    .describe("Model creativity (0=deterministic, 1=creative)"),

  model: z
    .string()
    .optional()
    .default("GPT-3.5 Turbo")
    .describe("LLM model to use"),
});

/**
 * RESPONSE SCHEMA
 */
export const simpleChainResponseSchema = z.object({
  status: z.literal("success"),
  output: z.string().describe("The chain's output"),
  metadata: z.object({
    timestamp: z.string(),
    processingTime: z.number(),
    outputLength: z.number(),
    temperature: z.number(),
    model: z.string(),
  }),
});

/**
 * ERROR RESPONSE SCHEMA
 */
export const simpleChainErrorSchema = z.object({
  status: z.literal("error"),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
  timestamp: z.string(),
});

/**
 * EXPORT TYPESCRIPT TYPES
 * 
 * These types are automatically inferred from schemas.
 * Use them for type checking in services and controllers.
 */
export type SimpleChainRequest = z.infer<typeof simpleChainRequestSchema>;
export type SimpleChainResponse = z.infer<typeof simpleChainResponseSchema>;
export type SimpleChainError = z.infer<typeof simpleChainErrorSchema>;

/**
 * VALIDATORS
 * 
 * These functions validate data and return typed results.
 * Throw error if validation fails.
 */
export function validateSimpleChainRequest(data: unknown): SimpleChainRequest {
  return simpleChainRequestSchema.parse(data);
}

export function validateSimpleChainResponse(data: unknown): SimpleChainResponse {
  return simpleChainResponseSchema.parse(data);
}
