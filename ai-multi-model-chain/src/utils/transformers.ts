/**
 * Output transformers
 * Utilities for transforming and extracting data from LLM responses
 */

/**
 * Extracts JSON from LLM response text
 * Handles cases where model wraps JSON in code blocks or additional text
 */
export function extractJSON(text: string): string {
  // Try to find JSON in code blocks first (```json ... ```)
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return text;
}

/**
 * Sanitizes LLM response text
 * Removes common prefixes/suffixes that models add
 */
export function sanitizeResponse(text: string): string {
  let sanitized = text;

  // Remove common markdown code block markers
  sanitized = sanitized.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');

  // Remove common intro/outro phrases
  sanitized = sanitized
    .replace(/^(here'?s?|certainly|of course)[^:]*:\s*/i, '')
    .replace(/^\s*\**\s*(?:json|output|result|data)\s*\**\s*:*\s*/i, '')
    .trim();

  return sanitized;
}

/**
 * Formats structured output for API responses
 */
export function formatStructuredOutput(structured: unknown): Record<string, unknown> {
  if (!structured) {
    return {};
  }

  if (typeof structured === 'object' && structured !== null) {
    return structured as Record<string, unknown>;
  }

  return {};
}

/**
 * Builds streaming response chunks for SSE (Server-Sent Events)
 */
export function formatStreamChunk(
  chunk: string,
  isStructured = false,
): {
  chunk: string;
  isStructured: boolean;
  timestamp: number;
} {
  return {
    chunk,
    isStructured,
    timestamp: Date.now(),
  };
}
