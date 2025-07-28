/**
 * Enhanced reminder management with category support
 */
class ReminderManager {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new reminder
   * @param {string} userId - User ID who created the reminder
   * @param {string} userTag - User tag (display name)
   * @param {string} content - Reminder content
   * @param {Date|null} dueTime - Due time (or null if no specific time)
   * @param {string} channelId - Channel ID where reminder was created
   * @param {number|null} categoryId - Category ID (or null for default)
   * @returns {Promise<Object>} - Created reminder
   */
  async createReminder(
    userId,
    userTag,
    content,
    dueTime,
    channelId,
    categoryId = null,
  ) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO reminders 
         (userId, userTag, content, dueTime, channelId, categoryId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, cast(strftime('%s', 'now') as int))`,
        [
          userId,
          userTag,
          content,
          dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
          channelId,
          categoryId,
        ],
        function (err) {
          if (err) return reject(err);
          resolve({
            id: this.lastID,
            userId,
            userTag,
            content,
            dueTime: dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
            channelId,
            categoryId,
            priority: 0,
          });
        },
      );
    });
  }

  /**
   * Get a reminder by ID
   * @param {number} id - Reminder ID
   * @returns {Promise<Object|null>} - Reminder object or null if not found
   */
  async getReminderById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT r.*, c.name as categoryName, c.emoji as categoryEmoji
         FROM reminders r
         LEFT JOIN categories c ON r.categoryId = c.id
         WHERE r.id = ?`,
        [id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row || null);
        },
      );
    });
  }

  /**
   * Update a reminder's category
   * @param {number} reminderId - Reminder ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} - Success status
   */
  async updateReminderCategory(reminderId, categoryId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE reminders SET categoryId = ? WHERE id = ?",
        [categoryId, reminderId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        },
      );
    });
  }

  /**
   * Get user's reminders with enhanced filtering options
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @param {string} options.status - Status filter (default: 'pending')
   * @param {string} options.timeFilter - Time filter: 'all', 'today', 'week', 'overdue' (default: 'all')
   * @param {number} options.categoryId - Filter by category ID
   * @param {boolean} options.sortByPriority - Sort by priority (default: false)
   * @returns {Promise<Array>} - Matching reminders
   */
  async getUserReminders(userId, options = {}) {
    const {
      status = "pending",
      timeFilter = "all",
      categoryId = null,
      sortByPriority = false,
    } = options;

    return new Promise((resolve, reject) => {
      let query = `
        SELECT r.*, c.name as categoryName, c.emoji as categoryEmoji
        FROM reminders r
        LEFT JOIN categories c ON r.categoryId = c.id
        WHERE r.userId = ? AND r.status = ?`;

      const params = [userId, status];

      // Apply time filter
      if (timeFilter === "today") {
        const today = new Date();
        const startOfDay = Math.floor(
          new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000,
        );
        const endOfDay = Math.floor(
          new Date(today.setHours(23, 59, 59, 999)).getTime() / 1000,
        );
        query +=
          " AND (r.dueTime IS NULL OR (r.dueTime >= ? AND r.dueTime <= ?))";
        params.push(startOfDay, endOfDay);
      } else if (timeFilter === "week") {
        const today = new Date();
        const startOfDay = Math.floor(
          new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000,
        );
        const endOfWeek = Math.floor(
          new Date(today.setDate(today.getDate() + 7)).getTime() / 1000,
        );
        query +=
          " AND (r.dueTime IS NULL OR (r.dueTime >= ? AND r.dueTime <= ?))";
        params.push(startOfDay, endOfWeek);
      } else if (timeFilter === "overdue") {
        const now = Math.floor(Date.now() / 1000);
        query += " AND r.dueTime < ?";
        params.push(now);
      }

      // Filter by category
      if (categoryId) {
        query += " AND r.categoryId = ?";
        params.push(categoryId);
      }

      // Order by priority or time
      if (sortByPriority) {
        query += " ORDER BY r.priority DESC, r.dueTime ASC NULLS LAST";
      } else {
        query += " ORDER BY r.dueTime ASC NULLS LAST";
      }

      this.db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  /**
   * Mark a reminder as done
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<boolean>} - Success status
   */
  async markReminderDone(reminderId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE reminders SET status = ? WHERE id = ? AND userId = ?",
        ["done", reminderId, userId],
        function (err) {
          if (err) return reject(err);
          if (this.changes === 0)
            return reject(new Error("Reminder not found or not owned by user"));
          resolve(true);
        },
      );
    });
  }

  /**
   * Snooze a reminder
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID (for ownership verification)
   * @param {number} snoozeMinutes - Minutes to snooze for
   * @returns {Promise<Object>} - Updated reminder info
   */
  async snoozeReminder(reminderId, userId, snoozeMinutes = 30) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT * FROM reminders WHERE id = ? AND userId = ? AND status = ?",
        [reminderId, userId, "pending"],
        (err, reminder) => {
          if (err) return reject(err);
          if (!reminder)
            return reject(new Error("Reminder not found or not owned by user"));

          let newDueTime;
          if (reminder.dueTime) {
            // If reminder had a due time, add snooze time to it
            newDueTime = reminder.dueTime + snoozeMinutes * 60;
          } else {
            // If reminder had no due time, set it to now + snooze time
            newDueTime = Math.floor(Date.now() / 1000) + snoozeMinutes * 60;
          }

          this.db.run(
            "UPDATE reminders SET dueTime = ? WHERE id = ?",
            [newDueTime, reminderId],
            function (err) {
              if (err) return reject(err);
              resolve({
                id: reminderId,
                newDueTime,
              });
            },
          );
        },
      );
    });
  }

  /**
   * Delete a reminder
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<boolean>} - Success status
   */
  async deleteReminder(reminderId, userId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM reminders WHERE id = ? AND userId = ?",
        [reminderId, userId],
        function (err) {
          if (err) return reject(err);
          if (this.changes === 0)
            return reject(new Error("Reminder not found or not owned by user"));
          resolve(true);
        },
      );
    });
  }

  /**
   * Get all due reminders
   * @param {number} [withinSeconds=60] - Get reminders due within this many seconds
   * @returns {Promise<Array>} - Due reminders
   */
  async getDueReminders(withinSeconds = 60) {
    return new Promise((resolve, reject) => {
      const now = Math.floor(Date.now() / 1000);
      const query = `
        SELECT r.*, c.name as categoryName, c.emoji as categoryEmoji
        FROM reminders r
        LEFT JOIN categories c ON r.categoryId = c.id
        WHERE r.status = 'pending'
        AND r.dueTime IS NOT NULL
        AND r.dueTime <= ?
        AND r.dueTime > ? - ?`;

      this.db.all(query, [now, now, withinSeconds], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  /**
   * Get all subscribers who should be notified about a reminder
   * @param {number} reminderId - Reminder ID
   * @returns {Promise<Array>} - Array of user IDs to notify
   */
  async getReminderSubscribers(reminderId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT userId, categoryId FROM reminders WHERE id = ?",
        [reminderId],
        (err, reminder) => {
          if (err) return reject(err);
          if (!reminder) return resolve([]);

          // If no category, only notify the owner
          if (!reminder.categoryId) {
            return resolve([reminder.userId]);
          }

          // Otherwise, get all subscribers to this category
          this.db.all(
            "SELECT userId FROM subscriptions WHERE categoryId = ?",
            [reminder.categoryId],
            (err, subscribers) => {
              if (err) return reject(err);

              // Always include the reminder creator
              const subscriberIds = subscribers.map((sub) => sub.userId);
              if (!subscriberIds.includes(reminder.userId)) {
                subscriberIds.push(reminder.userId);
              }

              resolve(subscriberIds);
            },
          );
        },
      );
    });
  }
}

export default ReminderManager;
