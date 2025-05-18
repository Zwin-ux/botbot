import { fileURLToPath } from 'url';
import path from 'path';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { MigrationRunner } from './migrate.js';
import { logger } from '../utils/logger.js';
import config from '../config.js';

// Import managers
import CategoryManager from './categoryManager.js';
import ReactionManager from './reactionManager.js';
import ReminderManager from './reminderManager.js';
import GuildManager from './guildManager.js';

// Import services
import GameService from '../services/gameService.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify database methods
const promisifyDb = (db) => ({
  run: (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  }),
  get: (sql, params = []) => new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  all: (sql, params = []) => new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  })
});

/**
 * Initialize database and managers
 * @returns {Promise<Object>} Database and manager instances
 */
export async function initializeDatabase() {
  // Ensure data directory exists
  const fs = await import('fs/promises');
  try {
    await fs.mkdir(config.DATA_DIR, { recursive: true });
    logger.debug(`Created data directory: ${config.DATA_DIR}`);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      logger.error('Failed to create data directory:', error);
      throw error;
    }
  }

  // Initialize SQLite database with better-sqlite3
  const dbPath = path.join(config.DATA_DIR, 'botbot.db');
  logger.info(`Initializing database: ${dbPath}`);

  try {
    // Open the database
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
      verbose: config.NODE_ENV === 'development'
    });

    // Enable WAL mode for better concurrency
    await db.run('PRAGMA journal_mode = WAL');
    await db.run('PRAGMA foreign_keys = ON');
    await db.run('PRAGMA busy_timeout = 5000');
    
    // Run migrations
    try {
      const migrationRunner = new MigrationRunner(db);
      const count = await migrationRunner.runMigrations();
      logger.info(`Applied ${count} database migrations`);
    } catch (error) {
      logger.error('Database migration failed:', error);
      throw error;
    }
    
    // Initialize managers
    const categoryManager = new CategoryManager(db);
    const reactionManager = new ReactionManager(db);
    const reminderManager = new ReminderManager(db);
    const guildManager = new GuildManager(db);
    
    // Initialize services
    const gameService = new GameService(db);
    
    // Add promisified methods to db instance
    const dbMethods = promisifyDb(db);
    db.runAsync = dbMethods.run;
    db.getAsync = dbMethods.get;
    db.allAsync = dbMethods.all;
    
    // Add eachAsync method
    db.eachAsync = function(sql, params = []) {
      return new Promise((resolve, reject) => {
        const rows = [];
        db.each(sql, params, (err, row) => {
          if (err) return reject(err);
          rows.push(row);
        }, (err) => {
          if (err) return reject(err);
          resolve(rows);
        });
      });
    };
    
    logger.info('Database initialized successfully');
    
    return {
      db,
      categoryManager,
      reactionManager,
      reminderManager,
      guildManager,
      gameService,
      // Helper method for transactions
      runInTransaction: async (fn) => {
        await db.run('BEGIN TRANSACTION');
        try {
          const result = await fn(db);
          await db.run('COMMIT');
          return result;
        } catch (error) {
          await db.run('ROLLBACK');
          logger.error('Transaction failed:', error);
          throw error;
        }
      }
    };
    
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// For backward compatibility with CommonJS
const dbModule = {
  initializeDatabase
};

export default dbModule;
