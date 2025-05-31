import { fileURLToPath } from 'url';
import path from 'path';
import sqlite3 from 'sqlite3';
import { logger } from '../utils/logger.js';
import config from '../config.js';

// Import managers
import AgentManager from './agentManager.js';
import CategoryManager from './categoryManager.js';
import GuildManager from './guildManager.js';
import ReactionManager from './reactionManager.js';
import ReminderManager from './reminderManager.js';
import ReminderManagerExtended from './reminderManagerExtended.js';
import RetroManager from '../features/retroManager.js'; // Added
import StandupManager from '../features/standupManager.js'; // Added

// Import services
import GameService from '../services/gameService.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const promisifyDb = (sqliteDb) => ({
  run: (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function(err) {
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
});

export async function initializeDatabase(client) { // Added client parameter if Retro/Standup managers need it
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
    const sqlite = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        logger.error('Error opening database:', err.message);
        throw err;
      }
      logger.info('Connected to the SQLite database');
    });
    
    const db = sqlite;
    const promisifiedMethods = promisifyDb(db);
    db.runAsync = promisifiedMethods.run;
    db.getAsync = promisifiedMethods.get;
    db.allAsync = promisifiedMethods.all;
    db.eachAsync = function(sql, params = []) {
      return new Promise((resolve, reject) => {
        const rows = [];
        this.each(sql, params, (err, row) => {
          if (err) return reject(err);
          rows.push(row);
        }, (errOuter, count) => {
          if (errOuter) return reject(errOuter);
          resolve(rows);
        });
      });
    };
    
    await db.runAsync('PRAGMA journal_mode = WAL');
    await db.runAsync('PRAGMA foreign_keys = ON');
    await db.runAsync('PRAGMA busy_timeout = 5000');

    logger.info('Skipping migrations for now (TODO: Implement migration runner)');

    // Initialize managers
    const agentManager = new AgentManager(db);
    await agentManager.initializeDatabase();

    const categoryManager = new CategoryManager(db);
    // No async init for categoryManager

    const guildManager = new GuildManager(db);
    // No async init for guildManager

    const reactionManager = new ReactionManager(db);
    // No async init for reactionManager

    const reminderManager = new ReminderManager(db);
    // No async init for reminderManager

    const reminderManagerExtended = new ReminderManagerExtended(db);
    await reminderManagerExtended.setupTables();

    const retroManager = new RetroManager(client, db); // Assuming client is needed
    await retroManager.setupDatabase();
    // retroManager.initialize(); // Schedules cron jobs, might not need await if it's fire-and-forget
                               // but if it involves async ops itself, it should be awaited.
                               // For now, assuming it can run in background.

    const standupManager = new StandupManager(client, db); // Assuming client is needed
    await standupManager.setupDatabase();
    // standupManager.initialize(); // Same as retroManager.initialize

    // Initialize services
    const gameService = new GameService(db);

    logger.info('Database and managers initialized successfully');
    
    return {
      db,
      agentManager,
      categoryManager,
      guildManager,
      reactionManager,
      reminderManager,
      reminderManagerExtended,
      retroManager, // Added
      standupManager, // Added
      gameService,
      runInTransaction: async (fn) => {
        await db.runAsync('BEGIN TRANSACTION');
        try {
          const result = await fn(db);
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

const dbModule = {
  initializeDatabase
};

export default dbModule;
