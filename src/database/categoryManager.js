/**
 * Category management functions
 */
class CategoryManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get all categories
   * @returns {Promise<Array>} Array of category objects
   */
  async getAllCategories() {
    // Assuming db.allAsync is available from initializeDatabase
    return this.db.allAsync('SELECT * FROM categories ORDER BY name ASC');
  }

  /**
   * Get a category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category object
   */
  async getCategoryById(id) {
    return this.db.getAsync('SELECT * FROM categories WHERE id = ?', [id]);
  }

  /**
   * Get a category by emoji
   * @param {string} emoji - Category emoji
   * @returns {Promise<Object>} Category object
   */
  async getCategoryByEmoji(emoji) {
    return this.db.getAsync('SELECT * FROM categories WHERE emoji = ?', [emoji]);
  }

  /**
   * Create a new category
   * @param {string} name - Category name
   * @param {string} emoji - Category emoji
   * @param {string} description - Category description
   * @returns {Promise<number>} New category ID
   */
  async createCategory(name, emoji, description = '') {
    const stmt = await this.db.runAsync(
      'INSERT INTO categories (name, emoji, description) VALUES (?, ?, ?)',
      [name, emoji, description]
    );
    return stmt.lastID;
  }

  /**
   * Subscribe a user to a category
   * @param {string} userId - Discord user ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} Success status
   */
  async subscribeUserToCategory(userId, categoryId) {
    // runAsync resolves with the statement object. If no error, assume success.
    await this.db.runAsync(
      'INSERT OR REPLACE INTO subscriptions (userId, categoryId) VALUES (?, ?)',
      [userId, categoryId]
    );
    return true;
  }

  /**
   * Unsubscribe a user from a category
   * @param {string} userId - Discord user ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribeUserFromCategory(userId, categoryId) {
    const stmt = await this.db.runAsync(
      'DELETE FROM subscriptions WHERE userId = ? AND categoryId = ?',
      [userId, categoryId]
    );
    return stmt.changes > 0;
  }

  /**
   * Get all categories a user is subscribed to
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} Array of category objects
   */
  async getUserSubscriptions(userId) {
    return this.db.allAsync(
      `SELECT c.* FROM categories c
       JOIN subscriptions s ON c.id = s.categoryId
       WHERE s.userId = ?
       ORDER BY c.name ASC`,
      [userId]
    );
  }

  /**
   * Get all users subscribed to a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Array of user IDs
   */
  async getCategorySubscribers(categoryId) {
    const rows = await this.db.allAsync(
      'SELECT userId FROM subscriptions WHERE categoryId = ?',
      [categoryId]
    );
    return rows.map(row => row.userId);
  }
}

export default CategoryManager;
