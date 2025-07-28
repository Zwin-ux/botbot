const sqlite3 = require("sqlite3").verbose();

class AgentManager {
  constructor(db) {
    this.db = db;
    this.initializeDatabase();
  }

  initializeDatabase() {
    // Create tables if they don't exist
    this.db.serialize(() => {
      // Server-specific agent settings
      this.db.run(`CREATE TABLE IF NOT EXISTS agent_settings (
        guild_id TEXT PRIMARY KEY,
        agent_channel_id TEXT,
        owner_id TEXT NOT NULL,
        backup_owner_id TEXT,
        is_active BOOLEAN DEFAULT 1,
        safe_mode BOOLEAN DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);

      // Whitelisted admin users
      this.db.run(`CREATE TABLE IF NOT EXISTS agent_admins (
        guild_id TEXT,
        user_id TEXT,
        added_by TEXT,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild_id, user_id),
        FOREIGN KEY (guild_id) REFERENCES agent_settings(guild_id) ON DELETE CASCADE
      )`);

      // Audit log for all agent actions
      this.db.run(`CREATE TABLE IF NOT EXISTS agent_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id TEXT,
        user_id TEXT,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (guild_id) REFERENCES agent_settings(guild_id) ON DELETE CASCADE
      )`);
    });
  }

  // Agent Channel Management
  async setupAgentChannel(guildId, ownerId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO agent_settings 
         (guild_id, owner_id, updated_at) 
         VALUES (?, ?, datetime('now'))`,
        [guildId, ownerId],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        },
      );
    });
  }

  async getAgentChannel(guildId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM agent_settings WHERE guild_id = ?",
        [guildId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        },
      );
    });
  }

  // Admin Management
  async addAdmin(guildId, userId, addedBy) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR IGNORE INTO agent_admins (guild_id, user_id, added_by) VALUES (?, ?, ?)",
        [guildId, userId, addedBy],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        },
      );
    });
  }

  async removeAdmin(guildId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM agent_admins WHERE guild_id = ? AND user_id = ?",
        [guildId, userId],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        },
      );
    });
  }

  async listAdmins(guildId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT user_id, added_by, added_at FROM agent_admins WHERE guild_id = ?",
        [guildId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        },
      );
    });
  }

  // Audit Log
  async logAction(guildId, userId, action, details = {}) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO agent_audit_log (guild_id, user_id, action, details) VALUES (?, ?, ?, ?)",
        [guildId, userId, action, JSON.stringify(details)],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, id: this.lastID });
        },
      );
    });
  }

  async getAuditLogs(guildId, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT * FROM agent_audit_log WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?",
        [guildId, limit],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        },
      );
    });
  }

  // Safe Mode and Status
  async setSafeMode(guildId, enabled) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE agent_settings SET safe_mode = ?, updated_at = datetime('now') WHERE guild_id = ?",
        [enabled ? 1 : 0, guildId],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        },
      );
    });
  }

  async updateActivity(guildId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE agent_settings SET last_activity = datetime('now'), updated_at = datetime('now') WHERE guild_id = ?",
        [guildId],
        function (err) {
          if (err) return reject(err);
          resolve({ success: true });
        },
      );
    });
  }
}

module.exports = AgentManager;
