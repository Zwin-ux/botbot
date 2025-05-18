/**
 * Utility for migrating existing reminders to the new system
 * Allows categorizing existing reminders and setting initial priorities
 */
class DataMigrator {
  constructor(db, categoryManager) {
    this.db = db;
    this.categoryManager = categoryManager;
  }

  /**
   * Get all uncategorized reminders
   * @param {string} [userId] - Optional: filter by user ID
   * @returns {Promise<Array>} - Array of uncategorized reminders
   */
  async getUncategorizedReminders(userId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM reminders WHERE categoryId IS NULL';
      const params = [];
      
      if (userId) {
        query += ' AND userId = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY dueTime ASC NULLS LAST';
      
      this.db.all(query, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
  }

  /**
   * Bulk categorize reminders by pattern matching
   * @param {Object} patterns - Object mapping regex patterns to category IDs
   * @param {string} [userId] - Optional: filter by user ID
   * @returns {Promise<Object>} - Results object with counts
   */
  async bulkCategorizeByPattern(patterns, userId = null) {
    const results = {
      total: 0,
      categorized: 0,
      byCategory: {}
    };
    
    try {
      // Get uncategorized reminders
      const reminders = await this.getUncategorizedReminders(userId);
      results.total = reminders.length;
      
      // Process each reminder
      for (const reminder of reminders) {
        for (const [pattern, categoryId] of Object.entries(patterns)) {
          const regex = new RegExp(pattern, 'i');
          if (regex.test(reminder.content)) {
            // Update reminder with category
            await this.updateReminderCategory(reminder.id, categoryId);
            
            // Track results
            if (!results.byCategory[categoryId]) {
              results.byCategory[categoryId] = 0;
            }
            results.byCategory[categoryId]++;
            results.categorized++;
            break;
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk categorization:', error);
      throw error;
    }
  }

  /**
   * Suggest categories for a reminder
   * @param {string} reminderContent - Reminder content
   * @returns {Promise<Array>} - Array of suggested categories with scores
   */
  async suggestCategories(reminderContent) {
    try {
      // Get all categories
      const categories = await this.categoryManager.getAllCategories();
      const suggestions = [];
      
      // Simple keyword-based scoring
      const keywords = {
        '📝': ['document', 'write', 'note', 'update', 'report', 'draft'],
        '👤': ['personal', 'family', 'health', 'doctor', 'appointment', 'gym', 'call', 'buy'],
        '💼': ['meeting', 'client', 'email', 'presentation', 'review', 'work', 'project', 'deadline'],
        '🚨': ['urgent', 'immediately', 'asap', 'emergency', 'critical', 'important', 'due'],
        '🚀': ['release', 'deploy', 'launch', 'ship', 'milestone', 'goal']
      };
      
      // Score each category
      for (const category of categories) {
        let score = 0;
        
        // Check for exact emoji match
        if (reminderContent.includes(category.emoji)) {
          score += 5;
        }
        
        // Check for name match
        if (reminderContent.toLowerCase().includes(category.name.toLowerCase())) {
          score += 4;
        }
        
        // Check for keyword matches
        const categoryKeywords = keywords[category.emoji] || [];
        for (const keyword of categoryKeywords) {
          if (reminderContent.toLowerCase().includes(keyword.toLowerCase())) {
            score += 2;
          }
        }
        
        if (score > 0) {
          suggestions.push({
            id: category.id,
            name: category.name,
            emoji: category.emoji,
            score: score
          });
        }
      }
      
      // Sort by score (descending)
      suggestions.sort((a, b) => b.score - a.score);
      
      return suggestions;
    } catch (error) {
      console.error('Error suggesting categories:', error);
      return [];
    }
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
        'UPDATE reminders SET categoryId = ? WHERE id = ?',
        [categoryId, reminderId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Generate a migration report
   * @returns {Promise<string>} - Migration report text
   */
  async generateMigrationReport() {
    try {
      const categories = await this.categoryManager.getAllCategories();
      const uncategorizedCount = (await this.getUncategorizedReminders()).length;
      
      let report = `# Reminder Migration Report\n\n`;
      report += `## Status\n`;
      report += `- **Uncategorized reminders:** ${uncategorizedCount}\n\n`;
      
      report += `## Categories\n`;
      for (const category of categories) {
        // Count reminders in this category
        const count = await this.getCategoryReminderCount(category.id);
        report += `- ${category.emoji} **${category.name}:** ${count} reminders\n`;
      }
      
      report += `\n## Migration Commands\n`;
      report += `- \`migrate list\` - Show uncategorized reminders\n`;
      report += `- \`migrate suggest [id]\` - Get category suggestions for a reminder\n`;
      report += `- \`migrate set [id] [emoji]\` - Set a reminder's category\n`;
      report += `- \`migrate auto\` - Auto-categorize reminders based on content\n`;
      
      return report;
    } catch (error) {
      console.error('Error generating migration report:', error);
      return 'Error generating migration report.';
    }
  }

  /**
   * Get count of reminders in a category
   * @param {number} categoryId - Category ID
   * @returns {Promise<number>} - Count of reminders
   */
  async getCategoryReminderCount(categoryId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT COUNT(*) as count FROM reminders WHERE categoryId = ?',
        [categoryId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row ? row.count : 0);
        }
      );
    });
  }
}

module.exports = DataMigrator;
