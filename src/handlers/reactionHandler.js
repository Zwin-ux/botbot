
class ReactionHandler {
  constructor(client, reactionManager, categoryManager, reminderManager) {
    this.client = client;
    this.reactionManager = reactionManager;
    this.categoryManager = categoryManager;
    this.reminderManager = reminderManager;
  }

  /**
   * Initialize reaction listeners
   */
  initialize() {
    // Listen for reaction add events
    this.client.on('messageReactionAdd', async (reaction, user) => {
      // Don't process reactions from bots
      if (user.bot) return;
      
      try {
        // Check if the message has a reminder ID in the footer
        const reminderId = this.getReminderId(reaction.message);
        if (reminderId) {
          // Handle voting
          await this.handleReminderReaction(reminderId, user.id, reaction.emoji.name, true);
          return;
        }

        // Check if this is a category subscription reaction
        const categoryId = await this.getCategoryIdFromReaction(reaction);
        if (categoryId) {
          await this.handleCategorySubscription(categoryId, user.id, true);
          
          // Send confirmation DM if possible
          try {
            const category = await this.categoryManager.getCategoryById(categoryId);
            const dmChannel = await user.createDM();
            await dmChannel.send(`You've subscribed to the ${category.emoji} **${category.name}** category! You'll be notified of new reminders in this category.`);
          } catch (error) {
            console.error('Error sending DM confirmation:', error);
          }
        }
      } catch (error) {
        console.error('Error handling reaction add:', error);
      }
    });

    // Listen for reaction remove events
    this.client.on('messageReactionRemove', async (reaction, user) => {
      // Don't process reactions from bots
      if (user.bot) return;
      
      try {
        // Check if the message has a reminder ID in the footer
        const reminderId = this.getReminderId(reaction.message);
        if (reminderId) {
          // Handle voting removal
          await this.handleReminderReaction(reminderId, user.id, reaction.emoji.name, false);
          return;
        }

        // Check if this is a category subscription reaction removal
        const categoryId = await this.getCategoryIdFromReaction(reaction);
        if (categoryId) {
          await this.handleCategorySubscription(categoryId, user.id, false);
          
          // Send confirmation DM if possible
          try {
            const category = await this.categoryManager.getCategoryById(categoryId);
            const dmChannel = await user.createDM();
            await dmChannel.send(`You've unsubscribed from the ${category.emoji} **${category.name}** category.`);
          } catch (error) {
            console.error('Error sending DM confirmation:', error);
          }
        }
      } catch (error) {
        console.error('Error handling reaction remove:', error);
      }
    });
  }

  /**
   * Extract reminder ID from message if present
   * @param {Message} message - Discord message
   * @returns {number|null} - Reminder ID or null
   */
  getReminderId(message) {
    // Check embeds for footer with ID
    if (message.embeds && message.embeds.length > 0) {
      const embed = message.embeds[0];
      if (embed.footer && embed.footer.text) {
        const match = embed.footer.text.match(/ID: (\d+)/);
        if (match && match[1]) {
          return parseInt(match[1]);
        }
      }
    }

    // Check for custom ID in buttons
    if (message.components && message.components.length > 0) {
      for (const row of message.components) {
        for (const component of row.components) {
          if (component.customId) {
            const match = component.customId.match(/(?:done|snooze|delete)_(\d+)/);
            if (match && match[1]) {
              return parseInt(match[1]);
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Handle voting reactions on reminders
   * @param {number} reminderId - Reminder ID
   * @param {string} userId - User ID
   * @param {string} emoji - Emoji
   * @param {boolean} adding - True if adding, false if removing
   */
  async handleReminderReaction(reminderId, userId, emoji, adding) {
    if (adding) {
      await this.reactionManager.addReaction(reminderId, userId, emoji);
    } else {
      await this.reactionManager.removeReaction(reminderId, userId, emoji);
    }
  }

  /**
   * Get category ID from a reaction if it's on a category list message
   * @param {MessageReaction} reaction - Discord reaction
   * @returns {number|null} - Category ID or null
   */
  async getCategoryIdFromReaction(reaction) {
    // Check if this is a categories list message
    if (reaction.message.embeds && reaction.message.embeds.length > 0) {
      const embed = reaction.message.embeds[0];
      if (embed.title === 'Available Categories') {
        // Find the category with this emoji
        const category = await this.categoryManager.getCategoryByEmoji(reaction.emoji.name);
        return category ? category.id : null;
      }
    }
    return null;
  }

  /**
   * Handle category subscription
   * @param {number} categoryId - Category ID
   * @param {string} userId - User ID
   * @param {boolean} subscribe - True to subscribe, false to unsubscribe
   */
  async handleCategorySubscription(categoryId, userId, subscribe) {
    if (subscribe) {
      await this.categoryManager.subscribeUserToCategory(userId, categoryId);
    } else {
      await this.categoryManager.unsubscribeUserFromCategory(userId, categoryId);
    }
  }
}

export default ReactionHandler;
