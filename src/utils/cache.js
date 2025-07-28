/**
 * Advanced caching system for BotBot
 * Provides intelligent caching with TTL, LRU eviction, and memory management
 */

class CacheEntry {
  constructor(value, ttl = 0) {
    this.value = value;
    this.createdAt = Date.now();
    this.expiresAt = ttl > 0 ? Date.now() + ttl : 0;
    this.accessCount = 0;
    this.lastAccessed = Date.now();
  }

  isExpired() {
    return this.expiresAt > 0 && Date.now() > this.expiresAt;
  }

  touch() {
    this.accessCount++;
    this.lastAccessed = Date.now();
  }
}

class SmartCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 0; // 0 = no expiration
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute

    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0,
    };

    // Start cleanup interval
    this.cleanupTimer = setInterval(() => this.cleanup(), this.cleanupInterval);
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (entry.isExpired()) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    entry.touch();
    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   */
  set(key, value, ttl = this.defaultTTL) {
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry = new CacheEntry(value, ttl);
    this.cache.set(key, entry);
    this.stats.sets++;
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry || entry.isExpired()) {
      return false;
    }
    return true;
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   * @returns {boolean} True if key was deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.resetStats();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (
            (this.stats.hits / (this.stats.hits + this.stats.misses)) *
            100
          ).toFixed(2)
        : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Get memory usage estimate
   * @returns {Object} Memory usage info
   */
  getMemoryUsage() {
    let totalSize = 0;

    for (const [key, entry] of this.cache) {
      // Rough estimate of memory usage
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += JSON.stringify(entry.value).length * 2;
      totalSize += 64; // Overhead for entry object
    }

    return {
      bytes: totalSize,
      kb: (totalSize / 1024).toFixed(2),
      mb: (totalSize / (1024 * 1024)).toFixed(2),
    };
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const before = this.cache.size;

    for (const [key, entry] of this.cache) {
      if (entry.isExpired()) {
        this.cache.delete(key);
      }
    }

    const cleaned = before - this.cache.size;
    if (cleaned > 0) {
      this.stats.cleanups++;
    }
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      cleanups: 0,
    };
  }

  /**
   * Destroy cache and cleanup timers
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Create specialized caches for different use cases
const userCache = new SmartCache({
  maxSize: 500,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
});

const intentCache = new SmartCache({
  maxSize: 1000,
  defaultTTL: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
});

const responseCache = new SmartCache({
  maxSize: 200,
  defaultTTL: 15 * 60 * 1000, // 15 minutes
  cleanupInterval: 5 * 60 * 1000, // 5 minutes
});

// Default cache instance
const cache = new SmartCache({
  maxSize: 1000,
  defaultTTL: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
});

export { SmartCache, userCache, intentCache, responseCache, cache };
