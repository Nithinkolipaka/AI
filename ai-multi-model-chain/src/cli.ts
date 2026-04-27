import * as readline from 'readline';
import { DatabaseConfig, envConfig, LLMConfig } from './config';
import { logger } from './utils/logger';
import { LLMService } from './services';
import { UserRepository } from './models';

/**
 * Interactive CLI for testing LLM chains locally
 * 
 * Features:
 * - Interactive prompt mode
 * - Provider switching
 * - Streaming responses
 * - Save extracted users to database
 */
class LLMCli {
  private llmService: LLMService;
  private rl: readline.Interface;
  private running = true;

  constructor() {
    this.llmService = new LLMService();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private async prompt(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  async run(): Promise<void> {
    console.clear();
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║     AI Multi-Model Chain - Interactive CLI             ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log('📝 Commands:');
    console.log('  text <prompt>         - Generate text');
    console.log('  extract <text>        - Extract user data');
    console.log('  stream <prompt>       - Stream text response');
    console.log('  stream-extract <text> - Stream user extraction');
    console.log('  switch <provider>     - Switch LLM provider');
    console.log('  list-users            - List extracted users');
    console.log('  providers             - Show available providers');
    console.log('  current               - Show current provider');
    console.log('  help                  - Show this help');
    console.log('  exit                  - Exit CLI\n');

    while (this.running) {
      try {
        const input = await this.prompt('> ');

        if (!input) continue;

        const [command, ...args] = input.split(' ');
        const arg = args.join(' ');

        switch (command.toLowerCase()) {
          case 'text':
            await this.handleGenerateText(arg);
            break;

          case 'extract':
            await this.handleExtractUser(arg);
            break;

          case 'stream':
            await this.handleStreamText(arg);
            break;

          case 'stream-extract':
            await this.handleStreamExtractUser(arg);
            break;

          case 'switch':
            await this.handleSwitchProvider(arg);
            break;

          case 'list-users':
            await this.handleListUsers();
            break;

          case 'providers':
            this.handleShowProviders();
            break;

          case 'current':
            this.handleShowCurrent();
            break;

          case 'help':
            console.log('See commands above');
            break;

          case 'exit':
            this.running = false;
            break;

          default:
            console.log(`Unknown command: ${command}`);
        }
      } catch (error) {
        logger.error('Error', error);
      }
    }

    this.close();
  }

  private async handleGenerateText(prompt: string): Promise<void> {
    if (!prompt) {
      console.log('Usage: text <prompt>');
      return;
    }

    console.log('\n⏳ Generating...\n');

    try {
      const response = await this.llmService.generateText(prompt);
      console.log('\n📝 Response:\n');
      console.log(response);
      console.log('\n');
    } catch (error) {
      logger.error('Error generating text', error);
    }
  }

  private async handleStreamText(prompt: string): Promise<void> {
    if (!prompt) {
      console.log('Usage: stream <prompt>');
      return;
    }

    console.log('\n⏳ Streaming...\n');

    try {
      process.stdout.write('📝 ');

      for await (const chunk of this.llmService.streamText(prompt)) {
        process.stdout.write(chunk);
      }

      console.log('\n\n');
    } catch (error) {
      logger.error('Error streaming text', error);
    }
  }

  private async handleExtractUser(text: string): Promise<void> {
    if (!text) {
      console.log('Usage: extract <text>');
      return;
    }

    console.log('\n⏳ Extracting...\n');

    try {
      const user = await this.llmService.extractUser(text);

      // Save to database
      await UserRepository.upsert({
        ...user,
        extractedFrom: text,
        provider: this.llmService.getCurrentProvider().name,
      });

      console.log('\n✅ User extracted and saved:\n');
      console.log(JSON.stringify(user, null, 2));
      console.log('\n');
    } catch (error) {
      logger.error('Error extracting user', error);
    }
  }

  private async handleStreamExtractUser(text: string): Promise<void> {
    if (!text) {
      console.log('Usage: stream-extract <text>');
      return;
    }

    console.log('\n⏳ Streaming extraction...\n');

    try {
      process.stdout.write('📝 ');

      let extractedUser = null;

      for await (const item of this.llmService.streamExtractUser(text)) {
        if (item.type === 'chunk') {
          process.stdout.write(item.data as string);
        } else {
          extractedUser = item.data;
        }
      }

      console.log('\n\n✅ User extracted:\n');
      console.log(JSON.stringify(extractedUser, null, 2));

      // Save to database
      if (extractedUser) {
        await UserRepository.upsert({
          ...extractedUser,
          extractedFrom: text,
          provider: this.llmService.getCurrentProvider().name,
        });
        console.log('\n💾 Saved to database\n');
      }
    } catch (error) {
      logger.error('Error streaming extraction', error);
    }
  }

  private async handleSwitchProvider(provider: string): Promise<void> {
    if (!provider) {
      console.log('Usage: switch <provider>');
      console.log('Available providers: openai, ollama, gemini, claude');
      return;
    }

    try {
      const validProviders = ['openai', 'ollama', 'gemini', 'claude'];
      if (!validProviders.includes(provider.toLowerCase())) {
        console.log('Invalid provider. Available: openai, ollama, gemini, claude');
        return;
      }

      this.llmService.switchProvider(provider as any);
      const current = this.llmService.getCurrentProvider();
      console.log(`\n✅ Switched to ${current.name} (${current.model})\n`);
    } catch (error) {
      logger.error('Error switching provider', error);
    }
  }

  private handleShowProviders(): void {
    const available = this.llmService.getAvailableProviders();
    console.log('\n📋 Available Providers:\n');
    available.forEach((name) => {
      const canUse = this.llmService.isProviderAvailable(name);
      const icon = canUse ? '✅' : '❌';
      console.log(`  ${icon} ${name}`);
    });
    console.log('');
  }

  private handleShowCurrent(): void {
    const current = this.llmService.getCurrentProvider();
    console.log(`\n🤖 Current Provider: ${current.name}`);
    console.log(`📦 Model: ${current.model}\n`);
  }

  private async handleListUsers(): Promise<void> {
    try {
      const users = await UserRepository.findAll(10, 0);

      if (users.length === 0) {
        console.log('\n📭 No users found\n');
        return;
      }

      console.log(`\n📋 Users (latest ${users.length}):\n`);
      users.forEach((user, i) => {
        console.log(`${i + 1}. ${user.name} <${user.email}> (${user.age}y)`);
      });
      console.log('');
    } catch (error) {
      logger.error('Error listing users', error);
    }
  }

  private close(): void {
    console.log('\n👋 Goodbye!\n');
    this.rl.close();
    DatabaseConfig.disconnect().then(() => {
      process.exit(0);
    });
  }
}

/**
 * Start CLI
 */
async function main(): Promise<void> {
  try {
    // Validate config
    envConfig.validate();

    // Connect to database
    await DatabaseConfig.connect();

    // Initialize LLM config
    LLMConfig.initialize();

    // Run CLI
    const cli = new LLMCli();
    await cli.run();
  } catch (error) {
    logger.error('Failed to start CLI', error);
    process.exit(1);
  }
}

main();
