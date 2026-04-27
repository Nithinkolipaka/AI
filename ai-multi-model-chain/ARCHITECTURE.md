# Architecture Guide

Deep dive into the project structure, design patterns, and LCEL concepts.

## Table of Contents

1. [Project Structure](#project-structure)
2. [LCEL Fundamentals](#lcel-fundamentals)
3. [Service Layer Design](#service-layer-design)
4. [Data Flow](#data-flow)
5. [Provider System](#provider-system)
6. [Streaming Architecture](#streaming-architecture)
7. [Error Handling](#error-handling)

## Project Structure

### Configuration Layer (`src/config/`)

Handles all external configuration and initialization:

```
env.config.ts      - Environment variables with validation
db.config.ts       - MongoDB connection management  
llm.config.ts      - LLM provider configuration
```

**Key responsibilities:**
- Centralized configuration access
- Environment validation
- Singleton connections
- Provider initialization

### Model Layer (`src/models/`)

Data schemas and repository patterns:

```
User.ts            - MongoDB User schema + repository methods
```

**Design:**
- Mongoose schemas with validation
- Repository pattern for data access
- Type-safe queries

### Service Layer (`src/services/`)

Core business logic with LCEL chains:

```
BaseLLMService.ts              - Abstract LLM provider interface
LLMService.ts                  - Main facade over providers
StructuredOutputService.ts     - Custom output parser
├── OpenAIProvider.ts          - OpenAI implementation
├── OllamaProvider.ts          - Ollama implementation
├── GeminiProvider.ts          - Gemini implementation
└── ClaudeProvider.ts          - Claude implementation
```

**Architecture:**
- Abstract base class for common LLM operations
- Concrete providers implement specific APIs
- Factory pattern for provider creation
- LCEL chains for composable operations

### Controller Layer (`src/controllers/`)

HTTP request handlers:

```
LLMController      - Text generation & extraction endpoints
UserController     - User management endpoints
```

**Responsibilities:**
- Request validation
- Service orchestration
- Response formatting
- Error handling

### Route Layer (`src/routes/`)

API endpoint definitions:

```
routes/index.ts    - All endpoint mappings
```

### Utility Layer (`src/utils/`)

Shared utilities and helpers:

```
logger.ts          - Logging
validators.ts      - Zod schemas & validation
transformers.ts    - Response transformation
```

## LCEL Fundamentals

### What is LCEL?

LCEL is a declarative language for composing LLM applications. It provides:

1. **Runnables**: Composable units (prompts, LLMs, parsers)
2. **RunnableSequence**: Chains runnables together
3. **Streaming**: Native support for async iterators
4. **Type Safety**: Input/output types known at definition

### Basic Chain Example

```typescript
// Traditional approach (low-level)
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }]
  })
});
const { choices: [{ message: { content } }] } = await response.json();
console.log(content);

// LCEL approach (high-level, declarative)
const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate('You are helpful.\n\n{input}'),
  new OpenAI({ openAIApiKey }),
  new StringOutputParser(),
]);

const result = await chain.invoke({ input: prompt });
console.log(result);
```

**Advantages of LCEL:**
- ✅ Composable - chain any components
- ✅ Type-safe - input/output types known
- ✅ Streaming - `for await (const chunk of chain.stream(input))`
- ✅ Testable - each step independently
- ✅ Reusable - use same chain for invoke/stream

### Streaming with LCEL

```typescript
// Without LCEL (manual):
const stream = await openai.createChatCompletion({
  stream: true,
  messages: [{ role: 'user', content }]
});

for await (const message of stream) {
  process.stdout.write(message.choices[0]?.delta?.content || '');
}

// With LCEL (automatic):
const chain = RunnableSequence.from([
  promptTemplate,
  llm,
  new StringOutputParser(),
]);

for await (const chunk of await chain.stream(input)) {
  process.stdout.write(chunk);
}
```

LCEL chains automatically handle streaming - same definition works for both!

### Structured Output with LCEL

```typescript
// Custom parser implementing OutputParser interface
class UserParser extends OutputParser<User> {
  async parse(text: string): Promise<User> {
    const json = extractJSON(text);
    return UserSchema.parse(JSON.parse(json));
  }
  
  getFormatInstructions(): string {
    return 'Return JSON: {"name":"...", "email":"...", "age":...}';
  }
}

// Build chain with parser
const chain = RunnableSequence.from([
  PromptTemplate.fromTemplate(systemPrompt),
  llm,
  new UserParser(),  // <-- Handles parsing
]);

// Type-safe output!
const user: User = await chain.invoke(text);
```

## Service Layer Design

### BaseLLMService (Abstract)

Defines common interface for all providers:

```typescript
abstract class BaseLLMService {
  // Each provider must implement:
  abstract initialize(): Promise<void>;
  abstract getLLM(): BaseLanguageModel;
  
  // Common chains available to all:
  async runSimpleChain(prompt: string): Promise<string>
  async *streamChain(prompt: string): AsyncGenerator<string>
}
```

**Key decisions:**
- Abstract base prevents code duplication
- getLLM() returns LangChain BaseLanguageModel
- runSimpleChain() is LCEL-based
- streamChain() supports both invoke and stream

### Provider Implementations

Each provider wraps its SDK:

```typescript
class OpenAIProvider extends BaseLLMService {
  constructor(apiKey: string, model: string) {
    this.llm = new OpenAI({ openAIApiKey: apiKey, modelName: model });
  }
}

class GeminiProvider extends BaseLLMService {
  constructor(apiKey: string, model: string) {
    // Google SDK doesn't extend BaseLanguageModel
    // We wrap it to match interface
    this.llm = new GeminiLLM(apiKey, model);
  }
}
```

**Wrapper Pattern**: For providers without LangChain integration (Gemini, Claude), we create wrapper classes implementing BaseLanguageModel interface.

### LLMService (Facade)

High-level interface hiding provider complexity:

```typescript
class LLMService {
  private currentProvider: BaseLLMService;
  
  switchProvider(name: string) {
    this.currentProvider = LLMProviderFactory.create(name);
  }
  
  async generateText(prompt: string): Promise<string> {
    return this.currentProvider.runSimpleChain(prompt);
  }
  
  async extractUser(text: string): Promise<User> {
    const chain = StructuredOutputService
      .buildUserExtractionChain(this.currentProvider.getLLM());
    return chain.invoke(text);
  }
}
```

## Data Flow

### Text Generation Flow

```
HTTP Request
    ↓
LLMController.generateText()
    ↓
validateLLMRequest() → Zod validation
    ↓
LLMService.generateText()
    ↓
currentProvider.runSimpleChain()
    ↓
LCEL Chain:
  PromptTemplate → OpenAI → StringOutputParser
    ↓
Response formatted → JSON response
    ↓
HTTP Response
```

### Structured Extraction Flow

```
HTTP Request (with text)
    ↓
LLMController.extractUser()
    ↓
validateLLMRequest() → Zod validation
    ↓
LLMService.extractUser()
    ↓
StructuredOutputService.buildUserExtractionChain()
    ↓
LCEL Chain:
  PromptTemplate 
    → LLM (generates JSON)
    → StructuredUserParser (validates + parses)
    ↓
User object (typed!)
    ↓
UserRepository.upsert() → Save to MongoDB
    ↓
HTTP Response with User object
```

### Streaming Flow

```
HTTP Request with Accept: text/event-stream
    ↓
LLMController sets SSE headers
    ↓
for await (chunk of llmService.streamText(prompt))
    ↓
res.write(`data: ${JSON.stringify(chunk)}`)
    ↓
Browser receives Server-Sent Events
    ↓
UI updates in real-time
```

## Provider System

### Adding a New Provider

To add a new LLM provider (e.g., Qwen):

1. **Implement wrapper (if needed)**

```typescript
class QwenLLM implements BaseLanguageModel {
  // Implement LLM interface methods
  async invoke(input: string): Promise<string> { ... }
  async *stream(input: string): AsyncGenerator<string> { ... }
  _llmType(): string { return 'qwen'; }
}
```

2. **Create provider class**

```typescript
export class QwenProvider extends BaseLLMService {
  constructor(apiKey: string, model: string) {
    super('qwen', model);
    this.llm = new QwenLLM(apiKey, model);
  }
  
  async initialize(): Promise<void> { /* ... */ }
  getLLM(): BaseLanguageModel { return this.llm!; }
}
```

3. **Update factory**

```typescript
export class LLMProviderFactory {
  static createProvider(provider: string): BaseLLMService {
    switch (provider) {
      // ... existing cases
      case 'qwen':
        return new QwenProvider(envConfig.qwenApiKey, envConfig.qwenModel);
    }
  }
}
```

4. **Update .env.example**

```env
QWEN_API_KEY=your_key_here
QWEN_MODEL=qwen-plus
```

No other code changes needed!

## Streaming Architecture

### Server-Sent Events (SSE)

For streaming responses, we use SSE protocol:

```typescript
// Set proper headers
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');

// Stream chunks
for await (const chunk of llmService.streamText(prompt)) {
  res.write(`data: ${JSON.stringify({ chunk, type: 'text' })}\n\n`);
}

res.write(`data: [DONE]\n\n`);
res.end();
```

### Structured Streaming

Combine streaming with parsing:

```typescript
// Stream yields either chunks or final parsed object
for await (const item of llmService.streamExtractUser(text)) {
  if (item.type === 'chunk') {
    // Update UI with token
    updateTokenDisplay(item.data);
  } else if (item.type === 'parsed') {
    // Display final structured data
    displayUser(item.data);
  }
}
```

## Error Handling

### Validation Layer

```typescript
// Zod validation ensures type safety
const validated = validateLLMRequest(req.body);
// Throws ZodError if invalid
```

### Service Layer

```typescript
try {
  await provider.runSimpleChain(prompt);
} catch (error) {
  logger.error('LLM error', error);
  throw new Error(`Failed to generate: ${error.message}`);
}
```

### Controller Layer

```typescript
try {
  // ... request handling
} catch (error) {
  res.status(500).json({
    error: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

### Global Error Handler

```typescript
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(err.status || 500).json({
    error: err.message,
    status: err.status || 500
  });
});
```

## Design Patterns Used

1. **Singleton**: LLMService instance
2. **Factory**: LLMProviderFactory for provider creation
3. **Strategy**: Different providers implement same Interface
4. **Adapter**: Wrapper classes for non-LangChain SDKs
5. **Repository**: UserRepository for data access
6. **Middleware**: Express middleware pipeline
7. **Chain of Responsibility**: LCEL pipeline
