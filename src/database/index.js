/**
 * Database and manager initialization
 */
const sqlite3 = require('sqlite3').verbose();
const SchemaUpgrader = require('./schemaUpgrader');
const CategoryManager = require('./categoryManager');
const ReactionManager = require('./reactionManager');
const ReminderManager = require('./reminderManager');

/**
 * Initialize database and managers
 * @returns {Object} Database and manager instances
 */
async function initializeDatabase() {
  // Initialize SQLite database
  const db = new sqlite3.Database('./reminders.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
  
  // Upgrade schema if needed
  const schemaUpgrader = new SchemaUpgrader(db);
  await schemaUpgrader.upgrade();
  
  // Initialize managers
  const categoryManager = new CategoryManager(db);
  const reactionManager = new ReactionManager(db);
  const reminderManager = new ReminderManager(db);
  
  return {
    db,
    categoryManager,
    reactionManager,
    reminderManager
  };
}

module.exports = {
  initializeDatabase
};
