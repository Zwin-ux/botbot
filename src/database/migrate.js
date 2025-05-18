import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Promisify database methods with better error handling and logging
 * @param {import('sqlite3').Database} db - SQLite database instance
 * @returns {Object} Promisified database methods
 */
const promisifyDb = (db) => ({
  run: (sql, params = []) => new Promise((resolve, reject) => {
    logger.debug(`Executing SQL: ${sql}`, { params });
    db.run(sql, params, function(err) {
      if (err) {
        logger.error('Database error in run()', { error: err, sql, params });
        return reject(err);
      }
      resolve(this);
    });
  }),
  
  get: (sql, params = []) => new Promise((resolve, reject) => {
    logger.debug(`Querying SQL: ${sql}`, { params });
    db.get(sql, params, (err, row) => {
      if (err) {
        logger.error('Database error in get()', { error: err, sql, params });
        return reject(err);
      }
      resolve(row);
    });
  }),
  
  all: (sql, params = []) => new Promise((resolve, reject) => {
    logger.debug(`Querying all SQL: ${sql}`, { params });
    db.all(sql, params, (err, rows) => {
      if (err) {
        logger.error('Database error in all()', { error: err, sql, params });
        return reject(err);
      }
      resolve(rows || []);
    });
  }),
  
  /**
   * Execute a database transaction
   * @param {Function} callback - Async function containing transaction logic
   * @returns {Promise<*>} Result of the transaction
   */
  transaction: async function(callback) {
    try {
      await this.run('BEGIN TRANSACTION');
      const result = await callback();
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      logger.error('Transaction failed', { error });
      throw error;
    }
  },
  
  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  close: () => new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        logger.error('Error closing database', { error: err });
        return reject(err);
      }
      logger.info('Database connection closed');
      resolve();
    });
  })
});

/**
 * MigrationRunner handles database schema migrations
 */
class MigrationRunner {
  /** @type {import('sqlite3').Database} */
  db;
  /** @type {Function} */
  run;
  /** @type {Function} */
  get;
  /** @type {Function} */
  all;
  /** @type {Function} */
  transaction;
  /** @type {Function} */
  close;

  /**
   * Create a new MigrationRunner instance
   * @param {import('sqlite3').Database} db - SQLite database instance
   */
  constructor(db) {
    this.db = db;
    const dbMethods = promisifyDb(db);
    this.run = dbMethods.run.bind(this);
    this.get = dbMethods.get.bind(this);
    this.all = dbMethods.all.bind(this);
    this.transaction = dbMethods.transaction.bind(this);
    this.close = dbMethods.close.bind(this);
  }

  /**
   * Initialize the migrations table and ensure it has all required columns
   * @private
   * @returns {Promise<void>}
   */
  async init() {
    'use strict';
    logger.info('Initializing migrations table...');
    
    // Create migrations table if it doesn't exist
    await this.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        batch INTEGER NOT NULL DEFAULT 1,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'completed',
        error TEXT,
        execution_time_ms INTEGER
      )
    `);
    
    // Add missing columns if they don't exist
    const columns = await this.all("PRAGMA table_info(migrations)");
    const columnNames = columns.map(col => col.name);
    const missingColumns = [];
    
    if (!columnNames.includes('batch')) {
      missingColumns.push('batch INTEGER NOT NULL DEFAULT 1');
    }
    if (!columnNames.includes('status')) {
      missingColumns.push('status TEXT NOT NULL DEFAULT "completed"');
    }
    if (!columnNames.includes('error')) {
      missingColumns.push('error TEXT');
    }
    if (!columnNames.includes('execution_time_ms')) {
      missingColumns.push('execution_time_ms INTEGER');
    }
    
    // Add any missing columns
    for (const columnDef of missingColumns) {
      const columnName = columnDef.split(' ')[0];
      logger.debug(`Adding missing column: ${columnName}`);
      try {
        await this.run(`ALTER TABLE migrations ADD COLUMN ${columnDef}`);
      } catch (error) {
        // Handle case where column might have been added by another process
        if (!error.message.includes('duplicate column')) {
          throw error;
        }
      }
    }
  }

  /**
   * Get a set of completed migration names
   * @returns {Promise<Set<string>>} Set of completed migration names
   */
  async getCompletedMigrations() {
    const rows = await this.all('SELECT name FROM migrations ORDER BY name');
    return new Set(rows.map(row => row.name));
  }

  /**
   * Run all pending migrations
   * @returns {Promise<number>} Number of migrations that were run
   */
  async runMigrations() {
    await this.init();
    const completed = await this.getCompletedMigrations();
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Get all migration files
    const files = (await fs.readdir(migrationsDir))
      .filter(file => file.endsWith('.js'))
      .sort();
    
    // Find the next batch number
    const lastBatch = await this.get('SELECT MAX(batch) as maxBatch FROM migrations') || { maxBatch: 0 };
    const nextBatch = (lastBatch.maxBatch || 0) + 1;
    
    let count = 0;
    
    for (const file of files) {
      if (!completed.has(file)) {
        console.log(`Running migration: ${file}`);
        const migrationPath = path.join('file://', migrationsDir, file);
        
        // Dynamically import the migration module
        const migration = (await import(migrationPath)).default;
        
        // Run migration in a transaction
        await this.run('BEGIN TRANSACTION');
        try {
          if (typeof migration.up === 'function') {
            await migration.up(this.db);
          }
          
          await this.run(
            'INSERT INTO migrations (name, batch) VALUES (?, ?)',
            [file, nextBatch]
          );
          
          await this.run('COMMIT');
          count++;
          console.log(`✓ ${file} completed`);
        } catch (error) {
          await this.run('ROLLBACK');
          console.error(`✗ ${file} failed:`, error.message);
          throw error;
        }
      }
    }
    
    if (count === 0) {
      console.log('No pending migrations found');
    } else {
      console.log(`\nSuccessfully ran ${count} migration(s) in batch ${nextBatch}`);
    }
    
    return count;
  }

  /**
   * Rollback the most recent batch of migrations
   * @param {number} [steps=1] Number of migrations to rollback
   * @returns {Promise<number>} Number of migrations that were rolled back
   */
  async rollback(steps = 1) {
    await this.init();
    
    // Get the latest batch of migrations
    const latestBatch = await this.get('SELECT MAX(batch) as maxBatch FROM migrations') || { maxBatch: 0 };
    
    if (!latestBatch.maxBatch) {
      console.log('No migrations to rollback');
      return 0;
    }
    
    // Get migrations from the latest batch
    const migrations = await this.all(
      'SELECT name FROM migrations WHERE batch = ? ORDER BY id DESC',
      [latestBatch.maxBatch]
    );
    
    // Limit to the number of steps
    const migrationsToRollback = migrations.slice(0, steps);
    
    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback');
      return 0;
    }
    
    console.log(`Rolling back ${migrationsToRollback.length} migration(s) from batch ${latestBatch.maxBatch}:`);
    
    for (const { name } of migrationsToRollback) {
      console.log(`↩️ Rolling back: ${name}`);
      const migrationPath = path.join('file://', __dirname, 'migrations', name);
      
      // Dynamically import the migration module
      const migration = (await import(migrationPath)).default;
      
      await this.run('BEGIN TRANSACTION');
      try {
        if (typeof migration.down === 'function') {
          await migration.down(this.db);
        }
        
        await this.run('DELETE FROM migrations WHERE name = ?', [name]);
        await this.run('COMMIT');
        console.log(`✓ Rolled back: ${name}`);
      } catch (error) {
        await this.run('ROLLBACK');
        console.error(`✗ Failed to rollback ${name}:`, error.message);
        throw error;
      }
    }
    
    console.log(`\nSuccessfully rolled back ${migrationsToRollback.length} migration(s)`);
    return migrationsToRollback.length;
  }
}

// Export the MigrationRunner class
export { MigrationRunner };
