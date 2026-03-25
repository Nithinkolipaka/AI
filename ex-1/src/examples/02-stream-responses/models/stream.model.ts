/**
 * EXAMPLE 2: STREAM RESPONSES - Models (TypeScript)
 * 
 * Zod schemas for streaming request/response validation.
 */

import { z } from "zod";

export const streamResponseRequestSchema = z.object({
  prompt: z.string().min(1).max(2000),
  temperature: z.number().min(0).max(1).optional().default(0.8),
  model: z.string().optional().default("gpt-4-turbo-preview"),
});

export const streamChunkSchema = z.object({
  chunk: z.string(),
  sequence: z.number(),
});

export const streamCompletionSchema = z.object({
  status: z.literal("complete"),
  totalChunks: z.number(),
});

export type StreamResponseRequest = z.infer<typeof streamResponseRequestSchema>;
export type StreamChunk = z.infer<typeof streamChunkSchema>;

export function validateStreamRequest(data: unknown): StreamResponseRequest {
  return streamResponseRequestSchema.parse(data);
}
