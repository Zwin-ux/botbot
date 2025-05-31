import { fileURLToPath } from 'url';
import path from 'path';
import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger.js';
import config from '../config.js';

// Import managers
import AgentManager from './agentManager.js'; // Added
import CategoryManager from './categoryManager.js';
import GuildManager from './guildManager.js';
import ReactionManager from './reactionManager.js';
import ReminderManager from './reminderManager.js';
import ReminderManagerExtended from './reminderManagerExtended.js'; // Added

// Import services
import GameService from '../services/gameService.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify database methods for the raw sqlite3 instance
const promisifyDb = (sqliteDb) => ({
  run: (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function(err) { // Use function() for this.lastID/changes
      if (err) reject(err);
      else resolve(this);
    });
  }),
  get: (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  all: (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  }),
  // each is not easily promisified to return all rows, usually used for streaming.
  // The existing eachAsync in the original file was a custom promisification.
  // For simplicity, if each is needed, it can be wrapped where used or a different approach taken.
});

/**
 * Initialize database and managers
 * @returns {Promise<Object>} Database and manager instances
 */
export async function initializeDatabase() {
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

  const dbPath = path.join(config.DATA_DIR, 'botbot.db');
  logger.info(`Initializing database: ${dbPath}`);

  try {
    // Open the database using sqlite3 directly
    const sqlite = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err.message);
        throw err; // This error needs to be caught by the outer try/catch
      }
      logger.info('Connected to the SQLite database');
    });
    
    // This 'db' object is the raw sqlite3.Database instance.
    // We will augment it with promisified methods.
    const db = sqlite;
    const promisifiedMethods = promisifyDb(db);
    db.runAsync = promisifiedMethods.run;
    db.getAsync = promisifiedMethods.get;
    db.allAsync = promisifiedMethods.all;
    // Retaining custom eachAsync if it was used, though it's not standard.
    // It's better to use allAsync if all rows are needed.
    db.eachAsync = function(sql, params = []) {
      return new Promise((resolve, reject) => {
        const rows = [];
        this.each(sql, params, (err, row) => { // 'this' here refers to the sqlite.Database instance
          if (err) return reject(err);
          rows.push(row);
        }, (errOuter, count) => { // The callback for db.each has (err, count)
          if (errOuter) return reject(errOuter);
          resolve(rows); // Resolve with all rows collected
        });
      });
    };
    
    await db.runAsync('PRAGMA journal_mode = WAL');
    await db.runAsync('PRAGMA foreign_keys = ON');
    await db.runAsync('PRAGMA busy_timeout = 5000');
    
    // TODO: Implement actual migration runner call here instead of skipping
    logger.info('Skipping migrations for now (TODO: Implement migration runner)');
    
    // Initialize managers
    const agentManager = new AgentManager(db);
    await agentManager.initializeDatabase(); // Call async initialization

    const categoryManager = new CategoryManager(db);
    // categoryManager does not have an async init method in its class structure

    const guildManager = new GuildManager(db);
    // guildManager does not have an async init method

    const reactionManager = new ReactionManager(db);
    // reactionManager does not have an async init method

    const reminderManager = new ReminderManager(db);
    // reminderManager does not have an async init method

    const reminderManagerExtended = new ReminderManagerExtended(db);
    await reminderManagerExtended.setupTables(); // Call async initialization
    
    // Initialize services
    const gameService = new GameService(db); // Assuming GameService constructor is sync
    
    logger.info('Database and managers initialized successfully');
    
    return {
      db, // The augmented db instance
      agentManager,
      categoryManager,
      guildManager,
      reactionManager,
      reminderManager,
      reminderManagerExtended,
      gameService,
      runInTransaction: async (fn) => {
        await db.runAsync('BEGIN TRANSACTION');
        try {
          const result = await fn(db); // Pass the augmented db to the transaction function
          await db.runAsync('COMMIT');
          return result;
        } catch (error) {
          await db.runAsync('ROLLBACK');
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

// For backward compatibility with CommonJS (though the project is ES6)
const dbModule = {
  initializeDatabase
};

export default dbModule;
