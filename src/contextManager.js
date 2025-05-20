import sqlite3 from 'sqlite3';

class ContextManager {
  constructor(db) {
    this.db = db;
    this.setupTable();
  }

  setupTable() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS conversation_context (
        userId TEXT PRIMARY KEY,
        contextType TEXT,
        contextData TEXT,
        expiresAt INTEGER
      )
    `);
  }

  async setContext(userId, contextType, contextData = {}, ttlMinutes = 5) {
    return new Promise((resolve, reject) => {
      const expiresAt = Math.floor(Date.now() / 1000) + (ttlMinutes * 60);
      
      this.db.run(
        `INSERT OR REPLACE INTO conversation_context (userId, contextType, contextData, expiresAt)
         VALUES (?, ?, ?, ?)`,
        [userId, contextType, JSON.stringify(contextData), expiresAt],
        (err) => {
          if (err) return reject(err);
          resolve();
        }
      );
    });
  }

  async getContext(userId) {
    return new Promise((resolve, reject) => {
      // First, clear any expired contexts
      this.db.run(
        'DELETE FROM conversation_context WHERE expiresAt < ?',
        [Math.floor(Date.now() / 1000)],
        () => {
          this.db.get(
            'SELECT * FROM conversation_context WHERE userId = ?',
            [userId],
            (err, row) => {
              if (err) return reject(err);
              if (!row) return resolve(null);
              
              try {
                const contextData = JSON.parse(row.contextData);
                resolve({
                  type: row.contextType,
                  ...contextData,
                  _expiresAt: row.expiresAt
                });
              } catch (e) {
                reject(e);
              }
            }
          );
        }
      );
    });
  }

  async clearContext(userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM conversation_context WHERE userId = ?',
        [userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
  }
}

export default ContextManager;
