# LangChain LCEL Examples - TypeScript & MongoDB

Complete production-ready TypeScript project demonstrating LangChain LCEL concepts with full MVC architecture, JWT authentication, MongoDB integration, activity logging, and error handling.

## 🎯 Project Overview

This project provides **4 comprehensive LCEL examples** with step-by-step comments explaining each line of code:

1. **Simple Chain** - Basic LCEL pattern: prompt → model → parser
2. **Stream Responses** - Real-time streaming with Server-Sent Events (SSE)
3. **Structured Output** - Extract typed objects from LLM responses
4. **LCEL vs Fetch** - Compare LCEL abstraction vs raw API calls

**Enterprise Features:**
- ✅ MVC Architecture (Models, Services, Controllers, Routes)
- ✅ JWT Authentication with User Registration/Login
- ✅ MongoDB Integration with Mongoose
- ✅ Activity Logging & Audit Trail
- ✅ Comprehensive Error Handling
- ✅ Request Logging & Debugging
- ✅ TypeScript with Full Type Safety
- ✅ Role-Based Access Control (RBAC)

## 📁 Project Structure

```
ex-1/
├── src/
│   ├── middleware/
│   │   ├── auth.middleware.ts           # JWT verification, role authorization
│   │
│   ├── utils/
│   │   ├── logger.ts                    # Centralized logging with file output
│   │   └── errors.ts                    # Custom error classes & standardization
│   │
│   ├── database/
│   │   └── mongodb.ts                   # MongoDB connection singleton
│   │
│   ├── auth/
│   │   ├── models/user.model.ts        # User schema & password hashing
│   │   ├── services/auth.service.ts    # Login, register, profile logic
│   │   ├── controllers/                # HTTP handlers
│   │   └── routes/index.route.ts       # Auth endpoints
│   │
│   ├── activity/
│   │   ├── models/activity.model.ts    # Activity audit trail schema
│   │   ├── services/activity.service.ts# Logging & analytics
│   │   └── middleware/                  # Auto-logging middleware
│   │
│   ├── examples/
│   │   ├── 01-simple-chain/
│   │   │   ├── models/chain.model.ts
│   │   │   ├── services/chain.service.ts
│   │   │   ├── controllers/chain.controller.ts
│   │   │   ├── routes/index.route.ts
│   │   │   └── index.ts (Server)
│   │   │
│   │   ├── 02-stream-responses/
│   │   ├── 03-structured-output/
│   │   └── 04-lcel-vs-fetch/
│   │
│   └── app.ts                           # Main Express server
│
├── package.json                         # Dependencies & scripts
├── tsconfig.json                        # TypeScript configuration
├── .env.example                         # Environment variables template
└── README.md                            # This file
```

## 🚀 Setup & Installation

### Prerequisites

- Node.js >= 18.0.0
- MongoDB (local or Atlas)
- OpenAI API Key

### 1. Clone & Install Dependencies

```bash
cd ex-1
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/lcel-examples

# OpenAI
OPENAI_API_KEY=sk-...your-api-key...

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=debug
```

### 3. Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas (Cloud):**
- Create cluster at https://www.mongodb.com/cloud/atlas
- Copy connection string to `MONGODB_URI`

### 4. Build & Run

```bash
# Development (with hot-reload)
npm run dev

# Production (compiled)
npm run build
npm start

# Run individual examples as standalone services:
npm run dev:1  # Simple Chain (port 3001)
npm run dev:2  # Stream Responses (port 3002)
npm run dev:3  # Structured Output (port 3003)
npm run dev:4  # LCEL vs Fetch (port 3004)
```

## 📚 API Endpoints

### Authentication (Public)

```bash
# Register new user
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "firstName": "John",
  "lastName": "Doe"
}

# Response:
{
  "status": "success",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "email": "..." }
}
```

```bash
# Login
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

# Response includes JWT token
```

### Protected Routes (Require Authentication)

All endpoints below require `Authorization` header:

```bash
Authorization: Bearer <your-jwt-token>
```

#### Example 1: Simple Chain

```bash
# Execute chain (blocking response)
POST /api/chains/simple/execute
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What is artificial intelligence?",
  "temperature": 0.7,
  "model": "gpt-4-turbo-preview"
}

# Stream chain response (real-time events)
GET /api/chains/simple/stream?question=What%20is%20AI&temperature=0.7
Authorization: Bearer <token>

# Response: Server-Sent Events stream
# Event format: data: {chunk, sequence, type}
```

#### Example 2: Stream Responses

```bash
# Get streaming response
GET /api/chains/stream?prompt=Explain%20machine%20learning&temperature=0.8
Authorization: Bearer <token>

# Server sends chunks in real-time
```

#### Example 3: Structured Output

```bash
# Extract structured data from LLM
POST /api/chains/structured/extract
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Machine Learning",
  "includeRelated": true
}

# Response: Typed object matching schema
{
  "topic": "Machine Learning",
  "answer": "...",
  "confidence": 8,
  "keyPoints": [...],
  "difficultyLevel": "intermediate",
  "relatedTopics": [...]
}
```

#### Example 4: LCEL vs Fetch

```bash
# Compare LCEL vs raw fetch approaches
POST /api/chains/compare
Authorization: Bearer <token>
Content-Type: application/json

{
  "question": "What is LCEL?",
  "method": "both"
}

# Response compares performance and code complexity
```

### User Profile & Activities

```bash
# Get current user profile
GET /api/profile
Authorization: Bearer <token>

# Get user's activity log
GET /api/activities?limit=50&skip=0
Authorization: Bearer <token>

# Admin: View all activities
GET /api/admin/activities?resource=chains
Authorization: Bearer <admin-token>
```

## 🔑 Key Concepts Explained

### LCEL (LangChain Expression Language)

LCEL provides a clean way to chain components together:

```typescript
// Components
const prompt = PromptTemplate.fromTemplate("...");
const model = new ChatOpenAI({ temperature: 0.7 });
const parser = new StringOutputParser();

// Chain them with pipe (|) operator
const chain = prompt.pipe(model).pipe(parser);

// Invoke
const result = await chain.invoke({ question: "..." });
```

**Data flows left-to-right:**
1. Input → Prompt formatting
2. Formatted prompt → LLM API call
3. LLM response → String parsing
4. Final output

### MVC Architecture

```
HTTP Request
    ↓
Route (maps URL to handler)
    ↓
Controller (HTTP concerns - receives request, calls service)
    ↓
Service (business logic - LCEL chains, database queries)
    ↓
Model (data validation - Zod schemas)
    ↓
Database/LLM API
    ↓
Response (formatted by controller)
```

**Each layer has single responsibility:**
- **Models**: Data validation & type definitions
- **Services**: Business logic & LCEL chains
- **Controllers**: HTTP request/response handling
- **Routes**: URL paths & endpoint mappings

### JWT Authentication Flow

```
1. User Registration/Login
   ├─ POST /api/auth/register
   ├─ Email → Check if exists
   ├─ Hash password with bcrypt
   ├─ Save user to MongoDB
   └─ Generate JWT token

2. Using Protected Routes
   ├─ Include token in header: Authorization: Bearer <token>
   ├─ Middleware verifies token signature
   ├─ Decode user data from token
   ├─ Continue to route handler
   └─ User data available in req.user

3. Token Structure (JWT)
   ├─ Header: { alg: "HS256", typ: "JWT" }
   ├─ Payload: { userId, email, role, exp }
   ├─ Signature: HMACSHA256(header.payload, secret)
   └─ Format: header.payload.signature
```

### Activity Logging

Automatically logs all API requests:

```typescript
// Captured data:
{
  userId: "...",
  action: "CREATE" | "READ" | "UPDATE" | "DELETE",
  resource: "chains" | "users" | etc,
  method: "POST" | "GET" | etc,
  statusCode: 200 | 400 | etc,
  metadata: {
    requestBody: "...",   // Sensitive fields redacted
    responseSize: 1024,
    duration: 234         // ms
  },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/...",
  createdAt: DateTime
}
```

Automatic cleanup: Activities older than 90 days are deleted (TTL index).

## 🎓 Learning Path

Work through examples in order:

### Step 1: Simple Chain (30 minutes)
- Learn basic LCEL syntax
- Understand prompt → model → parser pattern
- Blocking vs streaming execution

### Step 2: Stream Responses (20 minutes)
- Learn async generators
- Understand Server-Sent Events (SSE)
- Real-time response streaming

### Step 3: Structured Output (20 minutes)
- Learn StructuredOutputParser
- Type-safe LLM responses with Zod
- Error recovery with OutputFixingParser

### Step 4: LCEL vs Fetch (20 minutes)
- Compare LCEL abstraction vs raw API calls
- Understand LCEL benefits
- Performance implications

### Step 5: Full Stack (1 hour)
- Integrate examples into main application
- Use JWT authentication
- Monitor activities in MongoDB

## 🔐 Security Best Practices

1. **Never commit `.env`** - Use `.env.example` template
2. **Rotate JWT_SECRET** - Change in production regularly
3. **Validate all inputs** - Use Zod schemas
4. **Hash passwords** - Using bcryptjs (automatic)
5. **Rate limiting** - Consider adding middleware for production
6. **HTTPS only** - In production, enforce HTTPS
7. **CORS restrictions** - Limit to known domains
8. **Sensitive logging** - Passwords/tokens automatically redacted

## 🐛 Debugging

### Enable debug logging

```bash
LOG_LEVEL=debug npm run dev
```

### View logs

```bash
# Real-time logs:
tail -f logs/app-2024-03-25.log

# Search logs:
grep LCEL logs/app-*.log
grep ERROR logs/app-*.log
```

### Test endpoints with curl

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "firstName": "Test",
    "lastName": "User"
  }'

# Copy token from response

# Use protected endpoint
curl -X POST http://localhost:3000/api/chains/simple/execute \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is AI?"
  }'
```

## 📊 Database Schema

### Users Collection

```typescript
{
  _id: ObjectId
  email: string (unique, indexed)
  password: string (hashed)
  firstName: string
  lastName: string
  role: "user" | "admin"
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  lastLogin: Date
}
```

### Activities Collection

```typescript
{
  _id: ObjectId
  userId: ObjectId (indexed, references User)
  action: "CREATE" | "READ" | "UPDATE" | "DELETE"
  resource: string
  method: string
  statusCode: number
  metadata: object
  ipAddress: string
  userAgent: string
  createdAt: Date (TTL index - auto delete after 90 days)
}
```

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/

EXPOSE 3000
CMD ["node", "dist/app.js"]
```

```bash
docker build -t lcel-api .
docker run -p 3000:3000 --env-file .env lcel-api
```

### Environment Variables (Production)

```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
OPENAI_API_KEY=sk-...
JWT_SECRET=<generate-strong-random-string>
NODE_ENV=production
LOG_LEVEL=info
PORT=3000
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch
3. Add tests
4. Submit pull request

## ❓ FAQ

**Q: How do I get an OpenAI API key?**
A: Sign up at https://platform.openai.com, create API key in account settings.

**Q: Can I use a different database?**
A: Yes! Replace MongoDB with PostgreSQL/MySQL by changing models and database.ts

**Q: How do I add custom logging?**
A: Use the logger utility: `logger.info("message", "context", data)`

**Q: How do I extend examples?**
A: Create new files in examples/XX-name/ following the existing structure.

**Q: What's the maximum request size?**
A: Currently 10MB (configured in express.json middleware).

---

**Happy Learning! 🚀**

For more information about LangChain LCEL:
- https://python.langchain.com/docs/expression_language
- https://js.langchain.com/docs

For questions or issues, open a GitHub issue.
