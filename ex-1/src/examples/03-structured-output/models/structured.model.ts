/**
 * EXAMPLE 3: STRUCTURED OUTPUT - Models (TypeScript)
 * 
 * Zod schemas for structured output with typed responses.
 */

import { z } from "zod";

/**
 * STRUCTURED ANSWER SCHEMA
 * 
 * Defines the exact structure of the LLM output.
 * StructuredOutputParser ensures responses match this schema.
 */
export const structuredAnswerSchema = z.object({
  topic: z.string().describe("The topic being answered"),
  answer: z.string().describe("Comprehensive answer"),
  confidence: z
    .number()
    .min(1)
    .max(10)
    .describe("Confidence level 1-10"),
  keyPoints: z
    .array(z.string())
    .describe("Key points from the answer"),
  needsMoreContext: z
    .boolean()
    .describe("Whether more information is needed"),
  difficultyLevel: z
    .enum(["beginner", "intermediate", "advanced"])
    .describe("Difficulty level of the answer"),
  relatedTopics: z
    .array(z.string())
    .describe("Related topics to explore"),
});

export const extractRequestSchema = z.object({
  topic: z.string().min(1),
  includeRelated: z.boolean().optional().default(true),
});

export type StructuredAnswer = z.infer<typeof structuredAnswerSchema>;
export type ExtractRequest = z.infer<typeof extractRequestSchema>;

export function validateStructuredAnswer(data: unknown): StructuredAnswer {
  return structuredAnswerSchema.parse(data);
}

export function validateExtractRequest(data: unknown): ExtractRequest {
  return extractRequestSchema.parse(data);
}
