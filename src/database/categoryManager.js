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
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM categories ORDER BY name ASC', (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  /**
   * Get a category by ID
   * @param {number} id - Category ID
   * @returns {Promise<Object>} Category object
   */
  async getCategoryById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM categories WHERE id = ?', [id], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  /**
   * Get a category by emoji
   * @param {string} emoji - Category emoji
   * @returns {Promise<Object>} Category object
   */
  async getCategoryByEmoji(emoji) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM categories WHERE emoji = ?', [emoji], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  }

  /**
   * Create a new category
   * @param {string} name - Category name
   * @param {string} emoji - Category emoji
   * @param {string} description - Category description
   * @returns {Promise<number>} New category ID
   */
  async createCategory(name, emoji, description = '') {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO categories (name, emoji, description) VALUES (?, ?, ?)',
        [name, emoji, description],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Subscribe a user to a category
   * @param {string} userId - Discord user ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} Success status
   */
  async subscribeUserToCategory(userId, categoryId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT OR REPLACE INTO subscriptions (userId, categoryId) VALUES (?, ?)',
        [userId, categoryId],
        function(err) {
          if (err) return reject(err);
          resolve(true);
        }
      );
    });
  }

  /**
   * Unsubscribe a user from a category
   * @param {string} userId - Discord user ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} Success status
   */
  async unsubscribeUserFromCategory(userId, categoryId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM subscriptions WHERE userId = ? AND categoryId = ?',
        [userId, categoryId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Get all categories a user is subscribed to
   * @param {string} userId - Discord user ID
   * @returns {Promise<Array>} Array of category objects
   */
  async getUserSubscriptions(userId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT c.* FROM categories c
         JOIN subscriptions s ON c.id = s.categoryId
         WHERE s.userId = ?
         ORDER BY c.name ASC`,
        [userId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }

  /**
   * Get all users subscribed to a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<Array>} Array of user IDs
   */
  async getCategorySubscribers(categoryId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT userId FROM subscriptions WHERE categoryId = ?',
        [categoryId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(row => row.userId));
        }
      );
    });
  }
}

export default CategoryManager;
