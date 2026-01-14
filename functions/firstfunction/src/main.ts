import { Client } from "node-appwrite";
import type {
  AppwriteContext,
  CodeGenerationRequest,
  CodeGenerationResponse,
  ErrorResponse,
  SupportedLanguage,
} from "./types";
import {
  OllamaClient,
  buildCodePrompt,
  buildTestPrompt,
  buildDocPrompt,
} from "./ollama";

// Supported programming languages
const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "java",
  "cpp",
  "c",
  "csharp",
  "ruby",
  "php",
  "swift",
  "kotlin",
];

/**
 * Validate code generation request
 */
function validateRequest(body: any): {
  valid: boolean;
  error?: string;
  data?: CodeGenerationRequest;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const { description, language, includeTests, includeDocs, framework } = body;

  if (!description || typeof description !== "string" || description.trim().length === 0) {
    return { valid: false, error: "Description is required and must be a non-empty string" };
  }

  if (!language || typeof language !== "string") {
    return { valid: false, error: "Language is required and must be a string" };
  }

  const normalizedLanguage = language.toLowerCase();
  if (!SUPPORTED_LANGUAGES.includes(normalizedLanguage as SupportedLanguage)) {
    return {
      valid: false,
      error: `Unsupported language. Supported languages: ${SUPPORTED_LANGUAGES.join(", ")}`,
    };
  }

  return {
    valid: true,
    data: {
      description: description.trim(),
      language: normalizedLanguage,
      includeTests: includeTests === true,
      includeDocs: includeDocs === true,
      framework: framework && typeof framework === "string" ? framework : undefined,
    },
  };
}

/**
 * Handle code generation request
 */
async function handleCodeGeneration(
  request: CodeGenerationRequest,
  log: (message: any) => void
): Promise<CodeGenerationResponse> {
  const ollama = new OllamaClient();

  // Check if Ollama is available
  const isAvailable = await ollama.isAvailable();
  if (!isAvailable) {
    throw new Error(
      "Ollama service is not available. Please ensure Ollama is running and accessible."
    );
  }

  log(`Generating ${request.language} code for: ${request.description}`);

  // Generate the main code
  const codePrompt = buildCodePrompt(
    request.description,
    request.language,
    request.includeTests || false,
    request.includeDocs || false,
    request.framework
  );

  const code = await ollama.generate(codePrompt, "codellama");
  log("Code generated successfully");

  const response: CodeGenerationResponse = {
    code: code.trim(),
    language: request.language,
    model: "codellama",
  };

  // Generate tests if requested
  if (request.includeTests) {
    log("Generating tests...");
    const testPrompt = buildTestPrompt(code, request.language, request.framework);
    const tests = await ollama.generate(testPrompt, "codellama");
    response.tests = tests.trim();
    log("Tests generated successfully");
  }

  // Generate documentation if requested
  if (request.includeDocs) {
    log("Generating documentation...");
    const docPrompt = buildDocPrompt(code, request.language);
    const documentation = await ollama.generate(docPrompt, "codellama");
    response.documentation = documentation.trim();
    log("Documentation generated successfully");
  }

  return response;
}

/**
 * Main Appwrite function
 */
export default async ({ req, res, log, error }: AppwriteContext) => {
  try {
    // Health check endpoint
    if (req.method === "GET" && req.path === "/") {
      return res.json({
        status: "ok",
        service: "AI Code Generator",
        version: "1.0.0",
        endpoints: {
          generate: "POST /api/code/generate",
          health: "GET /",
        },
      });
    }

    // Health check for Ollama
    if (req.method === "GET" && req.path === "/health") {
      const ollama = new OllamaClient();
      const isAvailable = await ollama.isAvailable();

      return res.json({
        ollama: {
          available: isAvailable,
          baseUrl: Bun.env.OLLAMA_BASE_URL || "http://localhost:11434",
        },
      });
    }

    // Code generation endpoint
    if (req.method === "POST" && req.path === "/api/code/generate") {
      log("Received code generation request");

      // Parse and validate request
      const validation = validateRequest(req.body);
      if (!validation.valid) {
        error(`Validation failed: ${validation.error}`);
        return res.json(
          {
            error: "Validation Error",
            message: validation.error,
            statusCode: 400,
          } as ErrorResponse,
          400
        );
      }

      // Generate code
      const result = await handleCodeGeneration(validation.data!, log);

      log("Request completed successfully");
      return res.json(result);
    }

    // Unknown endpoint
    return res.json(
      {
        error: "Not Found",
        message: `Endpoint ${req.method} ${req.path} not found`,
        statusCode: 404,
      } as ErrorResponse,
      404
    );
  } catch (err) {
    // Global error handler
    const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
    error(`Error: ${errorMessage}`);

    return res.json(
      {
        error: "Internal Server Error",
        message: errorMessage,
        statusCode: 500,
      } as ErrorResponse,
      500
    );
  }
};
