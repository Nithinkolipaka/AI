# AI Multi-Model Chain

A production-ready Node.js application demonstrating **LCEL (LangChain Expression Language)**, **streaming responses**, and **structured output parsing** with support for multiple LLM providers (OpenAI, Ollama, Gemini, Claude).

## 🚀 Features

- **Multi-Provider Support**: Seamlessly switch between OpenAI, Ollama, Gemini, and Claude
- **LCEL Chains**: Type-safe, composable chains using LangChain's Expression Language
- **Streaming**: Real-time token streaming for better UX
- **Structured Output**: Extract typed objects with validation
- **REST API**: Express-based HTTP endpoints
- **CLI Interface**: Interactive command-line tool for testing
- **MongoDB Integration**: Persist extracted data
- **MVC Architecture**: Clean separation of concerns

## 📋 Prerequisites

- **Node.js** 18+ with npm or yarn
- **MongoDB** (local or cloud instance)
- **API Keys** (at least one):
  - OpenAI: https://platform.openai.com/api-keys
  - Google Gemini: https://makersuite.google.com/app/apikey
  - Anthropic Claude: https://console.anthropic.com
- **Ollama** (optional, for local LLMs): https://ollama.ai

## ⚙️ Setup

### 1. Install Dependencies

```bash
cd ai-multi-model-chain
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/ai-multi-model-chain

# Primary provider (openai, ollama, gemini, claude)
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-3.5-turbo

# Or Ollama (local)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama2

# Or Gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-pro

# Or Claude
CLAUDE_API_KEY=your_key_here
CLAUDE_MODEL=claude-3-sonnet-20240229
```

### 3. Start MongoDB

```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas - update MONGODB_URI with your connection string
```

### 4. Build TypeScript

```bash
npm run build
```

## 🎯 Quick Start

### Option A: REST API

```bash
# Development mode (with live reload)
npm run dev

# Production mode
npm run build
npm start
```

API runs on `http://localhost:3000`

**Test a request:**

```bash
# Generate text
curl -X POST http://localhost:3000/api/llm/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is machine learning?"}'

# Extract user data
curl -X POST http://localhost:3000/api/llm/extract-user \
  -H "Content-Type: application/json" \
  -d '{
    "prompt":"Extract user: John Doe, john@example.com, 30 years old"
  }'

# List extracted users
curl http://localhost:3000/api/users

# Get current provider
curl http://localhost:3000/api/llm/current
```

### Option B: Interactive CLI

```bash
npm run cli
```

Interactive commands:

```
text "What is AI?"              - Generate text
extract "John, john@ex.com, 30" - Extract user data
stream "Tell me a story"        - Stream response
stream-extract "..."            - Stream extraction
switch openai                   - Change provider
list-users                      - Show extracted users  
providers                       - Show available
current                         - Current provider
exit                            - Quit
```

## 📚 API Endpoints

### LLM Operations

**POST** `/api/llm/generate`
Generate text from prompt
```json
{
  "prompt": "What is AI?",
  "provider": "openai",      // optional
  "streaming": true          // optional
}
```

**POST** `/api/llm/extract-user`
Extract structured user data
```json
{
  "prompt": "John Doe, john@example.com, 30 years old",
  "streaming": true
}
```

**GET** `/api/llm/providers`
List available providers

**GET** `/api/llm/current`
Get current provider info

### User Management

**GET** `/api/users`
List all extracted users
- Query params: `limit`, `skip`

**GET** `/api/users/:email`
Get specific user

**GET** `/api/users/provider/:provider`
Get users by extraction provider

**DELETE** `/api/users/:email`
Delete user

**GET** `/api/stats`
Get statistics

## 🏗️ Architecture

```
src/
├── config/              # Configuration & environment
│   ├── env.config.ts   # Environment variables
│   ├── db.config.ts    # MongoDB setup
│   └── llm.config.ts   # LLM provider config
│
├── models/              # Data models
│   └── User.ts         # MongoDB User schema
│
├── services/            # Business logic
│   ├── BaseLLMService.ts           # Abstract LLM service
│   ├── LLMService.ts               # Main LLM service
│   ├── StructuredOutputService.ts  # Parser & extraction
│   └── providers/                  # Provider implementations
│       ├── OpenAIProvider.ts
│       ├── OllamaProvider.ts
│       ├── GeminiProvider.ts
│       └── ClaudeProvider.ts
│
├── controllers/         # HTTP handlers
│   └── index.ts        # LLMController, UserController
│
├── routes/              # API routes
│   └── index.ts
│
├── cli/                 # CLI interface
│   └── index.ts
│
├── utils/               # Utilities
│   ├── logger.ts
│   ├── validators.ts   # Zod schemas
│   └── transformers.ts # Output transformation
│
├── app.ts              # Express app setup
├── server.ts           # Server entry point
└── cli.ts              # CLI entry point
```

## 🔗 Understanding LCEL

### What is LCEL?

LCEL (LangChain Expression Language) is a declarative way to compose LLM chains:

```typescript
// LCEL chain: Prompt → Model → Parser
const chain = RunnableSequence.from([
  promptTemplate,           // Format input
  llm,                     // Call model
  outputParser,            // Parse output
]);

// Invoke (await full response)
const result = await chain.invoke(input);

// Stream (get tokens as they arrive)
for await (const chunk of await chain.stream(input)) {
  console.log(chunk);
}
```

### Benefits vs Raw fetch()

| Feature | LCEL | Raw fetch() |
|---------|------|------------|
| **Composable** | ✅ Chain multiple steps | ❌ Manual composition |
| **Type-safe** | ✅ Known input/output types | ❌ Need manual validation |
| **Streaming** | ✅ Built-in support | ❌ Need async iteration |
| **Error handling** | ✅ Consistent | ❌ Per-endpoint |
| **Testability** | ✅ Each step independently | ❌ Full integration |
| **Provider agnostic** | ✅ Same code, different LLMs | ❌ Provider-specific |

### Example: Structured Output

```typescript
// LCEL handles the full pipeline
const chain = StructuredOutputService.buildUserExtractionChain(llm);

// Single invoke call
const user: User = await chain.invoke(text);
// Returns: { name, email, age } - fully typed!

// Same chain can stream
for await (const item of StructuredOutputService.streamUserExtraction(llm, text)) {
  if (item.type === 'chunk') {
    console.log('Token:', item.data);  // Streaming response
  } else {
    console.log('Parsed:', item.data); // Final User object
  }
}
```

## 🔄 Switching Providers

Same code works with any provider:

### Runtime Switching

```typescript
const llmService = new LLMService('openai');

// Generate with OpenAI
let response = await llmService.generateText('...');

// Switch to Claude
llmService.switchProvider('claude');

// Same method now uses Claude
response = await llmService.generateText('...');
```

### Config-based Switching

Update `.env`:
```env
LLM_PROVIDER=claude
CLAUDE_API_KEY=your_key
```

Restart server - no code changes needed!

## 📊 Using Streaming

### REST API Streaming

```bash
curl -N http://localhost:3000/api/llm/generate \
  -H "Accept: text/event-stream" \
  -d '{"prompt":"Story about AI", "streaming":true}'
```

### Programmatic Streaming

```typescript
// Stream text
for await (const chunk of llmService.streamText(prompt)) {
  process.stdout.write(chunk); // Print tokens as they arrive
}

// Stream with structured extraction
for await (const item of llmService.streamExtractUser(text)) {
  if (item.type === 'chunk') {
    console.log('Token:', item.data);
  } else {
    // Final parsed User object
    console.log('User:', item.data);
  }
}
```

## 🛠️ Development

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Clean Build

```bash
npm run clean
npm run build
```

## 📦 Key Dependencies

- **@langchain/core**: LCEL chains and runnables
- **@langchain/openai**: OpenAI integration
- **@langchain/community**: Ollama and other providers
- **anthropic**: Claude API
- **@google/generative-ai**: Gemini API
- **mongoose**: MongoDB ORM
- **zod**: Runtime validation
- **express**: HTTP server

## 🚨 Troubleshooting

### "Provider not initialized"

Make sure environment variables are set and `.env` file exists.

### Ollama connection failed

Ensure Ollama is running:
```bash
ollama serve
```

Then download a model:
```bash
ollama pull llama2
```

### MongoDB connection error

1. Ensure MongoDB is running locally or update `MONGODB_URI`
2. If using MongoDB Atlas, ensure IP is whitelisted

### API Key errors

Double-check API keys in `.env` - they're invalid or expired.

## 📝 Examples

See [EXAMPLES.md](./EXAMPLES.md) for detailed usage examples.

## 🔐 Security Notes

- Never commit `.env` files
- Rotate API keys regularly
- Use environment variables for sensitive data
- Validate all user inputs
- Rate limit API endpoints in production
- Use HTTPS in production

## 📄 License

MIT

## 🤝 Contributing

Ideas and improvements welcome!
