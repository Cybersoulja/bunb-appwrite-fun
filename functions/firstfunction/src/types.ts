// Type definitions for the Appwrite function

export interface AppwriteRequest {
  bodyRaw: string;
  body: any;
  headers: Record<string, string>;
  method: string;
  host: string;
  scheme: string;
  query: Record<string, string>;
  queryString: string;
  port: number;
  url: string;
  path: string;
}

export interface AppwriteResponse {
  send: (text: string, statusCode?: number, headers?: Record<string, string>) => void;
  json: (obj: any, statusCode?: number, headers?: Record<string, string>) => void;
  empty: () => void;
  redirect: (url: string, statusCode?: number) => void;
}

export interface AppwriteContext {
  req: AppwriteRequest;
  res: AppwriteResponse;
  log: (message: any) => void;
  error: (message: any) => void;
}

// Code generation request types
export interface CodeGenerationRequest {
  description: string;
  language: string;
  includeTests?: boolean;
  includeDocs?: boolean;
  framework?: string;
}

export interface CodeGenerationResponse {
  code: string;
  language: string;
  tests?: string;
  documentation?: string;
  explanation?: string;
  model?: string;
}

// Ollama API types
export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

export type SupportedLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "rust"
  | "go"
  | "java"
  | "cpp"
  | "c"
  | "csharp"
  | "ruby"
  | "php"
  | "swift"
  | "kotlin";

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}
