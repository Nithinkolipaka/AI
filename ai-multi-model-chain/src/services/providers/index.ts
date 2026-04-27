import { OpenAIProvider } from './OpenAIProvider';
import { OllamaProvider } from './OllamaProvider';
import { GeminiProvider } from './GeminiProvider';
import { ClaudeProvider } from './ClaudeProvider';
import { BaseLLMService } from '../BaseLLMService';
import { envConfig } from '../../config/env.config';
import { logger } from '../../utils/logger';

/**
 * Provider Factory
 * 
 * Creates LLM provider instances based on configuration
 * Allows easy switching between providers without changing application code
 */
export class LLMProviderFactory {
  /**
   * Create provider instance based on configuration
   */
  static createProvider(
    provider?: 'openai' | 'ollama' | 'gemini' | 'claude',
  ): BaseLLMService {
    const selectedProvider = provider || envConfig.llmProvider;

    logger.info(`Creating ${selectedProvider} provider instance`);

    switch (selectedProvider) {
      case 'openai':
        if (!envConfig.openaiApiKey) {
          throw new Error('OPENAI_API_KEY not set');
        }
        return new OpenAIProvider(envConfig.openaiApiKey, envConfig.openaiModel);

      case 'ollama':
        return new OllamaProvider(envConfig.ollamaBaseUrl, envConfig.ollamaModel);

      case 'gemini':
        if (!envConfig.geminiApiKey) {
          throw new Error('GEMINI_API_KEY not set');
        }
        return new GeminiProvider(envConfig.geminiApiKey, envConfig.geminiModel);

      case 'claude':
        if (!envConfig.claudeApiKey) {
          throw new Error('CLAUDE_API_KEY not set');
        }
        return new ClaudeProvider(envConfig.claudeApiKey, envConfig.claudeModel);

      default:
        throw new Error(`Unknown LLM provider: ${selectedProvider}`);
    }
  }

  /**
   * Get available providers
   */
  static getAvailableProviders(): string[] {
    return ['openai', 'ollama', 'gemini', 'claude'];
  }

  /**
   * Check if provider is available (has API key or connection)
   */
  static isProviderAvailable(provider: string): boolean {
    switch (provider) {
      case 'openai':
        return !!envConfig.openaiApiKey;
      case 'gemini':
        return !!envConfig.geminiApiKey;
      case 'claude':
        return !!envConfig.claudeApiKey;
      case 'ollama':
        return true; // Always available if server configured
      default:
        return false;
    }
  }
}
