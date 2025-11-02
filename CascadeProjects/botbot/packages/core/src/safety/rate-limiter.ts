import Redis from 'ioredis';
import type { RateLimitConfig, RateLimitResult } from '@botbot/shared';

export class RateLimiter {
  private redis: Redis;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async checkLimit(
    key: string,
    config: RateLimitConfig = {
      windowMs: 60 * 1000,
      maxRequests: 20,
      keyPrefix: 'rate:',
    }
  ): Promise<RateLimitResult> {
    const fullKey = `${config.keyPrefix}${key}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis sorted set for sliding window
    const multi = this.redis.multi();

    // Remove old entries
    multi.zremrangebyscore(fullKey, 0, windowStart);

    // Count requests in window
    multi.zcard(fullKey);

    // Add current request
    multi.zadd(fullKey, now, `${now}`);

    // Set expiry
    multi.expire(fullKey, Math.ceil(config.windowMs / 1000));

    const results = await multi.exec();

    if (!results) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(now + config.windowMs),
      };
    }

    const count = (results[1][1] as number) || 0;
    const allowed = count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count - 1);
    const resetAt = new Date(now + config.windowMs);

    return {
      allowed,
      remaining,
      resetAt,
    };
  }

  async reset(key: string, keyPrefix: string = 'rate:'): Promise<void> {
    await this.redis.del(`${keyPrefix}${key}`);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
