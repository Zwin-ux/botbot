/**
 * Advanced rate limiting system for BotBot
 * Provides multiple rate limiting strategies and user-friendly responses
 */

class RateLimitBucket {
  constructor(capacity, refillRate, refillInterval = 1000) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.refillInterval = refillInterval;
    this.lastRefill = Date.now();
  }

  /**
   * Try to consume tokens from the bucket
   * @param {number} tokens - Number of tokens to consume
   * @returns {boolean} True if tokens were consumed
   */
  consume(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Refill tokens based on time elapsed
   */
  refill() {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd =
      Math.floor(timePassed / this.refillInterval) * this.refillRate;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Get time until next token is available
   * @returns {number} Milliseconds until next token
   */
  getTimeUntilRefill() {
    if (this.tokens > 0) return 0;

    const timeSinceLastRefill = Date.now() - this.lastRefill;
    return Math.max(0, this.refillInterval - timeSinceLastRefill);
  }

  /**
   * Get current status
   * @returns {Object} Bucket status
   */
  getStatus() {
    this.refill();
    return {
      tokens: this.tokens,
      capacity: this.capacity,
      percentage: Math.round((this.tokens / this.capacity) * 100),
      timeUntilRefill: this.getTimeUntilRefill(),
    };
  }
}

class AdvancedRateLimiter {
  constructor() {
    this.buckets = new Map();
    this.violations = new Map();
    this.configs = {
      // Global rate limits
      global: {
        capacity: 100,
        refillRate: 10,
        refillInterval: 1000,
      },
      // Per-user rate limits
      user: {
        capacity: 20,
        refillRate: 5,
        refillInterval: 1000,
      },
      // Command-specific limits
      command: {
        capacity: 10,
        refillRate: 2,
        refillInterval: 1000,
      },
      // Game-specific limits
      game: {
        capacity: 3,
        refillRate: 1,
        refillInterval: 60000, // 1 minute
      },
    };
  }

  /**
   * Check if action is rate limited
   * @param {string} type - Rate limit type (global, user, command, game)
   * @param {string} identifier - Unique identifier (userId, commandName, etc.)
   * @param {number} tokens - Number of tokens to consume
   * @returns {Object} Rate limit result
   */
  checkLimit(type, identifier, tokens = 1) {
    const key = `${type}:${identifier}`;
    const config = this.configs[type];

    if (!config) {
      return { allowed: true, reason: "No rate limit configured" };
    }

    // Get or create bucket
    if (!this.buckets.has(key)) {
      this.buckets.set(
        key,
        new RateLimitBucket(
          config.capacity,
          config.refillRate,
          config.refillInterval,
        ),
      );
    }

    const bucket = this.buckets.get(key);
    const allowed = bucket.consume(tokens);

    if (!allowed) {
      this.recordViolation(type, identifier);
      const status = bucket.getStatus();

      return {
        allowed: false,
        reason: "Rate limit exceeded",
        retryAfter: status.timeUntilRefill,
        status,
        message: this.getRateLimitMessage(type, status),
      };
    }

    return { allowed: true, status: bucket.getStatus() };
  }

  /**
   * Record a rate limit violation
   * @param {string} type - Rate limit type
   * @param {string} identifier - Identifier
   */
  recordViolation(type, identifier) {
    const key = `${type}:${identifier}`;
    const violations = this.violations.get(key) || {
      count: 0,
      firstViolation: Date.now(),
    };

    violations.count++;
    violations.lastViolation = Date.now();

    this.violations.set(key, violations);
  }

  /**
   * Get user-friendly rate limit message
   * @param {string} type - Rate limit type
   * @param {Object} status - Bucket status
   * @returns {string} User-friendly message
   */
  getRateLimitMessage(type, status) {
    const timeUntil = Math.ceil(status.timeUntilRefill / 1000);

    const messages = {
      global: `🚦 Whoa there! The bot is getting a lot of requests right now. Please wait ${timeUntil} seconds and try again.`,
      user: `⏳ You're sending commands a bit too quickly! Please wait ${timeUntil} seconds before trying again.`,
      command: `🎯 That command is being used frequently. Please wait ${timeUntil} seconds before using it again.`,
      game: `🎮 Games have a cooldown to keep things fair. Please wait ${Math.ceil(timeUntil / 60)} minutes before starting another game.`,
    };

    return (
      messages[type] || `Please wait ${timeUntil} seconds before trying again.`
    );
  }

  /**
   * Get rate limit status for identifier
   * @param {string} type - Rate limit type
   * @param {string} identifier - Identifier
   * @returns {Object} Status information
   */
  getStatus(type, identifier) {
    const key = `${type}:${identifier}`;
    const bucket = this.buckets.get(key);

    if (!bucket) {
      return { exists: false };
    }

    const violations = this.violations.get(key) || { count: 0 };

    return {
      exists: true,
      bucket: bucket.getStatus(),
      violations: violations.count,
      config: this.configs[type],
    };
  }

  /**
   * Reset rate limits for identifier
   * @param {string} type - Rate limit type
   * @param {string} identifier - Identifier
   */
  reset(type, identifier) {
    const key = `${type}:${identifier}`;
    this.buckets.delete(key);
    this.violations.delete(key);
  }

  /**
   * Update rate limit configuration
   * @param {string} type - Rate limit type
   * @param {Object} config - New configuration
   */
  updateConfig(type, config) {
    this.configs[type] = { ...this.configs[type], ...config };
  }

  /**
   * Get comprehensive statistics
   * @returns {Object} Rate limiter statistics
   */
  getStats() {
    const stats = {
      totalBuckets: this.buckets.size,
      totalViolations: 0,
      bucketsByType: {},
      violationsByType: {},
    };

    // Count violations
    for (const violations of this.violations.values()) {
      stats.totalViolations += violations.count;
    }

    // Group by type
    for (const key of this.buckets.keys()) {
      const [type] = key.split(":");
      stats.bucketsByType[type] = (stats.bucketsByType[type] || 0) + 1;
    }

    for (const key of this.violations.keys()) {
      const [type] = key.split(":");
      const violations = this.violations.get(key);
      stats.violationsByType[type] =
        (stats.violationsByType[type] || 0) + violations.count;
    }

    return stats;
  }

  /**
   * Clean up old buckets and violations
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    // Clean up old violations
    for (const [key, violations] of this.violations) {
      if (now - violations.lastViolation > maxAge) {
        this.violations.delete(key);
      }
    }

    // Clean up unused buckets (those with full tokens and no recent activity)
    for (const [key, bucket] of this.buckets) {
      bucket.refill();
      if (
        bucket.tokens === bucket.capacity &&
        now - bucket.lastRefill > maxAge
      ) {
        this.buckets.delete(key);
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new AdvancedRateLimiter();

// Set up periodic cleanup
setInterval(() => rateLimiter.cleanup(), 60 * 60 * 1000); // Every hour

export { AdvancedRateLimiter, RateLimitBucket, rateLimiter };
