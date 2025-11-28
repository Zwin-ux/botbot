/**
 * Configuration Types
 * Type definitions for application configuration
 */

/**
 * Feature flags configuration
 */
export interface FeatureFlags {
  GAMES: boolean;
  REMINDERS: boolean;
  STANDUPS: boolean;
  RETROS: boolean;
}

/**
 * Cache TTL configuration (in seconds)
 */
export interface CacheTTL {
  DEFAULT: number;
  USER: number;
  GUILD: number;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

/**
 * Retry configuration for external services
 */
export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

/**
 * Application configuration interface
 */
export interface AppConfig {
  // Environment
  NODE_ENV: string;
  isProduction: boolean;
  isTest: boolean;
  isDevelopment: boolean;
  PORT: number;

  // Discord
  DISCORD_TOKEN?: string;
  CLIENT_ID?: string;
  OWNER_IDS: string[];
  DEFAULT_PREFIX: string;

  // Slack (future)
  SLACK_TOKEN?: string;
  SLACK_APP_TOKEN?: string;

  // LLM
  OPENAI_API_KEY?: string;
  LLM_PROVIDER?: string;

  // Paths
  ROOT_DIR: string;
  SRC_DIR: string;
  DATA_DIR: string;

  // Database
  DB_PATH: string;
  DB_BACKUP_DIR: string;

  // Logging
  LOG_LEVEL: string;
  LOG_FILE: string;

  // Rate limiting
  RATE_LIMIT: RateLimitConfig;

  // Game settings
  GAME_COOLDOWN: number;
  MAX_GAME_PLAYERS: number;

  // Feature flags
  FEATURES: FeatureFlags;

  // Cache settings
  CACHE_TTL: CacheTTL;

  // Security
  MAX_MESSAGE_LENGTH: number;
  MAX_EMBED_FIELD_LENGTH: number;
  MAX_BUTTONS_PER_ROW: number;

  // Error handling
  ERROR_MESSAGE: string;
  COOLDOWN_MESSAGE: string;

  // Retry configuration
  RETRY: RetryConfig;
}
