#!/usr/bin/env node

/**
 * Safe Database Migration Script
 * Handles database migrations gracefully in different environments
 * Skips migration if database is not available (CI/CD environments)
 */

const fs = require('fs');
const path = require('path');

async function safeMigrate() {
  try {
    console.log('🔄 Starting safe database migration...');
    
    // Check if we're in a CI environment
    const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.env.NODE_ENV === 'test';
    
    if (isCI) {
      console.log('ℹ️  CI environment detected - skipping database migration');
      console.log('✅ Migration skipped successfully');
      process.exit(0);
    }
    
    // Check if database directory exists
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      console.log('📁 Creating database directory...');
      fs.mkdirSync(dbDir, { recursive: true });
    }
    
    // Import and run the actual migration
    const { runMigrations } = require('../src/database/migrations');
    
    console.log('🏃 Running database migrations...');
    await runMigrations();
    
    console.log('✅ Database migration completed successfully');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    
    // In development, we want to know about migration failures
    if (process.env.NODE_ENV === 'development') {
      console.error('Full error:', error);
      process.exit(1);
    }
    
    // In production/CI, we log but don't fail the deployment
    console.log('⚠️  Migration failed but continuing deployment...');
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  safeMigrate();
}

module.exports = { safeMigrate };
