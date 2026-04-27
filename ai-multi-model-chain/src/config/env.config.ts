import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Environment configuration
 * Centralizes all environment variable access with type safety
 */
export const envConfig = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-multi-model-chain',
  mongoDbName: process.env.MONGODB_DB_NAME || 'ai-multi-model-chain',

  // LLM Provider
  llmProvider: (process.env.LLM_PROVIDER || 'openai').toLowerCase() as
    | 'openai'
    | 'ollama'
    | 'gemini'
    | 'claude',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',

  // Ollama
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama2',

  // Gemini
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-pro',

  // Claude
  claudeApiKey: process.env.CLAUDE_API_KEY,
  claudeModel: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',

  // Features
  enableStreaming: process.env.ENABLE_STREAMING === 'true',
  enableHistory: process.env.ENABLE_HISTORY === 'true',

  // Validation
  validate() {
    const errors: string[] = [];

    if (this.nodeEnv === 'production' && !this.mongoUri) {
      errors.push('MONGODB_URI is required in production');
    }

    // Validate selected provider has required keys
    switch (this.llmProvider) {
      case 'openai':
        if (!this.openaiApiKey) {
          errors.push('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
        }
        break;
      case 'gemini':
        if (!this.geminiApiKey) {
          errors.push('GEMINI_API_KEY is required when LLM_PROVIDER=gemini');
        }
        break;
      case 'claude':
        if (!this.claudeApiKey) {
          errors.push('CLAUDE_API_KEY is required when LLM_PROVIDER=claude');
        }
        break;
      // Ollama doesn't require API key
    }

    if (errors.length > 0) {
      console.error('Configuration validation errors:');
      errors.forEach((error) => console.error(`  - ${error}`));
      process.exit(1);
    }
  },
};
