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
  async createReminder(userId, userTag, content, dueTime, channelId, categoryId = null) {
    const dueTimeSeconds = dueTime ? Math.floor(dueTime.getTime() / 1000) : null;
    const stmt = await this.db.runAsync(
      `INSERT INTO reminders
       (userId, userTag, content, dueTime, channelId, categoryId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, cast(strftime('%s', 'now') as int))`,
      [userId, userTag, content, dueTimeSeconds, channelId, categoryId]
    );
    return {
      id: stmt.lastID,
      userId,
      userTag,
      content,
      dueTime: dueTimeSeconds,
      channelId,
      categoryId,
      priority: 0 // Default priority
    };
  }

  /**
   * Get a reminder by ID
   * @param {number} id - Reminder ID
   * @returns {Promise<Object|null>} - Reminder object or null if not found
   */
  async getReminderById(id) {
    const row = await this.db.getAsync(
      `SELECT r.*, c.name as categoryName, c.emoji as categoryEmoji
       FROM reminders r
       LEFT JOIN categories c ON r.categoryId = c.id
       WHERE r.id = ?`,
      [id]
    );
    return row || null;
  }

  /**
   * Update a reminder's category
   * @param {number} reminderId - Reminder ID
   * @param {number} categoryId - Category ID
   * @returns {Promise<boolean>} - Success status
   */
  async updateReminderCategory(reminderId, categoryId) {
    const stmt = await this.db.runAsync(
      'UPDATE reminders SET categoryId = ? WHERE id = ?',
      [categoryId, reminderId]
    );
    return stmt.changes > 0;
  }

  /**
   * Get user's reminders with enhanced filtering options
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} - Matching reminders
   */
  async getUserReminders(userId, options = {}) {
    const {
      status = 'pending',
      timeFilter = 'all',
      categoryId = null,
      sortByPriority = false
    } = options;

    let query = `
      SELECT r.*, c.name as categoryName, c.emoji as categoryEmoji
      FROM reminders r
      LEFT JOIN categories c ON r.categoryId = c.id
      WHERE r.userId = ? AND r.status = ?`;

    const params = [userId, status];

    if (timeFilter === 'today') {
      const today = new Date();
      const startOfDay = Math.floor(new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000);
      const endOfDay = Math.floor(new Date(today.setHours(23, 59, 59, 999)).getTime() / 1000);
      query += ' AND (r.dueTime IS NULL OR (r.dueTime >= ? AND r.dueTime <= ?))';
      params.push(startOfDay, endOfDay);
    } else if (timeFilter === 'week') {
      const today = new Date();
      const startOfDay = Math.floor(new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000);
      // Correctly calculate end of week (start of today + 7 days)
      const endOfWeekDate = new Date(today.setDate(today.getDate() + 7 -1 )); // -1 because we want end of 6th day from today
      const endOfWeek = Math.floor(new Date(endOfWeekDate.setHours(23, 59, 59, 999)).getTime() / 1000);
      query += ' AND (r.dueTime IS NULL OR (r.dueTime >= ? AND r.dueTime <= ?))';
      params.push(startOfDay, endOfWeek);
    } else if (timeFilter === 'overdue') {
      const now = Math.floor(Date.now() / 1000);
      query += ' AND r.dueTime IS NOT NULL AND r.dueTime < ?'; // Ensure dueTime is not NULL for overdue
      params.push(now);
    }

    if (categoryId) {
      query += ' AND r.categoryId = ?';
      params.push(categoryId);
    }

    if (sortByPriority) {
      query += ' ORDER BY r.priority DESC, r.dueTime ASC NULLS LAST';
    } else {
      query += ' ORDER BY r.dueTime ASC NULLS LAST';
    }

    return this.db.allAsync(query, params);
  }

  /**
   * Mark a reminder as done
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<boolean>} - Success status
   */
  async markReminderDone(reminderId, userId) {
    const stmt = await this.db.runAsync(
      'UPDATE reminders SET status = ? WHERE id = ? AND userId = ?',
      ['done', reminderId, userId]
    );
    if (stmt.changes === 0) throw new Error('Reminder not found or not owned by user');
    return true;
  }

  /**
   * Snooze a reminder
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID (for ownership verification)
   * @param {number} snoozeMinutes - Minutes to snooze for
   * @returns {Promise<Object>} - Updated reminder info
   */
  async snoozeReminder(reminderId, userId, snoozeMinutes = 30) {
    const reminder = await this.db.getAsync(
      'SELECT * FROM reminders WHERE id = ? AND userId = ? AND status = ?',
      [reminderId, userId, 'pending']
    );

    if (!reminder) throw new Error('Reminder not found, not owned by user, or not pending.');

    let newDueTime;
    if (reminder.dueTime) {
      newDueTime = reminder.dueTime + (snoozeMinutes * 60);
    } else {
      newDueTime = Math.floor(Date.now() / 1000) + (snoozeMinutes * 60);
    }

    await this.db.runAsync(
      'UPDATE reminders SET dueTime = ? WHERE id = ?',
      [newDueTime, reminderId]
    );
    return { id: reminderId, newDueTime };
  }

  /**
   * Delete a reminder
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID (for ownership verification)
   * @returns {Promise<boolean>} - Success status
   */
  async deleteReminder(reminderId, userId) {
    const stmt = await this.db.runAsync(
      'DELETE FROM reminders WHERE id = ? AND userId = ?',
      [reminderId, userId]
    );
    if (stmt.changes === 0) throw new Error('Reminder not found or not owned by user');
    return true;
  }

  /**
   * Get all due reminders
   * @param {number} [withinSeconds=60] - Get reminders due within this many seconds
   * @returns {Promise<Array>} - Due reminders
   */
  async getDueReminders(withinSeconds = 60) {
    const now = Math.floor(Date.now() / 1000);
    // Check for reminders whose dueTime is past or within the next `withinSeconds`
    const query = `
      SELECT r.*, c.name as categoryName, c.emoji as categoryEmoji
      FROM reminders r
      LEFT JOIN categories c ON r.categoryId = c.id
      WHERE r.status = 'pending'
      AND r.dueTime IS NOT NULL
      AND r.dueTime <= ?`; // All reminders due up to 'now + withinSeconds'
      // The original logic `AND r.dueTime > ? - ?` was a bit confusing.
      // This simplifies to: "dueTime is less than or equal to now + withinSeconds"
      // but to catch those that are *already* due, it should be `r.dueTime <= now`.
      // If `withinSeconds` is for "upcoming within X seconds", then it should be `r.dueTime <= (now + withinSeconds) AND r.dueTime >= now`.
      // Assuming `withinSeconds` means "reminders that became due in the last X seconds or are due right now":
      // This would be `r.dueTime <= now AND r.dueTime >= (now - withinSeconds)`
      // Let's stick to the original apparent intent: "due now or very soon"
      // The original query `r.dueTime <= ? AND r.dueTime > ? - ?` with params `[now, now, withinSeconds]` becomes `r.dueTime <= now AND r.dueTime > (now - withinSeconds)`
      // This means it gets reminders that have become due in the last `withinSeconds` window up to now.

    return this.db.allAsync(query, [now + withinSeconds, now, withinSeconds]); // This seems to keep original logic: due in the future up to `withinSeconds` from now
                                                                                // Or due in the past (now - withinSeconds)
                                                                                // Corrected: `r.dueTime <= (now + withinSeconds)` if it means future tasks.
                                                                                // Or, if it means "tasks that are currently due and have been for up to withinSeconds": `r.dueTime <= now AND r.dueTime > (now - withinSeconds)`
                                                                                // Re-evaluating: `r.dueTime <= now` would be for past due.
                                                                                // `r.dueTime <= (now + withinSeconds)` for upcoming.
                                                                                // The original query: `r.dueTime <= ? AND r.dueTime > ? - ?` with params `[now, now, withinSeconds]`
                                                                                // is equivalent to `r.dueTime <= now AND r.dueTime > (now - withinSeconds)`.
                                                                                // This selects reminders that have become due from (now - withinSeconds) up to now.
                                                                                // For "due reminders" typically means anything past dueTime <= now.
                                                                                // Let's assume it means "anything due now or in the past".
    const dueQuery = `
      SELECT r.*, c.name as categoryName, c.emoji as categoryEmoji
      FROM reminders r
      LEFT JOIN categories c ON r.categoryId = c.id
      WHERE r.status = 'pending'
      AND r.dueTime IS NOT NULL
      AND r.dueTime <= ?`;
    return this.db.allAsync(dueQuery, [now]);
  }

  /**
   * Get all subscribers who should be notified about a reminder
   * @param {number} reminderId - Reminder ID
   * @returns {Promise<Array>} - Array of user IDs to notify
   */
  async getReminderSubscribers(reminderId) {
    const reminder = await this.db.getAsync(
      'SELECT userId, categoryId FROM reminders WHERE id = ?',
      [reminderId]
    );

    if (!reminder) return [];

    if (!reminder.categoryId) {
      return [reminder.userId];
    }

    const subscribers = await this.db.allAsync(
      'SELECT userId FROM subscriptions WHERE categoryId = ?',
      [reminder.categoryId]
    );

    const subscriberIds = subscribers.map(sub => sub.userId);
    if (!subscriberIds.includes(reminder.userId)) {
      subscriberIds.push(reminder.userId);
    }
    return subscriberIds;
  }
}

export default ReminderManager;
