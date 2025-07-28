/**
 * Initial database schema
 * Creates tables for games, game players, and other core tables
 */

export default {
  up: async (db) => {
    // Enable foreign keys
    await db.run("PRAGMA foreign_keys = ON");

    // Create games table
    await db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        game_type TEXT NOT NULL,
        created_by TEXT NOT NULL,
        winner_id TEXT,
        settings TEXT NOT NULL DEFAULT '{}',
        result TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        completed_at TEXT,
        CHECK (status IN ('pending', 'active', 'completed', 'cancelled'))
      )
    `);

    // Create game_players table
    await db.run(`
      CREATE TABLE IF NOT EXISTS game_players (
        game_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT,
        PRIMARY KEY (game_id, user_id),
        FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
      )
    `);

    // Create reminders table (if not exists)
    await db.run(`
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        content TEXT NOT NULL,
        due_time INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER,
        category_id INTEGER,
        priority INTEGER DEFAULT 0,
        CHECK (status IN ('pending', 'completed', 'snoozed', 'cancelled'))
      )
    `);

    // Create categories table (if not exists)
    await db.run(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        emoji TEXT NOT NULL,
        description TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create reactions table (if not exists)
    await db.run(`
      CREATE TABLE IF NOT EXISTS reactions (
        reminder_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        emoji TEXT NOT NULL,
        added_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (reminder_id, user_id, emoji),
        FOREIGN KEY(reminder_id) REFERENCES reminders(id) ON DELETE CASCADE
      )
    `);

    // Create indexes
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_games_channel_status ON games(channel_id, status)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_games_status ON games(status)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_game_players_game ON game_players(game_id)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_game_players_user ON game_players(user_id)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(user_id)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(due_time)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_reactions_reminder ON reactions(reminder_id)",
    );
    await db.run(
      "CREATE INDEX IF NOT EXISTS idx_reactions_user ON reactions(user_id)",
    );
  },

  down: async (db) => {
    // Drop tables in reverse order of creation
    await db.run("DROP TABLE IF EXISTS reactions");
    await db.run("DROP TABLE IF EXISTS game_players");
    await db.run("DROP TABLE IF EXISTS games");
    await db.run("DROP TABLE IF EXISTS reminders");
    await db.run("DROP TABLE IF EXISTS categories");
  },
};
