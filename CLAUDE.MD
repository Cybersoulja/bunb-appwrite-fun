# CLAUDE.MD - Project Guide

## Project Overview

This is an **Appwrite Function** project using **Bun** as the runtime environment. It's designed to handle HTTP requests in the Appwrite ecosystem, providing a simple and powerful way to create serverless functions.

### Technology Stack
- **Runtime**: Bun (1.0+)
- **Language**: TypeScript
- **Platform**: Appwrite Functions
- **SDK**: node-appwrite (v9.0.0)

## Project Structure

```
bunb-appwrite-fun/
├── functions/
│   └── firstfunction/
│       ├── src/
│       │   └── main.ts          # Main function entry point
│       ├── package.json          # Function dependencies
│       ├── bun.lockb            # Bun lock file
│       └── README.md            # Function-specific docs
├── README.md                     # Project documentation
└── CLAUDE.MD                     # This file
```

## Key Files

### `/functions/firstfunction/src/main.ts`
The main function handler. Exports a default async function that receives:
- `req`: Request object containing HTTP request data
- `res`: Response object with helpers (`send()`, `json()`)
- `log`: Logging function
- `error`: Error logging function

**Current Implementation**:
- GET requests return a plain text "Hello, World!" response
- Other methods (POST, PUT, PATCH, DELETE) return a JSON object with Appwrite resources

### `/functions/firstfunction/package.json`
Defines the function's dependencies and scripts:
- **Dependencies**: `node-appwrite` for Appwrite SDK integration
- **Dev Dependencies**: `prettier` for code formatting
- **Scripts**: `format` command for code formatting

## Development Workflow

### Local Development

1. **Navigate to function directory**:
   ```bash
   cd functions/firstfunction
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Run locally**:
   ```bash
   bun run src/main.ts
   ```

### Code Formatting

Format code using Prettier:
```bash
cd functions/firstfunction
bun run format
```

## Appwrite Integration

### Environment Variables
When deployed to Appwrite, the function has access to:
- `APPWRITE_FUNCTION_PROJECT_ID`: The Appwrite project ID
- `APPWRITE_API_KEY`: API key for server-side operations
- Custom environment variables can be configured in Appwrite Console

### Using the Appwrite SDK

To interact with Appwrite services, initialize the client:

```typescript
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject(Bun.env["APPWRITE_FUNCTION_PROJECT_ID"])
  .setKey(Bun.env["APPWRITE_API_KEY"]);
```

Then use it with Appwrite services (Database, Storage, Users, etc.).

## Common Tasks

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

1. **Error Handling**: Always wrap potentially failing operations in try-catch blocks
2. **Logging**: Use `log()` and `error()` for debugging and monitoring
3. **Environment Variables**: Never hardcode secrets; use Appwrite environment variables
4. **Response Format**: Be consistent with response formats (JSON for APIs)
5. **Type Safety**: Leverage TypeScript for better code quality

## Git Workflow

This project uses feature branches for development:
- **Main branch**: Production-ready code
- **Feature branches**: Named with `claude/` prefix for AI-assisted development

Always commit and push changes to the appropriate feature branch.

## Useful Links

- [Appwrite Documentation](https://appwrite.io/docs)
- [Appwrite Functions Guide](https://appwrite.io/docs/products/functions)
- [Bun Documentation](https://bun.sh/docs)
- [node-appwrite SDK](https://github.com/appwrite/sdk-for-node)
- [Appwrite Discord Community](https://appwrite.io/discord)

## Notes for Claude AI

- The main function logic is in `functions/firstfunction/src/main.ts`
- This is a serverless function, not a traditional server application
- Bun is the runtime, which is faster than Node.js for many operations
- When modifying the function, maintain the async function signature
- Always test changes locally before deploying
- Remember that functions have a 15-second timeout by default
