import { Client, Users } from "node-appwrite";
import type { AppwriteContext } from "./types";

/**
 * User authentication and context extraction
 */
export class AuthService {
  private client: Client;
  private users: Users;

  constructor() {
    this.client = new Client()
      .setEndpoint(Bun.env.APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1")
      .setProject(Bun.env.APPWRITE_FUNCTION_PROJECT_ID || "")
      .setKey(Bun.env.APPWRITE_API_KEY || "");

    this.users = new Users(this.client);
  }

  /**
   * Extract user information from Appwrite Function context
   */
  getUserContext(req: any): {
    userId: string | null;
    email: string | null;
    name: string | null;
    authenticated: boolean;
  } {
    // Appwrite Functions automatically inject user context in headers
    const userId = req.headers["x-appwrite-user-id"] || null;
    const userJwt = req.headers["x-appwrite-user-jwt"] || null;

    return {
      userId,
      email: null, // Will be fetched if needed
      name: null,
      authenticated: !!userId && !!userJwt,
    };
  }

  /**
   * Get detailed user information
   */
  async getUserDetails(userId: string): Promise<{
    id: string;
    email: string;
    name: string;
    createdAt: string;
  } | null> {
    try {
      const user = await this.users.get(userId);
      return {
        id: user.$id,
        email: user.email,
        name: user.name,
        createdAt: user.$createdAt,
      };
    } catch (error) {
      console.error("Failed to get user details:", error);
      return null;
    }
  }

  /**
   * Validate API key for external access
   */
  validateApiKey(apiKey: string): boolean {
    const validKeys = (Bun.env.API_KEYS || "").split(",").filter(Boolean);
    return validKeys.includes(apiKey);
  }

  /**
   * Extract authentication from request
   */
  getAuth(req: any): {
    type: "user" | "apiKey" | "anonymous";
    userId?: string;
    apiKey?: string;
  } {
    const userContext = this.getUserContext(req);

    if (userContext.authenticated) {
      return {
        type: "user",
        userId: userContext.userId!,
      };
    }

    const apiKey = req.headers["x-api-key"] || req.query.apiKey;
    if (apiKey && this.validateApiKey(apiKey)) {
      return {
        type: "apiKey",
        apiKey,
      };
    }

    return { type: "anonymous" };
  }

  /**
   * Check if request is authorized
   */
  isAuthorized(req: any, requireAuth: boolean = false): boolean {
    const auth = this.getAuth(req);

    if (!requireAuth) {
      return true; // Open access
    }

    return auth.type !== "anonymous";
  }
}

/**
 * Rate limiting service
 */
export class RateLimitService {
  private limits: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly windowMs: number = 60 * 1000; // 1 minute
  private readonly maxRequests: number;

  constructor(maxRequestsPerMinute: number = 20) {
    this.maxRequests = maxRequestsPerMinute;
  }

  /**
   * Check if request is rate limited
   */
  checkLimit(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const limitData = this.limits.get(identifier);

    // Reset if window expired
    if (!limitData || now > limitData.resetAt) {
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs,
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    // Check if limit exceeded
    if (limitData.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: limitData.resetAt,
      };
    }

    // Increment count
    limitData.count++;
    this.limits.set(identifier, limitData);

    return {
      allowed: true,
      remaining: this.maxRequests - limitData.count,
      resetAt: limitData.resetAt,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.limits.entries()) {
      if (now > value.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}
