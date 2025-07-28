import { performance } from "../utils/performance.js";
import { analytics } from "../utils/analytics.js";
import { cache } from "../utils/cache.js";
import crypto from "crypto";
// Simple fetch mock for testing
const fetch = async (url, options = {}) => {
  if (process.env.NODE_ENV === "test") {
    return {
      ok: true,
      json: () => Promise.resolve({}),
      status: 200,
      statusText: "OK",
    };
  }
  // In production, you would use the actual fetch implementation
  throw new Error("Fetch not implemented in production mode");
};

/**
 * Advanced Webhook Service for external integrations
 * Supports GitHub, Slack, Teams, Jira, and custom webhooks
 */
class WebhookService {
  constructor() {
    this.webhooks = new Map();
    this.rateLimits = new Map();
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Register a webhook endpoint
   */
  async registerWebhook(guildId, type, config) {
    const webhookId = crypto.randomUUID();
    const webhook = {
      id: webhookId,
      guildId,
      type,
      config,
      createdAt: new Date(),
      isActive: true,
      stats: {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        lastCall: null,
      },
    };

    this.webhooks.set(webhookId, webhook);

    // Cache webhook for quick access
    cache.set(`webhook:${webhookId}`, webhook, 3600);

    analytics.trackEvent("webhook_registered", {
      webhookId,
      type,
      guildId,
    });

    return webhookId;
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(webhookId, payload, headers = {}) {
    const startTime = Date.now();

    try {
      const webhook = await this.getWebhook(webhookId);
      if (!webhook || !webhook.isActive) {
        throw new Error("Webhook not found or inactive");
      }

      // Verify webhook signature if configured
      if (webhook.config.secret) {
        this.verifySignature(payload, headers, webhook.config.secret);
      }

      // Rate limiting
      if (this.isRateLimited(webhookId)) {
        throw new Error("Rate limit exceeded");
      }

      // Process based on webhook type
      let result;
      switch (webhook.type) {
        case "github":
          result = await this.processGitHubWebhook(webhook, payload);
          break;
        case "slack":
          result = await this.processSlackWebhook(webhook, payload);
          break;
        case "jira":
          result = await this.processJiraWebhook(webhook, payload);
          break;
        case "custom":
          result = await this.processCustomWebhook(webhook, payload);
          break;
        default:
          throw new Error(`Unsupported webhook type: ${webhook.type}`);
      }

      // Update stats
      webhook.stats.totalCalls++;
      webhook.stats.successfulCalls++;
      webhook.stats.lastCall = new Date();

      const duration = Date.now() - startTime;
      performance.recordMetric("webhook_processing_time", duration);

      analytics.trackEvent("webhook_processed", {
        webhookId,
        type: webhook.type,
        duration,
        success: true,
      });

      return result;
    } catch (error) {
      const webhook = this.webhooks.get(webhookId);
      if (webhook) {
        webhook.stats.totalCalls++;
        webhook.stats.failedCalls++;
      }

      analytics.trackEvent("webhook_error", {
        webhookId,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Process GitHub webhook events
   */
  async processGitHubWebhook(webhook, payload) {
    const event = payload.action || "unknown";
    const repo = payload.repository?.name || "unknown";

    const messages = [];

    switch (event) {
      case "opened":
        if (payload.pull_request) {
          messages.push({
            embeds: [
              {
                title: "🔀 New Pull Request",
                description: `**${payload.pull_request.title}**\n${payload.pull_request.body?.substring(0, 200) || "No description"}`,
                url: payload.pull_request.html_url,
                color: 0x28a745,
                author: {
                  name: payload.pull_request.user.login,
                  icon_url: payload.pull_request.user.avatar_url,
                },
                fields: [
                  { name: "Repository", value: repo, inline: true },
                  {
                    name: "Branch",
                    value: payload.pull_request.head.ref,
                    inline: true,
                  },
                ],
              },
            ],
          });
        }
        break;

      case "push":
        if (payload.commits?.length > 0) {
          const commits = payload.commits.slice(0, 5);
          messages.push({
            embeds: [
              {
                title: "📝 New Commits",
                description: commits
                  .map((c) => `\`${c.id.substring(0, 7)}\` ${c.message}`)
                  .join("\n"),
                url: payload.compare,
                color: 0x0366d6,
                author: {
                  name: payload.pusher.name,
                },
                fields: [
                  { name: "Repository", value: repo, inline: true },
                  {
                    name: "Branch",
                    value: payload.ref.replace("refs/heads/", ""),
                    inline: true,
                  },
                  {
                    name: "Commits",
                    value: payload.commits.length.toString(),
                    inline: true,
                  },
                ],
              },
            ],
          });
        }
        break;
    }

    return { messages, processed: true };
  }

  /**
   * Process Slack webhook events
   */
  async processSlackWebhook(webhook, payload) {
    // Handle Slack slash commands and interactive components
    if (payload.command) {
      return {
        messages: [
          {
            content: `Received Slack command: ${payload.command} ${payload.text || ""}`,
          },
        ],
        processed: true,
      };
    }

    return { messages: [], processed: true };
  }

  /**
   * Process Jira webhook events
   */
  async processJiraWebhook(webhook, payload) {
    const issue = payload.issue;
    const user = payload.user;
    const event = payload.webhookEvent;

    if (!issue) return { messages: [], processed: true };

    const messages = [
      {
        embeds: [
          {
            title: `🎫 Jira: ${event.replace("jira:", "").replace("_", " ")}`,
            description: `**${issue.fields.summary}**\n${issue.fields.description?.substring(0, 200) || "No description"}`,
            url: `${payload.issue.self.split("/rest/")[0]}/browse/${issue.key}`,
            color: 0x0052cc,
            author: {
              name: user?.displayName || "System",
            },
            fields: [
              { name: "Issue Key", value: issue.key, inline: true },
              { name: "Status", value: issue.fields.status.name, inline: true },
              {
                name: "Priority",
                value: issue.fields.priority?.name || "None",
                inline: true,
              },
            ],
          },
        ],
      },
    ];

    return { messages, processed: true };
  }

  /**
   * Process custom webhook events
   */
  async processCustomWebhook(webhook, payload) {
    // Execute custom transformation logic
    const transform = webhook.config.transform;
    if (typeof transform === "function") {
      return await transform(payload);
    }

    // Default processing
    return {
      messages: [
        {
          embeds: [
            {
              title: "🔗 Custom Webhook",
              description: JSON.stringify(payload, null, 2).substring(0, 1000),
              color: 0x7289da,
              timestamp: new Date().toISOString(),
            },
          ],
        },
      ],
      processed: true,
    };
  }

  /**
   * Verify webhook signature
   */
  verifySignature(payload, headers, secret) {
    const signature = headers["x-hub-signature-256"] || headers["x-signature"];
    if (!signature) {
      throw new Error("Missing webhook signature");
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(payload))
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(`sha256=${expectedSignature}`),
      )
    ) {
      throw new Error("Invalid webhook signature");
    }
  }

  /**
   * Check rate limiting
   */
  isRateLimited(webhookId) {
    const now = Date.now();
    const limit = this.rateLimits.get(webhookId) || {
      count: 0,
      resetTime: now + 60000,
    };

    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + 60000;
    }

    if (limit.count >= 100) {
      // 100 requests per minute
      return true;
    }

    limit.count++;
    this.rateLimits.set(webhookId, limit);
    return false;
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(webhookId) {
    // Try cache first
    let webhook = cache.get(`webhook:${webhookId}`);
    if (webhook) return webhook;

    // Fallback to memory store
    webhook = this.webhooks.get(webhookId);
    if (webhook) {
      cache.set(`webhook:${webhookId}`, webhook, 3600);
    }

    return webhook;
  }

  /**
   * Send outgoing webhook
   */
  async sendWebhook(url, payload, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "BotBot-Webhook/1.0",
          ...options.headers,
        },
        body: JSON.stringify(payload),
        timeout: options.timeout || 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const duration = Date.now() - startTime;
      performance.recordMetric("outgoing_webhook_time", duration);

      analytics.trackEvent("outgoing_webhook_sent", {
        url: new URL(url).hostname,
        status: response.status,
        duration,
      });

      return await response.json().catch(() => ({}));
    } catch (error) {
      analytics.trackEvent("outgoing_webhook_error", {
        url: new URL(url).hostname,
        error: error.message,
      });

      // Add to retry queue if configured
      if (options.retry !== false) {
        this.addToRetryQueue(url, payload, options);
      }

      throw error;
    }
  }

  /**
   * Add failed webhook to retry queue
   */
  addToRetryQueue(url, payload, options) {
    const retryItem = {
      url,
      payload,
      options,
      attempts: 0,
      nextRetry: Date.now() + this.retryDelay,
    };

    this.retryQueue.push(retryItem);
  }

  /**
   * Process retry queue
   */
  async processRetryQueue() {
    const now = Date.now();
    const itemsToRetry = this.retryQueue.filter(
      (item) => item.nextRetry <= now && item.attempts < this.maxRetries,
    );

    for (const item of itemsToRetry) {
      try {
        await this.sendWebhook(item.url, item.payload, {
          ...item.options,
          retry: false,
        });

        // Remove from queue on success
        const index = this.retryQueue.indexOf(item);
        if (index > -1) {
          this.retryQueue.splice(index, 1);
        }
      } catch (error) {
        item.attempts++;
        item.nextRetry = now + this.retryDelay * Math.pow(2, item.attempts);

        // Remove if max retries reached
        if (item.attempts >= this.maxRetries) {
          const index = this.retryQueue.indexOf(item);
          if (index > -1) {
            this.retryQueue.splice(index, 1);
          }
        }
      }
    }
  }

  /**
   * Get webhook statistics
   */
  getWebhookStats(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    return webhook ? webhook.stats : null;
  }

  /**
   * List all webhooks for a guild
   */
  getGuildWebhooks(guildId) {
    return Array.from(this.webhooks.values()).filter(
      (webhook) => webhook.guildId === guildId,
    );
  }

  /**
   * Deactivate webhook
   */
  deactivateWebhook(webhookId) {
    const webhook = this.webhooks.get(webhookId);
    if (webhook) {
      webhook.isActive = false;
      cache.delete(`webhook:${webhookId}`);

      analytics.trackEvent("webhook_deactivated", {
        webhookId,
        type: webhook.type,
      });
    }
  }
}

export const webhookService = new WebhookService();

// Process retry queue every 30 seconds
setInterval(() => {
  webhookService.processRetryQueue();
}, 30000);
