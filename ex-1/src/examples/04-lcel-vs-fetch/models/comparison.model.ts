/**
 * EXAMPLE 4: LCEL vs FETCH - Models (TypeScript)
 * 
 * Schemas for comparing LCEL vs raw fetch approaches.
 */

import { z } from "zod";

export const comparisonRequestSchema = z.object({
  question: z.string().min(5).max(1000),
  method: z.enum(["lcel", "fetch", "both"]).default("both"),
  temperature: z.number().min(0).max(1).optional().default(0.7),
  model: z.string().optional().default("gpt-4-turbo-preview"),
});

export const benchmarkSchema = z.object({
  method: z.enum(["lcel", "fetch"]),
  responseTime: z.number(),
  success: z.boolean(),
  error: z.string().optional(),
});

export const comparisonResultSchema = z.object({
  status: z.enum(["success", "error"]),
  results: z.array(benchmarkSchema),
  summary: z.object({
    faster: z.string(),
    timeDifference: z.number(),
    advantages: z.array(z.string()),
  }).optional(),
});

export type ComparisonRequest = z.infer<typeof comparisonRequestSchema>;
export type Benchmark = z.infer<typeof benchmarkSchema>;

export function validateComparisonRequest(data: unknown): ComparisonRequest {
  return comparisonRequestSchema.parse(data);
}
