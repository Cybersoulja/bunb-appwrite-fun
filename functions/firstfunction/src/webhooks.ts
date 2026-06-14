import type { AppwriteContext } from "./types";
import { AppwriteService } from "./appwrite";

/**
 * Webhook event types from Appwrite
 */
export type WebhookEventType =
  | "database.documents.create"
  | "database.documents.update"
  | "database.documents.delete"
  | "storage.files.create"
  | "users.create"
  | "users.sessions.create";

export interface WebhookPayload {
  event: WebhookEventType;
  data: any;
  userId?: string;
  timestamp: string;
}

/**
 * Webhook handler service
 */
export class WebhookService {
  private appwrite: AppwriteService;
  private webhookSecret: string;

  constructor() {
    this.appwrite = new AppwriteService();
    this.webhookSecret = Bun.env.WEBHOOK_SECRET || "";
  }

  /**
   * Validate webhook signature
   */
  validateSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      console.warn("Webhook secret not configured");
      return true; // Allow in development
    }

    // Create HMAC signature
    const crypto = require("crypto");
    const hmac = crypto.createHmac("sha256", this.webhookSecret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    return signature === expectedSignature;
  }

  /**
   * Process webhook event
   */
  async processWebhook(
    event: WebhookEventType,
    data: any,
    log: (message: any) => void
  ): Promise<{ success: boolean; message: string; actions?: string[] }> {
    const actions: string[] = [];

    try {
      switch (event) {
        case "database.documents.create":
          if (data.$collectionId === Bun.env.APPWRITE_HISTORY_COLLECTION_ID) {
            log(`New generation created: ${data.$id}`);
            actions.push("generation_tracked");

            // Optional: Send notification to external service
            if (Bun.env.DISCORD_WEBHOOK_URL) {
              await this.sendDiscordNotification(data);
              actions.push("discord_notification_sent");
            }
          }
          break;

        case "database.documents.delete":
          if (data.$collectionId === Bun.env.APPWRITE_CACHE_COLLECTION_ID) {
            log(`Cache entry deleted: ${data.$id}`);
            actions.push("cache_entry_deleted");
          }
          break;

        case "users.create":
          log(`New user created: ${data.$id}`);
          actions.push("user_created");

          // Optional: Send welcome notification
          if (Bun.env.WELCOME_EMAIL_ENABLED === "true") {
            actions.push("welcome_email_queued");
          }
          break;

        case "users.sessions.create":
          log(`User session created: ${data.userId}`);
          actions.push("session_tracked");
          break;

        default:
          log(`Unhandled webhook event: ${event}`);
          actions.push("event_ignored");
      }

      return {
        success: true,
        message: `Processed ${event} event`,
        actions,
      };
    } catch (error) {
      console.error("Webhook processing error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send Discord notification (example integration)
   */
  private async sendDiscordNotification(data: any): Promise<void> {
    const webhookUrl = Bun.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [
            {
              title: "🎨 New Code Generation",
              description: data.description || "No description",
              fields: [
                {
                  name: "Language",
                  value: data.language || "unknown",
                  inline: true,
                },
                {
                  name: "Model",
                  value: data.model || "codellama",
                  inline: true,
                },
              ],
              color: 0x00ff00,
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (error) {
      console.error("Discord notification failed:", error);
    }
  }

  /**
   * Send Slack notification (example integration)
   */
  async sendSlackNotification(
    message: string,
    channel?: string
  ): Promise<void> {
    const webhookUrl = Bun.env.SLACK_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
          channel: channel || "#code-generator",
        }),
      });
    } catch (error) {
      console.error("Slack notification failed:", error);
    }
  }

  /**
   * Trigger custom webhook to external service
   */
  async triggerCustomWebhook(
    url: string,
    payload: any
  ): Promise<{ success: boolean; status?: number }> {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Appwrite-Code-Generator/1.0",
        },
        body: JSON.stringify(payload),
      });

      return {
        success: response.ok,
        status: response.status,
      };
    } catch (error) {
      console.error("Custom webhook failed:", error);
      return { success: false };
    }
  }
}

/**
 * Webhook event registry for tracking
 */
export class WebhookEventRegistry {
  private events: Array<{
    id: string;
    event: WebhookEventType;
    timestamp: string;
    processed: boolean;
    error?: string;
  }> = [];

  /**
   * Register a webhook event
   */
  register(event: WebhookEventType, processed: boolean, error?: string): string {
    const id = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.events.push({
      id,
      event,
      timestamp: new Date().toISOString(),
      processed,
      error,
    });

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }

    return id;
  }

  /**
   * Get recent webhook events
   */
  getRecent(limit: number = 20): Array<any> {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    processed: number;
    failed: number;
    eventTypes: Record<string, number>;
  } {
    const eventTypes: Record<string, number> = {};

    this.events.forEach((e) => {
      eventTypes[e.event] = (eventTypes[e.event] || 0) + 1;
    });

    return {
      total: this.events.length,
      processed: this.events.filter((e) => e.processed).length,
      failed: this.events.filter((e) => !e.processed).length,
      eventTypes,
    };
  }
}
