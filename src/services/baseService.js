/**
 * Base service class with common functionality
 */
class BaseService {
  constructor(db, logger) {
    this.db = db;
    this.logger = logger || console;
  }

  /**
   * Execute a database query with error handling
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} - Query results
   */
  async query(query, params = []) {
    try {
      return await new Promise((resolve, reject) => {
        this.db.all(query, params, (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        });
      });
    } catch (error) {
      this.logger.error("Database query failed:", { query, error });
      throw error;
    }
  }

  /**
   * Execute a database command (INSERT/UPDATE/DELETE)
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<{changes: number, lastID: number}>}
   */
  async execute(query, params = []) {
    try {
      return await new Promise((resolve, reject) => {
        this.db.run(query, params, function (err) {
          if (err) return reject(err);
          resolve({ changes: this.changes, lastID: this.lastID });
        });
      });
    } catch (error) {
      this.logger.error("Database execute failed:", { query, error });
      throw error;
    }
  }

  /**
   * Start a transaction
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    await this.execute("BEGIN TRANSACTION");
  }

  /**
   * Commit a transaction
   * @returns {Promise<void>}
   */
  async commit() {
    await this.execute("COMMIT");
  }

  /**
   * Rollback a transaction
   * @returns {Promise<void>}
   */
  async rollback() {
    await this.execute("ROLLBACK");
  }

  /**
   * Execute a function within a transaction
   * @param {Function} fn - Async function to execute within transaction
   * @returns {Promise<*>} - Result of the function
   */
  async withTransaction(fn) {
    await this.beginTransaction();
    try {
      const result = await fn();
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}

export default BaseService;
