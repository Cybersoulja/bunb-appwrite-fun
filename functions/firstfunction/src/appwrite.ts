import { Client, Databases, Storage, ID, Query } from "node-appwrite";
import type { AppwriteContext } from "./types";

/**
 * Appwrite service for managing code generation history and caching
 */
export class AppwriteService {
  private client: Client;
  private databases: Databases;
  private storage: Storage;
  private databaseId: string;
  private historyCollectionId: string;
  private cacheCollectionId: string;
  private bucketId: string;

  constructor() {
    // Initialize Appwrite client
    this.client = new Client()
      .setEndpoint(Bun.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
      .setProject(Bun.env.APPWRITE_FUNCTION_PROJECT_ID || "")
      .setKey(Bun.env.APPWRITE_API_KEY || "");

    this.databases = new Databases(this.client);
    this.storage = new Storage(this.client);

    // Database and collection IDs (set via environment variables)
    this.databaseId = Bun.env.APPWRITE_DATABASE_ID || "code_generator";
    this.historyCollectionId = Bun.env.APPWRITE_HISTORY_COLLECTION_ID || "generation_history";
    this.cacheCollectionId = Bun.env.APPWRITE_CACHE_COLLECTION_ID || "response_cache";
    this.bucketId = Bun.env.APPWRITE_BUCKET_ID || "generated_code";
  }

  /**
   * Check if Appwrite is properly configured
   */
  isConfigured(): boolean {
    return !!(
      Bun.env.APPWRITE_FUNCTION_PROJECT_ID &&
      Bun.env.APPWRITE_API_KEY
    );
  }

  /**
   * Save generated code to history
   */
  async saveToHistory(
    description: string,
    language: string,
    code: string,
    tests?: string,
    documentation?: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      const document = await this.databases.createDocument(
        this.databaseId,
        this.historyCollectionId,
        ID.unique(),
        {
          description,
          language,
          code,
          tests: tests || null,
          documentation: documentation || null,
          model: metadata?.model || "codellama",
          framework: metadata?.framework || null,
          generatedAt: new Date().toISOString(),
          userId: metadata?.userId || null,
        }
      );

      return document.$id;
    } catch (error) {
      console.error("Failed to save to history:", error);
      return null;
    }
  }

  /**
   * Check cache for previously generated code
   */
  async checkCache(
    description: string,
    language: string,
    framework?: string
  ): Promise<{
    code: string;
    tests?: string;
    documentation?: string;
  } | null> {
    if (!this.isConfigured()) return null;

    try {
      const cacheKey = this.generateCacheKey(description, language, framework);

      const response = await this.databases.listDocuments(
        this.databaseId,
        this.cacheCollectionId,
        [
          Query.equal("cacheKey", cacheKey),
          Query.greaterThan("expiresAt", new Date().toISOString()),
          Query.limit(1),
        ]
      );

      if (response.documents.length > 0) {
        const cached = response.documents[0];
        return {
          code: cached.code,
          tests: cached.tests || undefined,
          documentation: cached.documentation || undefined,
        };
      }

      return null;
    } catch (error) {
      console.error("Cache check failed:", error);
      return null;
    }
  }

  /**
   * Save response to cache
   */
  async saveToCache(
    description: string,
    language: string,
    code: string,
    tests?: string,
    documentation?: string,
    framework?: string,
    ttlHours: number = 24
  ): Promise<void> {
    if (!this.isConfigured()) return;

    try {
      const cacheKey = this.generateCacheKey(description, language, framework);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      await this.databases.createDocument(
        this.databaseId,
        this.cacheCollectionId,
        ID.unique(),
        {
          cacheKey,
          description,
          language,
          framework: framework || null,
          code,
          tests: tests || null,
          documentation: documentation || null,
          expiresAt: expiresAt.toISOString(),
          createdAt: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error("Failed to save to cache:", error);
    }
  }

  /**
   * Store generated code as a file in Appwrite Storage
   */
  async storeAsFile(
    code: string,
    language: string,
    filename?: string
  ): Promise<string | null> {
    if (!this.isConfigured()) return null;

    try {
      const extension = this.getFileExtension(language);
      const finalFilename = filename || `generated-${Date.now()}.${extension}`;

      // Create a blob from the code
      const blob = new Blob([code], { type: "text/plain" });
      const file = new File([blob], finalFilename);

      const response = await this.storage.createFile(
        this.bucketId,
        ID.unique(),
        file
      );

      return response.$id;
    } catch (error) {
      console.error("Failed to store file:", error);
      return null;
    }
  }

  /**
   * Get generation history for analytics
   */
  async getGenerationStats(): Promise<{
    totalGenerations: number;
    languageBreakdown: Record<string, number>;
    recentGenerations: any[];
  } | null> {
    if (!this.isConfigured()) return null;

    try {
      const recent = await this.databases.listDocuments(
        this.databaseId,
        this.historyCollectionId,
        [Query.orderDesc("generatedAt"), Query.limit(10)]
      );

      // Get total count
      const total = recent.total;

      // Calculate language breakdown (simplified - in production, use aggregation)
      const languageBreakdown: Record<string, number> = {};
      recent.documents.forEach((doc) => {
        const lang = doc.language;
        languageBreakdown[lang] = (languageBreakdown[lang] || 0) + 1;
      });

      return {
        totalGenerations: total,
        languageBreakdown,
        recentGenerations: recent.documents.map((doc) => ({
          id: doc.$id,
          description: doc.description,
          language: doc.language,
          generatedAt: doc.generatedAt,
        })),
      };
    } catch (error) {
      console.error("Failed to get stats:", error);
      return null;
    }
  }

  /**
   * Search generation history
   */
  async searchHistory(
    query: string,
    language?: string,
    limit: number = 20
  ): Promise<any[]> {
    if (!this.isConfigured()) return [];

    try {
      const queries = [
        Query.search("description", query),
        Query.limit(limit),
        Query.orderDesc("generatedAt"),
      ];

      if (language) {
        queries.push(Query.equal("language", language));
      }

      const response = await this.databases.listDocuments(
        this.databaseId,
        this.historyCollectionId,
        queries
      );

      return response.documents;
    } catch (error) {
      console.error("Search failed:", error);
      return [];
    }
  }

  /**
   * Get a specific generation by ID
   */
  async getGenerationById(id: string): Promise<any | null> {
    if (!this.isConfigured()) return null;

    try {
      const document = await this.databases.getDocument(
        this.databaseId,
        this.historyCollectionId,
        id
      );

      return document;
    } catch (error) {
      console.error("Failed to get generation:", error);
      return null;
    }
  }

  /**
   * Delete old cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    if (!this.isConfigured()) return 0;

    try {
      const expired = await this.databases.listDocuments(
        this.databaseId,
        this.cacheCollectionId,
        [
          Query.lessThan("expiresAt", new Date().toISOString()),
          Query.limit(100),
        ]
      );

      let deletedCount = 0;
      for (const doc of expired.documents) {
        try {
          await this.databases.deleteDocument(
            this.databaseId,
            this.cacheCollectionId,
            doc.$id
          );
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete cache entry ${doc.$id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Cache cleanup failed:", error);
      return 0;
    }
  }

  /**
   * Generate cache key from request parameters
   */
  private generateCacheKey(
    description: string,
    language: string,
    framework?: string
  ): string {
    const normalized = `${description.toLowerCase().trim()}-${language.toLowerCase()}${
      framework ? `-${framework.toLowerCase()}` : ""
    }`;

    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return `cache_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get file extension for language
   */
  private getFileExtension(language: string): string {
    const extensions: Record<string, string> = {
      typescript: "ts",
      javascript: "js",
      python: "py",
      rust: "rs",
      go: "go",
      java: "java",
      cpp: "cpp",
      c: "c",
      csharp: "cs",
      ruby: "rb",
      php: "php",
      swift: "swift",
      kotlin: "kt",
    };

    return extensions[language.toLowerCase()] || "txt";
  }
}
