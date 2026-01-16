import type { OllamaGenerateRequest, OllamaGenerateResponse } from "./types";

/**
 * Ollama API Client
 * Handles communication with local or remote Ollama instance
 */
export class OllamaClient {
  private baseUrl: string;
  private defaultModel: string;

  constructor(baseUrl?: string, defaultModel: string = "codellama") {
    // Use environment variable or fallback to localhost
    this.baseUrl = baseUrl || Bun.env.OLLAMA_BASE_URL || "http://localhost:11434";
    this.defaultModel = defaultModel;
  }

  /**
   * Generate text using Ollama
   */
  async generate(
    prompt: string,
    model?: string,
    options?: OllamaGenerateRequest["options"]
  ): Promise<string> {
    const requestBody: OllamaGenerateRequest = {
      model: model || this.defaultModel,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        ...options,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(
          `Ollama API error: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate with Ollama: ${error.message}`);
      }
      throw new Error("Failed to generate with Ollama: Unknown error");
    }
  }

  /**
   * Check if Ollama is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch models");
      }

      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      throw new Error(`Failed to list models: ${error}`);
    }
  }
}

/**
 * Build a prompt for code generation
 */
export function buildCodePrompt(
  description: string,
  language: string,
  includeTests: boolean = false,
  includeDocs: boolean = false,
  framework?: string
): string {
  let prompt = `You are an expert software engineer. Generate clean, efficient, and well-structured code.

Task: ${description}
Language: ${language}`;

  if (framework) {
    prompt += `\nFramework: ${framework}`;
  }

  prompt += `\n\nRequirements:
- Write production-quality code
- Follow ${language} best practices and conventions
- Include proper error handling`;

  if (includeDocs) {
    prompt += `\n- Add comprehensive inline documentation and comments`;
  }

  if (includeTests) {
    prompt += `\n- Include unit tests for the code`;
  }

  prompt += `\n\nProvide ONLY the code without any explanations or markdown formatting. Start directly with the code.`;

  return prompt;
}

/**
 * Build a prompt for generating tests
 */
export function buildTestPrompt(
  code: string,
  language: string,
  framework?: string
): string {
  return `You are an expert in software testing. Generate comprehensive unit tests for the following ${language} code.

${framework ? `Use the ${framework} testing framework.` : ""}

Code to test:
\`\`\`${language}
${code}
\`\`\`

Requirements:
- Write thorough unit tests covering edge cases
- Follow ${language} testing best practices
- Include positive and negative test cases
- Test error handling

Provide ONLY the test code without explanations. Start directly with the test code.`;
}

/**
 * Build a prompt for generating documentation
 */
export function buildDocPrompt(code: string, language: string): string {
  return `You are a technical documentation expert. Generate clear and comprehensive documentation for the following ${language} code.

Code:
\`\`\`${language}
${code}
\`\`\`

Generate documentation that includes:
- Overview of what the code does
- Function/class descriptions
- Parameter descriptions
- Return value descriptions
- Usage examples
- Any important notes or caveats

Provide the documentation in markdown format.`;
}
