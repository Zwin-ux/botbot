/**
 * Handles reaction tracking and voting on reminders
 */
class ReactionManager {
  constructor(db) {
    this.db = db;

    // Define voting emojis and their point values
    this.votingEmojis = {
      "👍": 1, // thumbs up: +1
      "❤️": 2, // heart: +2
      "🔥": 3, // fire: +3
      "⭐": 2, // star: +2
      "🚀": 3, // rocket: +3
      "👎": -1, // thumbs down: -1
    };
  }

  /**
   * Add a reaction to a reminder
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID who reacted
   * @param {string} emoji - Emoji that was used
   * @returns {Promise<boolean>} - Success status
   */
  async addReaction(reminderId, userId, emoji) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT OR REPLACE INTO reactions (reminderId, userId, emoji) VALUES (?, ?, ?)",
        [reminderId, userId, emoji],
        async (err) => {
          if (err) return reject(err);

          // If this is a voting emoji, update the reminder's priority
          if (this.votingEmojis[emoji]) {
            try {
              await this.recalculatePriority(reminderId);
            } catch (error) {
              console.error("Error recalculating priority:", error);
            }
          }

          resolve(true);
        },
      );
    });
  }

  /**
   * Remove a reaction from a reminder
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID who reacted
   * @param {string} emoji - Emoji that was used
   * @returns {Promise<boolean>} - Success status
   */
  async removeReaction(reminderId, userId, emoji) {
    return new Promise((resolve, reject) => {
      this.db.run(
        "DELETE FROM reactions WHERE reminderId = ? AND userId = ? AND emoji = ?",
        [reminderId, userId, emoji],
        async (err) => {
          if (err) return reject(err);

          // If this was a voting emoji, update the reminder's priority
          if (this.votingEmojis[emoji]) {
            try {
              await this.recalculatePriority(reminderId);
            } catch (error) {
              console.error("Error recalculating priority:", error);
            }
          }

          resolve(true);
        },
      );
    });
  }

  /**
   * Get all reactions for a reminder
   * @param {number} reminderId - Reminder ID
   * @returns {Promise<Object>} - Object mapping emojis to arrays of user IDs
   */
  async getReactions(reminderId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT emoji, userId FROM reactions WHERE reminderId = ?",
        [reminderId],
        (err, rows) => {
          if (err) return reject(err);

          // Group reactions by emoji
          const reactions = {};
          rows.forEach((row) => {
            if (!reactions[row.emoji]) {
              reactions[row.emoji] = [];
            }
            reactions[row.emoji].push(row.userId);
          });

          resolve(reactions);
        },
      );
    });
  }

  /**
   * Recalculate a reminder's priority based on reactions
   * @param {number} reminderId - Reminder ID
   * @returns {Promise<number>} - New priority value
   */
  async recalculatePriority(reminderId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT emoji, COUNT(*) as count FROM reactions WHERE reminderId = ? GROUP BY emoji",
        [reminderId],
        (err, rows) => {
          if (err) return reject(err);

          // Calculate new priority
          let priority = 0;
          rows.forEach((row) => {
            if (this.votingEmojis[row.emoji]) {
              priority += this.votingEmojis[row.emoji] * row.count;
            }
          });

          // Update the reminder's priority
          this.db.run(
            "UPDATE reminders SET priority = ? WHERE id = ?",
            [priority, reminderId],
            function (err) {
              if (err) return reject(err);
              resolve(priority);
            },
          );
        },
      );
    });
  }

  /**
   * Get reminders sorted by priority
   * @param {string} userId - Optional: filter by user ID
   * @param {number} categoryId - Optional: filter by category ID
   * @param {string} status - Optional: filter by status (default: 'pending')
   * @returns {Promise<Array>} - Array of reminders sorted by priority
   */
  async getHighPriorityReminders(
    userId = null,
    categoryId = null,
    status = "pending",
  ) {
    return new Promise((resolve, reject) => {
      let query = "SELECT * FROM reminders WHERE status = ?";
      const params = [status];

      if (userId) {
        query += " AND userId = ?";
        params.push(userId);
      }

      if (categoryId) {
        query += " AND categoryId = ?";
        params.push(categoryId);
      }

      query += " ORDER BY priority DESC, dueTime ASC NULLS LAST";

      this.db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }
}

export default ReactionManager;
