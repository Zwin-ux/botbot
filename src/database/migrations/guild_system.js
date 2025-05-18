/**
 * Guild/Clan System Database Migration
 * Creates the necessary tables for supporting guilds/clans functionality
 */

function up(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create guilds table
      db.run(`
        CREATE TABLE IF NOT EXISTS guilds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          emoji TEXT,
          ownerId TEXT NOT NULL,
          createdAt INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int))
        )
      `);

      // Create guild_members table
      db.run(`
        CREATE TABLE IF NOT EXISTS guild_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guildId INTEGER NOT NULL,
          userId TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'member',
          joinedAt INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
          FOREIGN KEY (guildId) REFERENCES guilds(id) ON DELETE CASCADE,
          UNIQUE(guildId, userId)
        )
      `);

      // Create guild_invites table
      db.run(`
        CREATE TABLE IF NOT EXISTS guild_invites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guildId INTEGER NOT NULL,
          inviterId TEXT NOT NULL,
          inviteeId TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          createdAt INTEGER NOT NULL DEFAULT (cast(strftime('%s', 'now') as int)),
          expiresAt INTEGER,
          FOREIGN KEY (guildId) REFERENCES guilds(id) ON DELETE CASCADE
        )
      `);

      // Create guild_settings table for guild-specific configurations
      db.run(`
        CREATE TABLE IF NOT EXISTS guild_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          guildId INTEGER NOT NULL,
          settingKey TEXT NOT NULL,
          settingValue TEXT,
          FOREIGN KEY (guildId) REFERENCES guilds(id) ON DELETE CASCADE,
          UNIQUE(guildId, settingKey)
        )
      `);

      // Add indexes for performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guildId)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_guild_members_user ON guild_members(userId)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_guild_invites_invitee ON guild_invites(inviteeId)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_guild_invites_status ON guild_invites(status)`);

      // Add columns to reminders table to support guild tasks/reminders
      db.run(`
        ALTER TABLE reminders ADD COLUMN guildId INTEGER DEFAULT NULL;
      `, (err) => {
        // Ignore error if column already exists
        console.log(err ? `Warning: ${err.message}` : 'Added guildId column to reminders table');
      });

      // Create relationship between reminders and guilds
      db.run(`
        CREATE INDEX IF NOT EXISTS idx_reminders_guild ON reminders(guildId)
      `);
    });

    resolve();
  });
}

function down(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Drop all created tables and indexes in reverse order
      db.run(`DROP INDEX IF EXISTS idx_reminders_guild`);
      db.run(`DROP INDEX IF EXISTS idx_guild_invites_status`);
      db.run(`DROP INDEX IF EXISTS idx_guild_invites_invitee`);
      db.run(`DROP INDEX IF EXISTS idx_guild_members_user`);
      db.run(`DROP INDEX IF EXISTS idx_guild_members_guild`);
      db.run(`DROP TABLE IF EXISTS guild_settings`);
      db.run(`DROP TABLE IF EXISTS guild_invites`);
      db.run(`DROP TABLE IF EXISTS guild_members`);
      db.run(`DROP TABLE IF EXISTS guilds`);
    });

    resolve();
  });
}

module.exports = { up, down };
