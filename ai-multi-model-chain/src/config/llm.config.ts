import { envConfig } from './env.config';
import { logger } from '../utils/logger';

/**
 * LLM Provider Configuration
 * Validates and stores configuration for the selected LLM provider
 */
export interface ILLMConfig {
  provider: 'openai' | 'ollama' | 'gemini' | 'claude';
  apiKey?: string;
  baseUrl?: string;
  model: string;
  streaming?: boolean;
}

export class LLMConfig {
  private static instance: ILLMConfig | null = null;

  static initialize(): ILLMConfig {
    if (this.instance) {
      return this.instance;
    }

    const config: ILLMConfig = {
      provider: envConfig.llmProvider,
      streaming: envConfig.enableStreaming,
    };

    switch (envConfig.llmProvider) {
      case 'openai':
        config.apiKey = envConfig.openaiApiKey;
        config.model = envConfig.openaiModel;
        logger.info(`Initialized OpenAI provider with model: ${config.model}`);
        break;

      case 'ollama':
        config.baseUrl = envConfig.ollamaBaseUrl;
        config.model = envConfig.ollamaModel;
        logger.info(`Initialized Ollama provider at ${config.baseUrl} with model: ${config.model}`);
        break;

      case 'gemini':
        config.apiKey = envConfig.geminiApiKey;
        config.model = envConfig.geminiModel;
        logger.info(`Initialized Gemini provider with model: ${config.model}`);
        break;

      case 'claude':
        config.apiKey = envConfig.claudeApiKey;
        config.model = envConfig.claudeModel;
        logger.info(`Initialized Claude provider with model: ${config.model}`);
        break;

      default:
        throw new Error(`Unknown LLM provider: ${envConfig.llmProvider}`);
    }

    this.instance = config;
    return config;
  }

  static getConfig(): ILLMConfig {
    if (!this.instance) {
      return this.initialize();
    }
    return this.instance;
  }

  static switchProvider(provider: 'openai' | 'ollama' | 'gemini' | 'claude'): ILLMConfig {
    // This allows runtime provider switching
    this.instance = null;
    const originalProvider = envConfig.llmProvider;
    (envConfig as any).llmProvider = provider;

    try {
      return this.initialize();
    } catch (error) {
      (envConfig as any).llmProvider = originalProvider;
      throw error;
    }
  }
}
