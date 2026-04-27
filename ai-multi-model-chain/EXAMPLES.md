# Usage Examples

Practical examples for using the AI Multi-Model Chain project.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [REST API Examples](#rest-api-examples)
3. [CLI Examples](#cli-examples)
4. [Programmatic Usage](#programmatic-usage)
5. [Provider Switching](#provider-switching)
6. [Streaming Examples](#streaming-examples)
7. [Error Handling](#error-handling)

## Basic Setup

### Installation & Configuration

```bash
# Clone/navigate to project
cd ai-multi-model-chain

# Install dependencies
npm install

# Setup environment
cp .env.example .env

# Edit .env with your API keys
nano .env

# For OpenAI:
# OPENAI_API_KEY=sk-...
# LLM_PROVIDER=openai

# Start MongoDB (if using locally)
mongod &

# Build TypeScript
npm run build
```

## REST API Examples

Start the server:

```bash
npm run dev
```

### 1. Simple Text Generation

```bash
curl -X POST http://localhost:3000/api/llm/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain what machine learning is in one paragraph",
    "streaming": false
  }'
```

Response:
```json
{
  "text": "Machine learning is a subset of artificial intelligence...",
  "provider": {
    "name": "openai",
    "model": "gpt-3.5-turbo"
  }
}
```

### 2. Streaming Text Response

```bash
# Use curl -N for streaming
curl -N -X POST http://localhost:3000/api/llm/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Write a short story about AI",
    "streaming": true
  }' \
  -H "Accept: text/event-stream"
```

You'll see tokens arriving in real-time as Server-Sent Events:
```
data: {"chunk":"Once","type":"text"}

data: {"chunk":" upon","type":"text"}

data: {"chunk":" a","type":"text"}
...
```

### 3. Extract Structured User Data

```bash
curl -X POST http://localhost:3000/api/llm/extract-user \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Extract user info: My name is Sarah Johnson, email is sarah.j@example.com, and I am 28 years old"
  }'
```

Response:
```json
{
  "structured": {
    "name": "Sarah Johnson",
    "email": "sarah.j@example.com",
    "age": 28
  },
  "provider": {
    "name": "openai",
    "model": "gpt-3.5-turbo"
  },
  "saved": true
}
```

### 4. Stream User Extraction

```bash
curl -N -X POST http://localhost:3000/api/llm/extract-user \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "prompt": "Contact info: John Doe, john@example.com, age 35",
    "streaming": true
  }'
```

Response alternates between chunks and final parsed data:
```
data: {"chunk":"{\"name\":\"John","type":"chunk"}

data: {"chunk":" Doe\",\"email\":...","type":"chunk"}

data: {"type":"parsed","data":{"name":"John Doe","email":"john@example.com","age":35}}
```

### 5. List All Extracted Users

```bash
# Get first 10 users
curl "http://localhost:3000/api/users?limit=10&skip=0"

# Response:
{
  "data": [
    {
      "_id": "...",
      "name": "Sarah Johnson",
      "email": "sarah.j@example.com",
      "age": 28,
      "provider": "openai",
      "extractedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1,
  "limit": 10,
  "skip": 0
}
```

### 6. Get Specific User

```bash
curl http://localhost:3000/api/users/sarah.j@example.com
```

### 7. Get Users by Provider

```bash
# Get all users extracted by OpenAI
curl "http://localhost:3000/api/users/provider/openai?limit=20"

# Or by Claude
curl "http://localhost:3000/api/users/provider/claude"
```

### 8. Check Available Providers

```bash
curl http://localhost:3000/api/llm/providers
```

Response:
```json
{
  "providers": [
    { "name": "openai", "available": true },
    { "name": "ollama", "available": true },
    { "name": "gemini", "available": false },
    { "name": "claude", "available": true }
  ]
}
```

### 9. Get Current Provider Info

```bash
curl http://localhost:3000/api/llm/current
```

Response:
```json
{
  "provider": {
    "name": "openai",
    "model": "gpt-3.5-turbo"
  }
}
```

### 10. Delete Extracted User

```bash
curl -X DELETE http://localhost:3000/api/users/sarah.j@example.com
```

## CLI Examples

Start the interactive CLI:

```bash
npm run cli
```

### CLI Session

```
> text What is the capital of France?
⏳ Generating...

📝 Response:

The capital of France is Paris...

> extract John Doe works as a software engineer, email john@company.com, he's 32 years old
⏳ Extracting...

✅ User extracted and saved:

{
  "name": "John Doe",
  "email": "john@company.com",
  "age": 32
}

> stream Tell me a joke
⏳ Streaming...

📝 Why did the programmer quit his job? Because he didn't get arrays!

> stream-extract I'm Alice, alice@test.com, turning 25 next month
⏳ Streaming extraction...

📝 {"name":"Alice","email":"alice@test.com","age":25}

✅ User extracted:

{
  "name": "Alice",
  "email": "alice@test.com",
  "age": 25
}

💾 Saved to database

> providers
📋 Available Providers:

  ✅ openai
  ✅ ollama
  ✅ gemini
  ✅ claude

> switch claude
✅ Switched to claude (claude-3-sonnet-20240229)

> current
🤖 Current Provider: claude
📦 Model: claude-3-sonnet-20240229

> list-users
📋 Users (latest 2):

1. John Doe <john@company.com> (32y)
2. Alice <alice@test.com> (25y)

> exit
👋 Goodbye!
```

## Programmatic Usage

Use the project as a library in your own Node.js code:

### 1. Basic Text Generation

```typescript
import { initializeLLMService } from './src/services';

async function example() {
  const llmService = initializeLLMService('openai');
  
  const response = await llmService.generateText(
    'What is artificial intelligence?'
  );
  
  console.log(response);
}

example();
```

### 2. Streaming Responses

```typescript
import { LLMService } from './src/services';

async function streamExample() {
  const llmService = new LLMService('openai');
  
  console.log('🤖 ');
  
  for await (const chunk of llmService.streamText('Tell me a story')) {
    process.stdout.write(chunk);
  }
  
  console.log('\n✅ Done');
}

streamExample();
```

### 3. Structured Data Extraction

```typescript
import { initializeLLMService } from './src/services';

async function extractExample() {
  const llmService = initializeLLMService();
  
  const userData = await llmService.extractUser(
    'Contact: Emma Thompson, emma@example.com, age 31'
  );
  
  console.log('Extracted user:', userData);
  // Output: { name: 'Emma Thompson', email: 'emma@example.com', age: 31 }
  
  // User is already saved to MongoDB
}

extractExample();
```

### 4. Streaming Structured Extraction

```typescript
import { LLMService } from './src/services';

async function streamExtractExample() {
  const llmService = new LLMService();
  
  for await (const item of llmService.streamExtractUser(
    'Personal details: Mike Zhang, mike.z@corp.com, 40 years old'
  )) {
    if (item.type === 'chunk') {
      // Show streaming tokens
      process.stdout.write(item.data);
    } else {
      // Final parsed user object
      console.log('\n✅ Final result:', item.data);
    }
  }
}

streamExtractExample();
```

### 5. Multiple Users in Batch

```typescript
import { LLMService } from './src/services';
import { UserRepository } from './src/models';

async function batchExtractExample() {
  const llmService = new LLMService();
  
  const userTexts = [
    'Alice Johnson, alice@example.com, 26',
    'Bob Smith, bob@example.com, 34',
    'Carol White, carol@example.com, 29',
  ];
  
  for (const text of userTexts) {
    const user = await llmService.extractUser(text);
    console.log('Extracted:', user.name);
  }
  
  // Get all extracted users
  const allUsers = await UserRepository.findAll(100);
  console.log(`Total users in DB: ${allUsers.length}`);
}

batchExtractExample();
```

## Provider Switching

### 1. Runtime Switching

```typescript
import { LLMService } from './src/services';

async function providerSwitchExample() {
  const llmService = new LLMService('openai');
  
  // Generate with OpenAI
  let response = await llmService.generateText('Hello');
  console.log('OpenAI response length:', response.length);
  
  // Switch to Claude
  llmService.switchProvider('claude');
  
  // Generate with Claude (no other code changes)
  response = await llmService.generateText('Hello');
  console.log('Claude response length:', response.length);
  
  // Switch to Ollama (local)
  llmService.switchProvider('ollama');
  
  response = await llmService.generateText('Hello');
  console.log('Ollama response length:', response.length);
}

providerSwitchExample();
```

### 2. Check Available Providers

```typescript
import { LLMService } from './src/services';

const llmService = new LLMService();

const available = llmService.getAvailableProviders();
// ['openai', 'ollama', 'gemini', 'claude']

const hasApiKey = llmService.isProviderAvailable('gemini');
console.log('Gemini available?', hasApiKey);
```

### 3. Compare Providers

```typescript
import { LLMService } from './src/services';

async function compareProvidersExample() {
  const prompt = 'Explain quantum computing in one sentence';
  
  const providers = ['openai', 'claude', 'gemini'];
  
  for (const provider of providers) {
    try {
      const llmService = new LLMService();
      llmService.switchProvider(provider as any);
      
      const response = await llmService.generateText(prompt);
      console.log(`\n${provider.toUpperCase()}:`);
      console.log(response);
    } catch (error) {
      console.log(`${provider} not available:`, error.message);
    }
  }
}

compareProvidersExample();
```

## Streaming Examples

### 1. Real-time Display

```typescript
import { LLMService } from './src/services';
import { createWriteStream } from 'fs';

async function realTimeStreamExample() {
  const llmService = new LLMService();
  
  // Stream to stdout (console)
  console.log('🤖 Response: ');
  
  for await (const chunk of llmService.streamText(
    'Write a haiku about programming'
  )) {
    process.stdout.write(chunk);
  }
  
  console.log('\n✅ Done');
}

async function streamToFileExample() {
  const llmService = new LLMService();
  const file = createWriteStream('response.txt');
  
  for await (const chunk of llmService.streamText(
    'Write about the history of AI'
  )) {
    file.write(chunk);
  }
  
  file.end();
}

realTimeStreamExample();
```

### 2. Stream with Progress Tracking

```typescript
import { LLMService } from './src/services';

async function progressTrackingExample() {
  const llmService = new LLMService();
  
  let tokenCount = 0;
  let totalTime = Date.now();
  
  console.log('📊 Streaming with stats\n');
  
  for await (const chunk of llmService.streamText(
    'Tell me about machine learning'
  )) {
    tokenCount++;
    process.stdout.write(chunk);
    
    // Show stats every 50 tokens
    if (tokenCount % 50 === 0) {
      const elapsed = Date.now() - totalTime;
      const rate = (tokenCount / elapsed) * 1000;
      console.log(`\n\n⚡ ${rate.toFixed(1)} tokens/sec\n`);
    }
  }
  
  const totalElapsed = Date.now() - totalTime;
  const avgRate = (tokenCount / totalElapsed) * 1000;
  console.log(`\n\n📈 Total: ${tokenCount} tokens in ${(totalElapsed / 1000).toFixed(1)}s`);
  console.log(`⚡ Average: ${avgRate.toFixed(1)} tokens/sec`);
}

progressTrackingExample();
```

## Error Handling

### 1. Try-Catch Pattern

```typescript
import { LLMService } from './src/services';
import { logger } from './src/utils/logger';

async function errorHandlingExample() {
  const llmService = new LLMService();
  
  try {
    const response = await llmService.generateText('');
    // Empty prompt might fail
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to generate:', error.message);
      console.log('Error details:', error.stack);
    }
  }
}

errorHandlingExample();
```

### 2. Provider Fallback

```typescript
import { LLMService } from './src/services';

async function fallbackExample() {
  const primaryProvider = 'openai';
  const fallbackProvider = 'claude';
  
  let llmService = new LLMService(primaryProvider);
  
  try {
    const response = await llmService.generateText('Hello');
    console.log('Used primary provider');
    return response;
  } catch (error) {
    console.log(`Primary provider (${primaryProvider}) failed, trying ${fallbackProvider}`);
    
    llmService.switchProvider(fallbackProvider as any);
    
    try {
      const response = await llmService.generateText('Hello');
      console.log('Used fallback provider');
      return response;
    } catch (fallbackError) {
      console.error('Both providers failed');
      throw fallbackError;
    }
  }
}

fallbackExample();
```

### 3. Validation Error Handling

```typescript
import { validateLLMRequest } from './src/utils/validators';

async function validationExample() {
  const invalidInput = {
    prompt: '',  // Empty prompt
    streaming: 'true',  // Should be boolean
  };
  
  try {
    const validated = validateLLMRequest(invalidInput);
  } catch (error) {
    if (error instanceof Error) {
      console.log('Validation failed:', error.message);
      // Zod provides detailed error messages
    }
  }
}

validationExample();
```

---

For more information see:
- [README.md](./README.md) - Setup and quick start
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Design patterns and LCEL concepts
