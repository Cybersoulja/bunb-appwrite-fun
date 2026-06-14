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
import { AppwriteService } from "./appwrite";

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
  log: (message: any) => void,
  useCache: boolean = true
): Promise<CodeGenerationResponse & { cached?: boolean; historyId?: string }> {
  const ollama = new OllamaClient();
  const appwrite = new AppwriteService();

  // Check cache first if enabled
  if (useCache && appwrite.isConfigured()) {
    log("Checking cache...");
    const cached = await appwrite.checkCache(
      request.description,
      request.language,
      request.framework
    );

    if (cached) {
      log("Cache hit! Returning cached response");
      return {
        code: cached.code,
        language: request.language,
        tests: cached.tests,
        documentation: cached.documentation,
        model: "codellama",
        cached: true,
      };
    }
    log("Cache miss, generating fresh code");
  }

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

  const response: CodeGenerationResponse & { cached?: boolean; historyId?: string } = {
    code: code.trim(),
    language: request.language,
    model: "codellama",
    cached: false,
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

  // Save to Appwrite history and cache
  if (appwrite.isConfigured()) {
    log("Saving to history and cache...");

    // Save to history
    const historyId = await appwrite.saveToHistory(
      request.description,
      request.language,
      response.code,
      response.tests,
      response.documentation,
      {
        model: response.model,
        framework: request.framework,
      }
    );

    if (historyId) {
      response.historyId = historyId;
      log(`Saved to history with ID: ${historyId}`);
    }

    // Save to cache
    await appwrite.saveToCache(
      request.description,
      request.language,
      response.code,
      response.tests,
      response.documentation,
      request.framework
    );
    log("Cached for future requests");
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
      const appwrite = new AppwriteService();
      return res.json({
        status: "ok",
        service: "AI Code Generator",
        version: "2.0.0",
        appwriteEnabled: appwrite.isConfigured(),
        endpoints: {
          generate: "POST /api/code/generate",
          history: "GET /api/history",
          search: "GET /api/history/search?q=query&language=python",
          stats: "GET /api/stats",
          getById: "GET /api/history/:id",
          health: "GET /health",
        },
      });
    }

    // Health check for Ollama and Appwrite
    if (req.method === "GET" && req.path === "/health") {
      const ollama = new OllamaClient();
      const appwrite = new AppwriteService();
      const isAvailable = await ollama.isAvailable();

      return res.json({
        ollama: {
          available: isAvailable,
          baseUrl: Bun.env.OLLAMA_BASE_URL || "http://localhost:11434",
        },
        appwrite: {
          configured: appwrite.isConfigured(),
          features: appwrite.isConfigured()
            ? ["history", "caching", "search", "analytics"]
            : [],
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

    // Get generation statistics
    if (req.method === "GET" && req.path === "/api/stats") {
      const appwrite = new AppwriteService();

      if (!appwrite.isConfigured()) {
        return res.json(
          {
            error: "Service Unavailable",
            message: "Appwrite is not configured. History and stats are not available.",
            statusCode: 503,
          } as ErrorResponse,
          503
        );
      }

      log("Fetching generation statistics");
      const stats = await appwrite.getGenerationStats();

      if (!stats) {
        throw new Error("Failed to fetch statistics");
      }

      return res.json({
        ...stats,
        message: "Statistics retrieved successfully",
      });
    }

    // Search generation history
    if (req.method === "GET" && req.path === "/api/history/search") {
      const appwrite = new AppwriteService();

      if (!appwrite.isConfigured()) {
        return res.json(
          {
            error: "Service Unavailable",
            message: "Appwrite is not configured. History search is not available.",
            statusCode: 503,
          } as ErrorResponse,
          503
        );
      }

      const query = req.query.q as string;
      const language = req.query.language as string | undefined;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!query) {
        return res.json(
          {
            error: "Validation Error",
            message: "Query parameter 'q' is required",
            statusCode: 400,
          } as ErrorResponse,
          400
        );
      }

      log(`Searching history for: ${query}`);
      const results = await appwrite.searchHistory(query, language, limit);

      return res.json({
        query,
        language: language || "all",
        results,
        count: results.length,
      });
    }

    // Get recent generation history
    if (req.method === "GET" && req.path === "/api/history") {
      const appwrite = new AppwriteService();

      if (!appwrite.isConfigured()) {
        return res.json(
          {
            error: "Service Unavailable",
            message: "Appwrite is not configured. History is not available.",
            statusCode: 503,
          } as ErrorResponse,
          503
        );
      }

      log("Fetching recent generation history");
      const stats = await appwrite.getGenerationStats();

      if (!stats) {
        throw new Error("Failed to fetch history");
      }

      return res.json({
        recent: stats.recentGenerations,
        total: stats.totalGenerations,
      });
    }

    // Get generation by ID
    if (req.method === "GET" && req.path.startsWith("/api/history/")) {
      const appwrite = new AppwriteService();

      if (!appwrite.isConfigured()) {
        return res.json(
          {
            error: "Service Unavailable",
            message: "Appwrite is not configured. History is not available.",
            statusCode: 503,
          } as ErrorResponse,
          503
        );
      }

      const id = req.path.split("/api/history/")[1];
      if (!id || id === "search") {
        // Skip if it's the search endpoint
        return res.json(
          {
            error: "Validation Error",
            message: "Generation ID is required",
            statusCode: 400,
          } as ErrorResponse,
          400
        );
      }

      log(`Fetching generation with ID: ${id}`);
      const generation = await appwrite.getGenerationById(id);

      if (!generation) {
        return res.json(
          {
            error: "Not Found",
            message: `Generation with ID ${id} not found`,
            statusCode: 404,
          } as ErrorResponse,
          404
        );
      }

      return res.json(generation);
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
