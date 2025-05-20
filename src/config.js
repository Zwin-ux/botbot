import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';
const isDevelopment = !isProduction && !isTest;

/**
 * Application configuration
 * Combines defaults with environment-specific overrides
 */
const defaults = {
  // Application
  NODE_ENV,
  isProduction,
  isTest,
  isDevelopment,
  PORT: parseInt(process.env.PORT || '3000', 10),
  
  // Discord
  DISCORD_TOKEN: process.env.DISCORD_TOKEN,
  CLIENT_ID: process.env.CLIENT_ID,
  OWNER_IDS: (process.env.OWNER_IDS || '').split(',').filter(Boolean),
  DEFAULT_PREFIX: '!', // Not used in natural language mode
  
  // Paths
  ROOT_DIR: path.resolve(__dirname, '..'),
  SRC_DIR: path.resolve(__dirname, '.'),
  DATA_DIR: path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data')),
  
  // Database
  DB_PATH: path.resolve(
    process.env.DB_PATH || 
    path.join(process.env.DATA_DIR || path.join(__dirname, '../data'), 'botbot.db')
  ),
  DB_BACKUP_DIR: path.resolve(process.env.DB_BACKUP_DIR || path.join(__dirname, '../backups')),
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  LOG_FILE: process.env.LOG_FILE || (isProduction ? 'botbot.log' : 'botbot-dev.log'),
  
  // Rate limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '10', 10), // 10 requests per window
  
  // Game settings
  GAME_COOLDOWN: parseInt(process.env.GAME_COOLDOWN || '3600000', 10), // 1 hour
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
    DEFAULT: 300, // 5 minutes
    USER: 3600, // 1 hour
    GUILD: 3600, // 1 hour
  },
  
  // Security
  MAX_MESSAGE_LENGTH: 2000,
  MAX_EMBED_FIELD_LENGTH: 1024,
  MAX_BUTTONS_PER_ROW: 5,
  
  // Error handling
  ERROR_MESSAGE: '❌ An error occurred. The developers have been notified.',
  COOLDOWN_MESSAGE: '⏳ Please wait before using that command again.',
};

// Production overrides
const production = {
  LOG_LEVEL: 'info',
  DB_BACKUP_HOUR: 3, // 3 AM
  DB_BACKUP_DAYS_TO_KEEP: 7,
};

// Test overrides
const test = {
  LOG_LEVEL: 'error',
  DATA_DIR: path.resolve(__dirname, '../test/data'),
  DB_PATH: path.resolve(__dirname, '../test/data/test.db'),
  LOG_LEVEL: 'error',
  FEATURES: {
    GAMES: true,
    REMINDERS: true,
    STANDUPS: false,
    RETROS: false,
  },
};

// Merge configurations
const config = {
  ...defaults,
  ...(isProduction ? production : {}),
  ...(isTest ? test : {}),
};

// Validate required configuration
const required = ['DISCORD_TOKEN'];
const missing = required.filter(key => !config[key]);

if (missing.length > 0) {
  console.error('Missing required configuration:', missing.join(', '));
  process.exit(1);
}

// Ensure data directory exists
// Use dynamic import for fs since we need to use it synchronously here
import { existsSync, mkdirSync } from 'fs';
if (!existsSync(config.DATA_DIR)) {
  mkdirSync(config.DATA_DIR, { recursive: true });
}

// Export configuration
export default config;
