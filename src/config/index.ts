/**
 * Configuration Module
 * Centralized configuration management for BotBot v2
 * 
 * All configuration is loaded from environment variables.
 * No hardcoded secrets in source code.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { AppConfig, RetryConfig } from './types';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');
const SRC_DIR = path.resolve(__dirname, '..');

// Environment detection
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';
const isDevelopment = !isProduction && !isTest;

// Default retry configuration
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['RATE_LIMIT', 'TIMEOUT', 'SERVICE_UNAVAILABLE'],
};

// Data directory
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(ROOT_DIR, 'data'));

// Ensure data directory exists
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Application configuration
 * Combines defaults with environment-specific overrides
 */
const config: AppConfig = {
  // Environment
  NODE_ENV,
  isProduction,
  isTest,
  isDevelopment,
  PORT: parseInt(process.env.PORT || '3000', 10),

  // Discord
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  OWNER_IDS: (process.env.OWNER_IDS || '').split(',').filter(Boolean),
  DEFAULT_PREFIX: '!',

  // Slack
  SLACK_TOKEN: process.env.SLACK_TOKEN,
  SLACK_APP_TOKEN: process.env.SLACK_APP_TOKEN,

  // LLM
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'openai',

  // Paths
  ROOT_DIR,
  SRC_DIR,
  DATA_DIR,

  // Database
  DB_PATH: path.resolve(process.env.DB_PATH || path.join(DATA_DIR, 'botbot.db')),
  DB_BACKUP_DIR: path.resolve(process.env.DB_BACKUP_DIR || path.join(ROOT_DIR, 'backups')),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  LOG_FILE: process.env.LOG_FILE || (isProduction ? 'botbot.log' : 'botbot-dev.log'),

  // Rate limiting
  RATE_LIMIT: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '10', 10),
  },

  // Game settings
  GAME_COOLDOWN: parseInt(process.env.GAME_COOLDOWN || '3600000', 10),
  MAX_GAME_PLAYERS: parseInt(process.env.MAX_GAME_PLAYERS || '10', 10),

  // Feature flags
  FEATURES: {
    GAMES: process.env.FEATURE_GAMES !== 'false',
    REMINDERS: process.env.FEATURE_REMINDERS !== 'false',
    STANDUPS: process.env.FEATURE_STANDUPS !== 'false',
    RETROS: process.env.FEATURE_RETROS !== 'false',
  },

  // Cache settings
  CACHE_TTL: {
    DEFAULT: 300,
    USER: 3600,
    GUILD: 3600,
  },

  // Security
  MAX_MESSAGE_LENGTH: 2000,
  MAX_EMBED_FIELD_LENGTH: 1024,
  MAX_BUTTONS_PER_ROW: 5,

  // Error handling
  ERROR_MESSAGE: '❌ An error occurred. The developers have been notified.',
  COOLDOWN_MESSAGE: '⏳ Please wait before using that command again.',

  // Retry configuration
  RETRY: defaultRetryConfig,
};

// Apply test overrides
if (isTest) {
  config.LOG_LEVEL = 'error';
  config.DATA_DIR = path.resolve(ROOT_DIR, 'test/data');
  config.DB_PATH = path.resolve(ROOT_DIR, 'test/data/test.db');
  config.FEATURES = {
    GAMES: true,
    REMINDERS: true,
    STANDUPS: false,
    RETROS: false,
  };
}

export default config;
export * from './types';
