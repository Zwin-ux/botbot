/**
 * Extended reminder management with advanced features
 */
class ReminderManagerExtended {
  constructor(db) {
    this.db = db;
    // this.setupTables(); // Should be called from an async context after instantiation
  }

  /**
   * Set up additional tables needed for advanced features
   * @private
   */
  async setupTables() {
    // Create recurring_reminders table if it doesn't exist
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS recurring_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reminderId INTEGER NOT NULL,
        frequency TEXT NOT NULL,
        cronExpression TEXT NOT NULL,
        lastRunTime INTEGER,
        nextRunTime INTEGER,
        FOREIGN KEY (reminderId) REFERENCES reminders(id) ON DELETE CASCADE
      )
    `);

    // Create group_reminders table if it doesn't exist
    await this.db.runAsync(`
      CREATE TABLE IF NOT EXISTS group_reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reminderId INTEGER NOT NULL,
        targetType TEXT NOT NULL,
        targetId TEXT,
        FOREIGN KEY (reminderId) REFERENCES reminders(id) ON DELETE CASCADE
      )
    `);
  }

  /**
   * Create a recurring reminder
   * @returns {Promise<Object>} - Created reminder
   */
  async createRecurringReminder(userId, userTag, content, cronExpression, channelId, categoryId = null, priority = 0) {
    const nextRunTime = this.calculateNextRunTime(cronExpression);

    const reminderStmt = await this.db.runAsync(
      `INSERT INTO reminders
       (userId, userTag, content, dueTime, channelId, categoryId, priority, isRecurring, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, cast(strftime('%s', 'now') as int))`,
      [userId, userTag, content, nextRunTime, channelId, categoryId, priority]
    );

    const reminderId = reminderStmt.lastID;

    await this.db.runAsync(
      `INSERT INTO recurring_reminders
       (reminderId, frequency, cronExpression, nextRunTime)
       VALUES (?, ?, ?, ?)`,
      [reminderId, this.getCronFrequency(cronExpression), cronExpression, nextRunTime]
    );

    return {
      id: reminderId,
      userId,
      userTag,
      content,
      dueTime: nextRunTime,
      channelId,
      categoryId,
      priority,
      isRecurring: true,
      cronExpression
    };
  }

  /**
   * Create a group/team reminder
   * @returns {Promise<Object>} - Created reminder
   */
  async createGroupReminder(userId, userTag, content, dueTime, channelId, categoryId = null, priority = 0, targetType = 'channel') {
    const dueTimeSeconds = dueTime ? Math.floor(dueTime.getTime() / 1000) : null;
    const reminderStmt = await this.db.runAsync(
      `INSERT INTO reminders
       (userId, userTag, content, dueTime, channelId, categoryId, priority, isGroupReminder, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, cast(strftime('%s', 'now') as int))`,
      [userId, userTag, content, dueTimeSeconds, channelId, categoryId, priority]
    );

    const reminderId = reminderStmt.lastID;

    await this.db.runAsync(
      `INSERT INTO group_reminders
       (reminderId, targetType, targetId)
       VALUES (?, ?, ?)`,
      [reminderId, targetType, channelId] // Assuming targetId is the channelId for group reminders
    );

    return {
      id: reminderId,
      userId,
      userTag,
      content,
      dueTime: dueTimeSeconds,
      channelId,
      categoryId,
      priority,
      isGroupReminder: true,
      targetType
    };
  }

  /**
   * Create a reminder for another user
   * @returns {Promise<Object>} - Created reminder
   */
  async createUserReminder(creatorId, creatorTag, targetUserId, content, dueTime, channelId, categoryId = null, priority = 0) {
    const dueTimeSeconds = dueTime ? Math.floor(dueTime.getTime() / 1000) : null;
    const stmt = await this.db.runAsync(
      `INSERT INTO reminders
       (userId, userTag, content, dueTime, channelId, categoryId, priority, createdBy, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, cast(strftime('%s', 'now') as int))`,
      [targetUserId, 'User', content, dueTimeSeconds, channelId, categoryId, priority, creatorId]
    );

    return {
      id: stmt.lastID,
      userId: targetUserId,
      content,
      dueTime: dueTimeSeconds,
      channelId,
      categoryId,
      priority,
      createdBy: creatorId
    };
  }

  calculateNextRunTime(cronExpression) {
    // Simple implementation - in real code, use a cron parser library
    const now = new Date();
    const parts = cronExpression.split(' ');
    const nextRun = new Date(now);
    nextRun.setDate(now.getDate() + 1); // Default to tomorrow
    
    const minute = parseInt(parts[0]);
    const hour = parseInt(parts[1]);
    
    if (!isNaN(minute) && !isNaN(hour)) {
      nextRun.setHours(hour, minute, 0, 0);
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }
    return Math.floor(nextRun.getTime() / 1000);
  }

  getCronFrequency(cronExpression) {
    const parts = cronExpression.split(' ');
    if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*') return 'daily';
    if (parts[2] === '*' && parts[3] === '*' && parts[4] !== '*') return 'weekly';
    if (parts[2] === '*' && parts[3] === '*' && parts[4] === '1-5') return 'weekday';
    return 'custom';
  }

  /**
   * Process due recurring reminders
   * @returns {Promise<Array>} - List of processed reminders
   */
  async processRecurringReminders() {
    const now = Math.floor(Date.now() / 1000);
    const reminders = await this.db.allAsync(
      `SELECT r.*, rr.cronExpression, rr.frequency
       FROM reminders r
       JOIN recurring_reminders rr ON r.id = rr.reminderId
       WHERE r.dueTime <= ? AND r.status = 'pending'`,
      [now]
    );
    
    const processed = [];
    for (const reminder of reminders) {
      try {
        const nextRunTime = this.calculateNextRunTime(reminder.cronExpression);
        await this.updateRecurringReminder(reminder.id, nextRunTime);
        processed.push({ ...reminder, nextDueTime: nextRunTime });
      } catch (err) {
        console.error(`Error processing recurring reminder ${reminder.id}:`, err);
      }
    }
    return processed;
  }

  /**
   * Update recurring reminder with new due time
   * @returns {Promise<boolean>} - Success status
   */
  async updateRecurringReminder(reminderId, nextRunTime) {
    await this.db.runAsync(
      `UPDATE reminders SET dueTime = ? WHERE id = ?`,
      [nextRunTime, reminderId]
    );

    const stmt = await this.db.runAsync(
      `UPDATE recurring_reminders
       SET lastRunTime = cast(strftime('%s', 'now') as int),
           nextRunTime = ?
       WHERE reminderId = ?`,
      [nextRunTime, reminderId]
    );
    return stmt.changes > 0;
  }

  /**
   * Get group reminders for a channel
   * @param {string} channelId - Channel ID
   * @returns {Promise<Array>} - List of group reminders
   */
  async getGroupReminders(channelId) {
    return this.db.allAsync(
      `SELECT r.*, gr.targetType
       FROM reminders r
       JOIN group_reminders gr ON r.id = gr.reminderId
       WHERE r.channelId = ? AND r.status = 'pending'
       ORDER BY r.dueTime ASC`,
      [channelId]
    );
  }
}

export default ReminderManagerExtended;
