# AI Code Generator - Usage Examples

This document provides practical examples for using the AI Code Generator Appwrite function powered by Ollama.

## Prerequisites

1. **Ollama must be running** on your local machine or accessible server
2. Install the CodeLlama model: `ollama pull codellama`
3. Set the `OLLAMA_BASE_URL` environment variable (optional, defaults to `http://localhost:11434`)

## API Endpoints

### 1. Health Check

**Endpoint**: `GET /`

```bash
curl http://your-function-url/
```

**Response**:
```json
{
  "status": "ok",
  "service": "AI Code Generator",
  "version": "1.0.0",
  "endpoints": {
    "generate": "POST /api/code/generate",
    "health": "GET /"
  }
}
```

### 2. Ollama Health Check

**Endpoint**: `GET /health`

```bash
curl http://your-function-url/health
```

**Response**:
```json
{
  "ollama": {
    "available": true,
    "baseUrl": "http://localhost:11434"
  }
}
```

### 3. Generate Code

**Endpoint**: `POST /api/code/generate`

## Example Requests

### Basic Code Generation

**Request**:
```bash
curl -X POST http://your-function-url/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a function to sort an array of numbers in ascending order",
    "language": "typescript"
  }'
```

**Response**:
```json
{
  "code": "function sortNumbers(arr: number[]): number[] {\n  return arr.sort((a, b) => a - b);\n}",
  "language": "typescript",
  "model": "codellama"
}
```

### Generate Code with Tests

**Request**:
```bash
curl -X POST http://your-function-url/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a function to validate email addresses",
    "language": "javascript",
    "includeTests": true
  }'
```

**Response**:
```json
{
  "code": "function validateEmail(email) {\n  const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n  return regex.test(email);\n}",
  "language": "javascript",
  "tests": "describe('validateEmail', () => {\n  it('should validate correct email', () => {\n    expect(validateEmail('test@example.com')).toBe(true);\n  });\n  it('should reject invalid email', () => {\n    expect(validateEmail('invalid')).toBe(false);\n  });\n});",
  "model": "codellama"
}
```

### Generate Code with Documentation

**Request**:
```bash
curl -X POST http://your-function-url/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a class to manage a todo list with add, remove, and list operations",
    "language": "python",
    "includeDocs": true
  }'
```

**Response**:
```json
{
  "code": "class TodoList:\n    def __init__(self):\n        self.todos = []\n    \n    def add(self, todo):\n        self.todos.append(todo)\n    \n    def remove(self, index):\n        if 0 <= index < len(self.todos):\n            self.todos.pop(index)\n    \n    def list(self):\n        return self.todos",
  "language": "python",
  "documentation": "# TodoList Class\n\n## Overview\nA simple todo list manager...",
  "model": "codellama"
}
```

### Generate Code with Tests and Documentation

**Request**:
```bash
curl -X POST http://your-function-url/api/code/generate \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Create a REST API endpoint handler for user registration",
    "language": "typescript",
    "framework": "Express",
    "includeTests": true,
    "includeDocs": true
  }'
```

## Language Support

The following languages are supported:

- `typescript`
- `javascript`
- `python`
- `rust`
- `go`
- `java`
- `cpp` (C++)
- `c`
- `csharp` (C#)
- `ruby`
- `php`
- `swift`
- `kotlin`

## Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `description` | string | Yes | Description of the code to generate |
| `language` | string | Yes | Programming language (see supported languages) |
| `includeTests` | boolean | No | Generate unit tests (default: false) |
| `includeDocs` | boolean | No | Generate documentation (default: false) |
| `framework` | string | No | Specific framework to use (e.g., "Express", "React", "Django") |

## Error Responses

### Validation Error (400)
```json
{
  "error": "Validation Error",
  "message": "Language is required and must be a string",
  "statusCode": 400
}
```

### Ollama Unavailable (500)
```json
{
  "error": "Internal Server Error",
  "message": "Ollama service is not available. Please ensure Ollama is running and accessible.",
  "statusCode": 500
}
```

### Not Found (404)
```json
{
  "error": "Not Found",
  "message": "Endpoint POST /unknown not found",
  "statusCode": 404
}
```

## Use Cases

### 1. Developer Tools
Build a VS Code extension or IDE plugin that generates code snippets on demand.

### 2. Learning Platforms
Create interactive coding tutorials where students can describe what they want to build.

### 3. No-Code/Low-Code Platforms
Enable non-technical users to generate code from natural language descriptions.

### 4. Code Migration
Describe functionality in one language and generate equivalent code in another.

### 5. Rapid Prototyping
Quickly generate boilerplate code for new features or components.

## Tips for Best Results

1. **Be Specific**: Provide detailed descriptions of what you want the code to do
2. **Include Constraints**: Mention specific requirements, edge cases, or performance needs
3. **Specify Framework**: If working with a specific framework, mention it in the request
4. **Request Tests**: Always generate tests for production code
5. **Iterate**: Refine your description based on initial results

## Example Descriptions

**Good**:
> "Create a TypeScript function that fetches user data from an API, handles errors with try-catch, and returns a typed User object or null"

**Better**:
> "Create an async TypeScript function called fetchUser that takes a userId (string) as parameter, fetches data from '/api/users/{userId}', handles network errors and 404 responses, and returns a Promise<User | null> where User has id, name, and email fields"

## Integration Example (JavaScript/TypeScript)

```typescript
async function generateCode(description: string, language: string) {
  const response = await fetch('http://your-function-url/api/code/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description,
      language,
      includeTests: true,
      includeDocs: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`Code generation failed: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
const result = await generateCode(
  'Create a function to calculate fibonacci numbers',
  'typescript'
);

console.log(result.code);
console.log(result.tests);
console.log(result.documentation);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OLLAMA_BASE_URL` | Base URL for Ollama API | `http://localhost:11434` |

## Troubleshooting

### "Ollama service is not available"
- Ensure Ollama is running: `ollama serve`
- Check if the base URL is correct
- Verify network connectivity

### Slow Response Times
- Ollama generates code on-demand, which can take 5-30 seconds
- Consider using streaming responses for better UX
- Ensure your server has adequate resources

### "Unsupported language"
- Check the list of supported languages
- Language names are case-insensitive
- Use standard language identifiers (e.g., "javascript" not "js")
