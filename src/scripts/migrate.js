#!/usr/bin/env node

const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { fileURLToPath } = require('url');
const { dirname } = require('path');
const fs = require('fs').promises;

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the migration runner (using dynamic import for ES modules)
let MigrationRunner;

async function main() {
  try {
    // Import the migration runner
    const migrateModule = await import('../database/migrate.js');
    MigrationRunner = migrateModule.default || migrateModule;
    
    // Parse command line arguments
    const rollback = process.argv.includes('--rollback');
    const steps = process.argv[3] || 1;
    
    // Get environment variables
    const dataDir = process.env.DATA_DIR || './data';
    const nodeEnv = process.env.NODE_ENV || 'development';
    
    console.log(`Environment: ${nodeEnv}`);
    console.log(`Data directory: ${path.resolve(dataDir)}`);
    
    // Ensure data directory exists
    try {
      await fs.mkdir(dataDir, { recursive: true });
      console.log(`Created data directory: ${path.resolve(dataDir)}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
    
    const dbPath = path.join(dataDir, 'botbot.db');
    console.log(`Using database: ${dbPath}`);
    
    // Initialize database
    const db = new sqlite3.Database(dbPath);
    
    // Enable WAL mode and foreign keys
    await new Promise((resolve, reject) => {
      db.serialize(() => {
        db.run('PRAGMA journal_mode=WAL', (err) => {
          if (err) return reject(err);
          db.run('PRAGMA foreign_keys=ON', (err) => {
            if (err) return reject(err);
            resolve();
          });
        });
      });
    });
    
    // Run migrations
    const migrationRunner = new MigrationRunner(db);
    
    if (rollback) {
      console.log(`Rolling back ${steps} migration(s)...`);
      const count = await migrationRunner.rollback(parseInt(steps, 10));
      console.log(`Successfully rolled back ${count} migration(s)`);
    } else {
      console.log('Running migrations...');
      const count = await migrationRunner.runMigrations();
      console.log(`Successfully ran ${count} migration(s)`);
    }
    
    // Close the database connection
    db.close();
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
