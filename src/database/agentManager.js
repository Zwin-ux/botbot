class AgentManager {
  constructor(db) {
    this.db = db;
    // It's better to call initializeDatabase from an async factory function
    // or ensure it's awaited if it becomes async. For now, keeping it sync
    // but if runAsync is used inside, it needs to be async and awaited.
    // Making initializeDatabase async.
    // this.initializeDatabase(); // Call this from an async context after instantiation
  }

  async initializeDatabase() {
    // Create tables if they don't exist
    // db.serialize equivalent by awaiting each call
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS agent_settings (
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

    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS agent_admins (
      guild_id TEXT,
      user_id TEXT,
      added_by TEXT,
      added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (guild_id, user_id),
      FOREIGN KEY (guild_id) REFERENCES agent_settings(guild_id) ON DELETE CASCADE
    )`);

    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS agent_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (guild_id) REFERENCES agent_settings(guild_id) ON DELETE CASCADE
    )`);
  }


  // Agent Channel Management
  async setupAgentChannel(guildId, ownerId) {
    const stmt = await this.db.runAsync(
      `INSERT OR REPLACE INTO agent_settings
       (guild_id, owner_id, updated_at)
       VALUES (?, ?, datetime('now'))`,
      [guildId, ownerId]
    );
    return { success: true, changes: stmt.changes };
  }

  async getAgentChannel(guildId) {
    const row = await this.db.getAsync(
      'SELECT * FROM agent_settings WHERE guild_id = ?',
      [guildId]
    );
    return row || null;
  }

  // Admin Management
  async addAdmin(guildId, userId, addedBy) {
    const stmt = await this.db.runAsync(
      'INSERT OR IGNORE INTO agent_admins (guild_id, user_id, added_by) VALUES (?, ?, ?)',
      [guildId, userId, addedBy]
    );
    return { success: true, changes: stmt.changes };
  }

  async removeAdmin(guildId, userId) {
    const stmt = await this.db.runAsync(
      'DELETE FROM agent_admins WHERE guild_id = ? AND user_id = ?',
      [guildId, userId]
    );
    return { success: true, changes: stmt.changes };
  }

  async listAdmins(guildId) {
    const rows = await this.db.allAsync(
      'SELECT user_id, added_by, added_at FROM agent_admins WHERE guild_id = ?',
      [guildId]
    );
    return rows || [];
  }

  // Audit Log
  async logAction(guildId, userId, action, details = {}) {
    const stmt = await this.db.runAsync(
      'INSERT INTO agent_audit_log (guild_id, user_id, action, details) VALUES (?, ?, ?, ?)',
      [guildId, userId, action, JSON.stringify(details)]
    );
    return { success: true, id: stmt.lastID };
  }

  async getAuditLogs(guildId, limit = 50) {
    const rows = await this.db.allAsync(
      'SELECT * FROM agent_audit_log WHERE guild_id = ? ORDER BY timestamp DESC LIMIT ?',
      [guildId, limit]
    );
    return rows || [];
  }

  // Safe Mode and Status
  async setSafeMode(guildId, enabled) {
    const stmt = await this.db.runAsync(
      'UPDATE agent_settings SET safe_mode = ?, updated_at = datetime(\'now\') WHERE guild_id = ?',
      [enabled ? 1 : 0, guildId]
    );
    return { success: true, changes: stmt.changes };
  }

  async updateActivity(guildId) {
    // This method originally resolved with { success: true } without checking changes.
    // runAsync resolves with the statement object. We assume success if no error.
    await this.db.runAsync(
      'UPDATE agent_settings SET last_activity = datetime(\'now\'), updated_at = datetime(\'now\') WHERE guild_id = ?',
      [guildId]
    );
    return { success: true };
  }
}

export default AgentManager;
