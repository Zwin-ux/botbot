/**
 * Extended reminder management with advanced features
 */
class ReminderManagerExtended {
  constructor(db) {
    this.db = db;
    this.setupTables();
  }

  /**
   * Set up additional tables needed for advanced features
   * @private
   */
  setupTables() {
    // Create recurring_reminders table if it doesn't exist
    this.db.run(`
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
    this.db.run(`
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
   * @param {string} userId - User ID who created the reminder
   * @param {string} userTag - User tag (display name)
   * @param {string} content - Reminder content
   * @param {string} cronExpression - Cron expression for recurring schedule
   * @param {string} channelId - Channel ID where reminder was created
   * @param {number|null} categoryId - Category ID (or null for default)
   * @param {number} priority - Priority level (0-3)
   * @returns {Promise<Object>} - Created reminder
   */
  async createRecurringReminder(userId, userTag, content, cronExpression, channelId, categoryId = null, priority = 0) {
    return new Promise((resolve, reject) => {
      // Calculate the next run time based on the cron expression
      const now = Math.floor(Date.now() / 1000);
      const nextRunTime = this.calculateNextRunTime(cronExpression);
      
      // First create a basic reminder
      this.db.run(
        `INSERT INTO reminders 
         (userId, userTag, content, dueTime, channelId, categoryId, priority, isRecurring, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, cast(strftime('%s', 'now') as int))`,
        [
          userId, 
          userTag, 
          content, 
          nextRunTime, 
          channelId,
          categoryId,
          priority
        ],
        (err) => {
          if (err) return reject(err);
          
          const reminderId = this.db.lastID;
          
          // Then create the recurring info
          this.db.run(
            `INSERT INTO recurring_reminders 
             (reminderId, frequency, cronExpression, nextRunTime)
             VALUES (?, ?, ?, ?)`,
            [
              reminderId,
              this.getCronFrequency(cronExpression),
              cronExpression,
              nextRunTime
            ],
            function(err) {
              if (err) return reject(err);
              
              resolve({
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
              });
            }
          );
        }
      );
    });
  }

  /**
   * Create a group/team reminder
   * @param {string} userId - User ID who created the reminder
   * @param {string} userTag - User tag (display name)
   * @param {string} content - Reminder content
   * @param {Date} dueTime - Due time
   * @param {string} channelId - Target channel ID
   * @param {number|null} categoryId - Category ID (or null for default)
   * @param {number} priority - Priority level (0-3)
   * @param {string} targetType - Type of target ('channel' or 'team')
   * @returns {Promise<Object>} - Created reminder
   */
  async createGroupReminder(userId, userTag, content, dueTime, channelId, categoryId = null, priority = 0, targetType = 'channel') {
    return new Promise((resolve, reject) => {
      // First create a basic reminder
      this.db.run(
        `INSERT INTO reminders 
         (userId, userTag, content, dueTime, channelId, categoryId, priority, isGroupReminder, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, cast(strftime('%s', 'now') as int))`,
        [
          userId, 
          userTag, 
          content, 
          dueTime ? Math.floor(dueTime.getTime() / 1000) : null, 
          channelId,
          categoryId,
          priority
        ],
        (err) => {
          if (err) return reject(err);
          
          const reminderId = this.db.lastID;
          
          // Then create the group info
          this.db.run(
            `INSERT INTO group_reminders 
             (reminderId, targetType, targetId)
             VALUES (?, ?, ?)`,
            [
              reminderId,
              targetType,
              channelId
            ],
            function(err) {
              if (err) return reject(err);
              
              resolve({
                id: reminderId,
                userId,
                userTag,
                content,
                dueTime: dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
                channelId,
                categoryId,
                priority,
                isGroupReminder: true,
                targetType
              });
            }
          );
        }
      );
    });
  }

  /**
   * Create a reminder for another user
   * @param {string} creatorId - Creator user ID 
   * @param {string} creatorTag - Creator tag (display name)
   * @param {string} targetUserId - Target user ID
   * @param {string} content - Reminder content
   * @param {Date} dueTime - Due time
   * @param {string} channelId - Channel ID where reminder was created
   * @param {number|null} categoryId - Category ID (or null for default)
   * @param {number} priority - Priority level (0-3)
   * @returns {Promise<Object>} - Created reminder
   */
  async createUserReminder(creatorId, creatorTag, targetUserId, content, dueTime, channelId, categoryId = null, priority = 0) {
    return new Promise((resolve, reject) => {
      // Create a reminder with metadata indicating it was created for another user
      this.db.run(
        `INSERT INTO reminders 
         (userId, userTag, content, dueTime, channelId, categoryId, priority, createdBy, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, cast(strftime('%s', 'now') as int))`,
        [
          targetUserId, // The reminder is for the target user
          'User', // We don't know their tag yet
          content, 
          dueTime ? Math.floor(dueTime.getTime() / 1000) : null, 
          channelId,
          categoryId,
          priority,
          creatorId // Tracked who created it
        ],
        function(err) {
          if (err) return reject(err);
          
          resolve({
            id: this.lastID,
            userId: targetUserId,
            content,
            dueTime: dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
            channelId,
            categoryId,
            priority,
            createdBy: creatorId
          });
        }
      );
    });
  }

  /**
   * Calculate next run time from cron expression
   * This is a simple implementation - for production, use a proper cron parser
   * @param {string} cronExpression - Cron expression
   * @returns {number} - Unix timestamp for next run
   */
  calculateNextRunTime(cronExpression) {
    // Simple implementation - in real code, use a cron parser library
    const now = new Date();
    const parts = cronExpression.split(' ');
    
    // Default to tomorrow at the specified time
    const nextRun = new Date(now);
    nextRun.setDate(now.getDate() + 1);
    
    // Try to parse hour and minute from cron
    const minute = parseInt(parts[0]);
    const hour = parseInt(parts[1]);
    
    if (!isNaN(minute) && !isNaN(hour)) {
      nextRun.setHours(hour, minute, 0, 0);
      
      // If this time is in the past, add a day
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
    }
    
    return Math.floor(nextRun.getTime() / 1000);
  }

  /**
   * Extract frequency description from cron expression
   * @param {string} cronExpression - Cron expression
   * @returns {string} - Frequency description
   */
  getCronFrequency(cronExpression) {
    const parts = cronExpression.split(' ');
    
    // Check for daily (every day)
    if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
      return 'daily';
    }
    
    // Check for weekly (specific day of week)
    if (parts[2] === '*' && parts[3] === '*' && parts[4] !== '*') {
      return 'weekly';
    }
    
    // Check for weekdays
    if (parts[2] === '*' && parts[3] === '*' && parts[4] === '1-5') {
      return 'weekday';
    }
    
    // Default
    return 'custom';
  }

  /**
   * Process due recurring reminders
   * This should be called periodically by a scheduler
   * @returns {Promise<Array>} - List of processed reminders
   */
  async processRecurringReminders() {
    const now = Math.floor(Date.now() / 1000);
    
    return new Promise((resolve, reject) => {
      // Get recurring reminders that are due
      this.db.all(
        `SELECT r.*, rr.cronExpression, rr.frequency
         FROM reminders r
         JOIN recurring_reminders rr ON r.id = rr.reminderId
         WHERE r.dueTime <= ? AND r.status = 'pending'`,
        [now],
        async (err, reminders) => {
          if (err) return reject(err);
          
          const processed = [];
          
          for (const reminder of reminders) {
            try {
              // Calculate next run time
              const nextRunTime = this.calculateNextRunTime(reminder.cronExpression);
              
              // Update the reminder with the new due time
              await this.updateRecurringReminder(reminder.id, nextRunTime);
              
              // Add to processed list
              processed.push({
                ...reminder,
                nextDueTime: nextRunTime
              });
            } catch (err) {
              console.error(`Error processing recurring reminder ${reminder.id}:`, err);
            }
          }
          
          resolve(processed);
        }
      );
    });
  }

  /**
   * Update recurring reminder with new due time
   * @param {number} reminderId - Reminder ID
   * @param {number} nextRunTime - Next run time (Unix timestamp)
   * @returns {Promise<boolean>} - Success status
   */
  async updateRecurringReminder(reminderId, nextRunTime) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE reminders SET dueTime = ? WHERE id = ?`,
        [nextRunTime, reminderId],
        (err) => {
          if (err) return reject(err);
          
          this.db.run(
            `UPDATE recurring_reminders 
             SET lastRunTime = cast(strftime('%s', 'now') as int), 
                 nextRunTime = ?
             WHERE reminderId = ?`,
            [nextRunTime, reminderId],
            function(err) {
              if (err) return reject(err);
              resolve(this.changes > 0);
            }
          );
        }
      );
    });
  }

  /**
   * Get group reminders for a channel
   * @param {string} channelId - Channel ID
   * @returns {Promise<Array>} - List of group reminders
   */
  async getGroupReminders(channelId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT r.*, gr.targetType
         FROM reminders r
         JOIN group_reminders gr ON r.id = gr.reminderId
         WHERE r.channelId = ? AND r.status = 'pending'
         ORDER BY r.dueTime ASC`,
        [channelId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });
  }
}

export default ReminderManagerExtended;
