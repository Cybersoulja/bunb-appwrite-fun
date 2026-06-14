# CLAUDE.MD - Project Guide

## Project Overview

This is an **AI-powered Code Generator** built as an Appwrite Function using **Bun** runtime and **Ollama** for local LLM inference. It generates code, tests, and documentation from natural language descriptions.

### Technology Stack
- **Runtime**: Bun (1.0+)
- **Language**: TypeScript
- **Platform**: Appwrite Functions
- **SDK**: node-appwrite (v9.0.0)
- **AI**: Ollama (CodeLlama model)

## Project Structure

```
bunb-appwrite-fun/
├── functions/
│   └── firstfunction/
│       ├── src/
│       │   ├── main.ts          # Main function entry point & routing
│       │   ├── types.ts         # TypeScript type definitions
│       │   ├── ollama.ts        # Ollama client & prompt builders
│       │   └── appwrite.ts      # Appwrite Database & Storage service
│       ├── package.json          # Function dependencies
│       ├── bun.lockb            # Bun lock file
│       ├── .env.example         # Environment variable template
│       ├── EXAMPLES.md          # API usage examples
│       ├── APPWRITE_SETUP.md    # Appwrite Database setup guide
│       └── README.md            # Function-specific docs
├── README.md                     # Project documentation
└── CLAUDE.MD                     # This file
```

## Key Files

### `/functions/firstfunction/src/main.ts`
The main function handler with routing logic. Exports a default async function that receives:
- `req`: Request object containing HTTP request data
- `res`: Response object with helpers (`send()`, `json()`)
- `log`: Logging function
- `error`: Error logging function

**Current Implementation**:
- `GET /`: Health check and API information
- `GET /health`: Ollama and Appwrite availability check
- `POST /api/code/generate`: AI code generation endpoint
- `GET /api/stats`: Generation analytics and statistics
- `GET /api/history`: Recent generation history
- `GET /api/history/search`: Search previous generations
- `GET /api/history/:id`: Retrieve specific generation by ID

### `/functions/firstfunction/src/types.ts`
TypeScript type definitions for:
- Appwrite request/response interfaces
- Code generation request/response schemas
- Ollama API types
- Supported programming languages

### `/functions/firstfunction/src/ollama.ts`
Ollama integration utilities:
- `OllamaClient`: HTTP client for Ollama API
- `buildCodePrompt()`: Constructs prompts for code generation
- `buildTestPrompt()`: Constructs prompts for test generation
- `buildDocPrompt()`: Constructs prompts for documentation generation

### `/functions/firstfunction/src/appwrite.ts`
Appwrite Database and Storage integration:
- `AppwriteService`: Manages history, caching, and analytics
- `saveToHistory()`: Store generation in database
- `checkCache()`: Retrieve cached responses
- `saveToCache()`: Cache responses with TTL
- `searchHistory()`: Full-text search across generations
- `getGenerationStats()`: Analytics and usage metrics
- `storeAsFile()`: Save generated code to Storage

### `/functions/firstfunction/package.json`
Defines the function's dependencies and scripts:
- **Dependencies**: `node-appwrite` for Appwrite SDK integration
- **Dev Dependencies**: `prettier` for code formatting
- **Scripts**: `format` command for code formatting

### `/functions/firstfunction/EXAMPLES.md`
Comprehensive API documentation with:
- Request/response examples for all endpoints
- Language support details
- Appwrite integration examples (history, search, stats)
- Caching behavior documentation
- Use cases and integration examples
- Troubleshooting guide

### `/functions/firstfunction/APPWRITE_SETUP.md`
Complete Appwrite Database setup guide:
- Database and collection creation
- Schema definitions and indexes
- Permission configuration
- Environment variable setup
- Verification steps

## Development Workflow

### Prerequisites

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama

   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   ```

2. **Pull the CodeLlama model**:
   ```bash
   ollama pull codellama
   ```

3. **Start Ollama service**:
   ```bash
   ollama serve
   ```

### Local Development

1. **Navigate to function directory**:
   ```bash
   cd functions/firstfunction
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Set up environment variables** (optional):
   ```bash
   cp .env.example .env
   # Edit .env if Ollama is not on localhost:11434
   ```

4. **Run locally**:
   ```bash
   bun run src/main.ts
   ```

5. **Test the API**:
   ```bash
   # Health check
   curl http://localhost:3000/

   # Generate code
   curl -X POST http://localhost:3000/api/code/generate \
     -H "Content-Type: application/json" \
     -d '{"description": "Sort array", "language": "typescript"}'
   ```

### Code Formatting

Format code using Prettier:
```bash
cd functions/firstfunction
bun run format
```

## Ollama Integration

### How It Works

The function uses **Ollama** for local LLM inference:

1. Client sends code generation request to Appwrite Function
2. Function validates request and builds optimized prompts
3. Ollama generates code using CodeLlama model
4. Optional: Generate tests and documentation
5. Return structured response to client

### Ollama Configuration

**Environment Variables**:
- `OLLAMA_BASE_URL`: Ollama API endpoint (default: `http://localhost:11434`)

**Supported Models**:
- `codellama` (default): Specialized for code generation
- `llama2`: General-purpose language model
- `mistral`: Fast and efficient model
- Custom models: Any model available in your Ollama instance

### Code Generation Features

**Supported Languages** (13 total):
- TypeScript, JavaScript, Python, Rust, Go
- Java, C++, C, C#, Ruby, PHP
- Swift, Kotlin

**Optional Features**:
- ✅ Generate unit tests
- ✅ Generate documentation
- ✅ Framework-specific code (Express, React, Django, etc.)
- ✅ Proper error handling
- ✅ Input validation

### API Endpoints

#### `POST /api/code/generate`
Generate code from natural language description.

**Request Body**:
```json
{
  "description": "Create a function to sort array by date",
  "language": "typescript",
  "includeTests": true,
  "includeDocs": true,
  "framework": "Node.js"
}
```

**Response**:
```json
{
  "code": "function sortByDate(arr: Date[]): Date[] { ... }",
  "language": "typescript",
  "tests": "describe('sortByDate', () => { ... })",
  "documentation": "# sortByDate Function...",
  "model": "codellama"
}
```

See `functions/firstfunction/EXAMPLES.md` for comprehensive examples.

## Appwrite Integration

### Database Features (Optional)

When Appwrite Database is configured, the function provides:

**✅ Automatic History Tracking**
- All code generations saved to `generation_history` collection
- Includes code, tests, documentation, and metadata
- Indexed by language and generation date
- Full-text search on descriptions

**✅ Smart Caching**
- Identical requests return cached results instantly
- 24-hour TTL for cached responses
- Reduces Ollama load and improves response times
- Cache key based on description + language + framework

**✅ Analytics & Search**
- Track total generations and language breakdown
- Search history by keywords
- Retrieve any previous generation by ID
- Monitor usage patterns

### Environment Variables

**Automatically Set by Appwrite**:
- `APPWRITE_FUNCTION_PROJECT_ID`: The Appwrite project ID
- `APPWRITE_API_KEY`: API key for server-side operations
- `APPWRITE_ENDPOINT`: Appwrite API endpoint

**Required for Database Features**:
- `APPWRITE_DATABASE_ID`: Database ID (default: `code_generator`)
- `APPWRITE_HISTORY_COLLECTION_ID`: History collection ID (default: `generation_history`)
- `APPWRITE_CACHE_COLLECTION_ID`: Cache collection ID (default: `response_cache`)
- `APPWRITE_BUCKET_ID`: Storage bucket ID (default: `generated_code`)

**Ollama Configuration**:
- `OLLAMA_BASE_URL`: Custom Ollama endpoint (default: `http://localhost:11434`)

### Setup Instructions

See `functions/firstfunction/APPWRITE_SETUP.md` for detailed database setup:
1. Create database and collections
2. Configure indexes and permissions
3. Set environment variables
4. Test the integration

**Note**: The function works without Appwrite Database configured, but history, caching, and search features will be disabled.

### Deployment Notes

For production deployment:
1. **Ollama**: Ensure accessible from your Appwrite instance
2. **Database**: Set up collections for history and caching (optional but recommended)
3. **Timeout**: Increase function timeout for complex generations (default: 15s)
4. **Performance**: Use a dedicated Ollama instance for better performance
5. **Cache Cleanup**: Periodically clean expired cache entries

## Common Tasks

### Testing Code Generation

```bash
# Basic code generation
curl -X POST http://localhost:3000/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a fibonacci function",
    "language": "python"
  }'

# With tests and documentation
curl -X POST http://localhost:3000/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "REST API endpoint for user authentication",
    "language": "typescript",
    "framework": "Express",
    "includeTests": true,
    "includeDocs": true
  }'
```

### Customizing Prompts

Edit `functions/firstfunction/src/ollama.ts` to modify:
- `buildCodePrompt()`: Customize code generation instructions
- `buildTestPrompt()`: Change test generation strategy
- `buildDocPrompt()`: Adjust documentation format

### Switching Ollama Models

Edit `functions/firstfunction/src/ollama.ts`:
```typescript
// Change default model
constructor(baseUrl?: string, defaultModel: string = "mistral") {
  // or use "llama2", or any custom model
}
```

### Adding New Routes/Endpoints
Modify `functions/firstfunction/src/main.ts` and add conditional logic based on:
- `req.method`: HTTP method (GET, POST, PUT, DELETE, etc.)
- `req.path`: Request path
- `req.headers`: Request headers
- `req.body`: Request body (for POST/PUT requests)

### Adding Dependencies
```bash
cd functions/firstfunction
bun add <package-name>
```

### Adding Dev Dependencies
```bash
cd functions/firstfunction
bun add -d <package-name>
```

## Response Helpers

The `res` object provides convenient methods:

- **`res.send(string)`**: Send plain text response
- **`res.json(object)`**: Send JSON response
- **`res.empty()`**: Send empty response
- **`res.redirect(url)`**: Redirect to URL

## Logging

Use the provided logging functions:
- **`log(message)`**: Log informational messages
- **`error(message)`**: Log error messages

Logs are visible in the Appwrite Console under Function Logs.

## Deployment Configuration

| Setting | Value |
|---------|-------|
| Runtime | Bun (1.0) |
| Entrypoint | `src/main.ts` |
| Build Commands | `bun install` |
| Timeout | 15 seconds |
| Root Directory | `functions/firstfunction` |

## Best Practices

1. **Error Handling**: All endpoints wrapped in try-catch with structured error responses
2. **Input Validation**: Comprehensive validation for all request parameters
3. **Logging**: Detailed logging at each step for debugging and monitoring
4. **Environment Variables**: Never hardcode secrets; use Appwrite environment variables
5. **Type Safety**: Full TypeScript typing for requests, responses, and Ollama integration
6. **Prompt Engineering**: Clear, specific prompts for better AI-generated code quality
7. **Resource Management**: Consider timeouts for long-running LLM operations
8. **Model Selection**: Use CodeLlama for code, general models for documentation

## Git Workflow

This project uses feature branches for development:
- **Main branch**: Production-ready code
- **Feature branches**: Named with `claude/` prefix for AI-assisted development

Always commit and push changes to the appropriate feature branch.

## Useful Links

### Appwrite
- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Functions Guide](https://appwrite.io/docs/products/functions)
- [node-appwrite SDK](https://github.com/appwrite/sdk-for-node)
- [Appwrite Discord Community](https://appwrite.io/discord)

### Ollama & AI
- [Ollama Documentation](https://ollama.com/docs)
- [Ollama API Reference](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [CodeLlama Model](https://ollama.com/library/codellama)
- [Available Ollama Models](https://ollama.com/library)

### Development Tools
- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

## Use Cases

This AI code generator can power:

1. **Developer Tools**: IDE extensions, code snippet generators
2. **Learning Platforms**: Interactive coding tutorials
3. **No-Code Platforms**: Generate code from visual builders
4. **Code Migration**: Convert code between languages
5. **Rapid Prototyping**: Generate boilerplate quickly
6. **Documentation**: Auto-generate docs from code
7. **Test Generation**: Create comprehensive test suites

## Architecture Notes

### Request Flow
```
Client Request
    ↓
Appwrite Function (Bun Runtime)
    ↓
Input Validation (types.ts)
    ↓
Ollama Client (ollama.ts)
    ↓
CodeLlama Model
    ↓
Structured Response
    ↓
Client
```

### Performance Considerations

- **Generation Time**: 5-30 seconds depending on complexity
- **Timeout**: Increase Appwrite function timeout for complex requests
- **Caching**: Consider caching common requests in Appwrite Database
- **Rate Limiting**: Implement for production use

### Security Considerations

- **Input Sanitization**: All inputs validated before processing
- **Code Execution**: Generated code is NOT executed by the function
- **Rate Limiting**: Recommended for production deployments
- **API Keys**: Keep Ollama endpoint private if accessible over internet

## Notes for Claude AI

- The main function logic is in `functions/firstfunction/src/main.ts`
- Ollama integration is in `functions/firstfunction/src/ollama.ts`
- All types are defined in `functions/firstfunction/src/types.ts`
- This is a serverless function, not a traditional server application
- Bun is the runtime, which is faster than Node.js for many operations
- When modifying the function, maintain the async function signature
- Always test changes locally with Ollama running before deploying
- Consider function timeout for long-running LLM operations
- The function uses CodeLlama by default, but supports any Ollama model
