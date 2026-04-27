# Quick Start Guide

Get up and running in 5 minutes!

## 1. Install & Configure (2 min)

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env - add your API key:
# OPENAI_API_KEY=sk-...
# LLM_PROVIDER=openai
```

## 2. Start Services (1 min)

```bash
# Terminal 1: MongoDB (if using local)
mongod

# Terminal 2: API Server
npm run dev

# You should see:
# 🚀 Server started on http://localhost:3000
```

## 3. Try It Out (2 min)

### Option A: Simple curl test

```bash
curl -X POST http://localhost:3000/api/llm/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"What is AI?"}'
```

### Option B: Interactive CLI

```bash
npm run cli

# In CLI:
> text What is AI?
> extract John, john@ex.com, 30
> list-users
> exit
```

## Done! 🎉

You have:
- ✅ LLM chains with LCEL
- ✅ Streaming responses
- ✅ Structured output parsing
- ✅ REST API
- ✅ Interactive CLI
- ✅ Multiple provider support

## Next Steps

- Explore [EXAMPLES.md](./EXAMPLES.md) for more use cases
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand LCEL
- Check [README.md](./README.md) for full documentation
- Switch providers and test in [.env](./.env)

## Common Commands

```bash
npm run dev          # Start server
npm run cli          # Interactive CLI
npm run build        # Compile TypeScript
npm run type-check   # Check types
npm run lint         # Run linter
npm run clean        # Clean build
```

## Troubleshooting

**MongoDB connection failed?**
- Make sure MongoDB is running: `mongod`
- Or update `MONGODB_URI` in `.env` for cloud MongoDB

**API key errors?**
- Double-check your API keys in `.env`
- Make sure they haven't expired

**Ollama not connecting?**
- Start Ollama: `ollama serve`
- Pull a model: `ollama pull llama2`

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/llm/generate` | Generate text |
| POST | `/api/llm/extract-user` | Extract structured data |
| GET | `/api/users` | List users |
| GET | `/api/llm/providers` | Available providers |

Full docs at `http://localhost:3000/`

---

Happy coding! 🚀
