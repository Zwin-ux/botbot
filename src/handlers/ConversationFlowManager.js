/**
 * Manages multi-step conversation flows for interactive commands,
 * such as creating reminders that require multiple pieces of information from the user.
 */
class ConversationFlowManager {
  /**
   * @param {EnhancedParserExtended} parser - The message parser utility.
   * @param {ReminderManager} reminderManager - The reminder manager utility.
   * @param {CategoryManager} categoryManager - The category manager utility.
   */
  constructor(parser, reminderManager, categoryManager) {
    this.parser = parser;
    this.reminderManager = reminderManager;
    this.categoryManager = categoryManager;
    this.conversationStates = new Map();
  }

  /**
   * Initiates a conversation for an incomplete reminder, asking for the time.
   * This method is typically called when a reminder is being created but the time is missing.
   * @param {import('discord.js').Message} msg - Discord message object.
   * @param {string} task - The task content of the reminder.
   * @returns {Promise<void>}
   */
  async handleIncompleteReminder(msg, task) {
    const userId = msg.author.id;
    this.conversationStates.set(userId, { state: 'AWAITING_TIME', task });
    await msg.reply(`Got it! When would you like to be reminded to "${task}"? (e.g., "in 2 hours", "tomorrow at 3pm")`);
  }

  /**
   * Handles the user's response when the bot is awaiting a time for a reminder.
   * If the time is valid, it transitions to awaiting a category or finalizes the reminder.
   * @param {import('discord.js').Message} msg - Discord message object.
   * @param {string} timeText - The text provided by the user for the time.
   * @returns {Promise<boolean>} - True if the response was handled as part of this conversation flow, false otherwise.
   */
  async handleTimeResponse(msg, timeText) {
    const userId = msg.author.id;
    const state = this.conversationStates.get(userId);
    if (!state || state.state !== 'AWAITING_TIME') return false;

    const dueTime = this.parser.parseTime(timeText);
    if (!dueTime) {
      await msg.reply("I couldn't understand that time. Could you try again? (e.g., 'in 2 hours', 'tomorrow at 3pm')");
      return true;
    }

    // Move to category selection state
    this.conversationStates.set(userId, {
      state: 'AWAITING_CATEGORY',
      task: state.task,
      time: dueTime
    });

    // Show category selection prompt
    const categories = await this.categoryManager.getAllCategories();
    let message = "Thanks! Would you like to add this to a specific category?\n\n";

    if (categories.length > 0) {
      message += categories.map((cat, i) => `${i + 1}. ${cat.emoji} ${cat.name}`).join('\n');
      message += "\n\nReply with the number, or 'none' if you don't want to use a category.";
    } else {
      message += "You don't have any categories set up yet. Reply with:\n";
      message += "1. 'create [emoji] [name]' to create a new category\n";
      message += "2. 'none' to continue without a category";
    }

    await msg.reply(message);
    return true;
  }

  /**
   * Handles the user's response when the bot is awaiting a category for a reminder.
   * Finalizes reminder creation after processing the category selection.
   * @param {import('discord.js').Message} msg - Discord message object.
   * @param {string} response - The user's response regarding category selection.
   * @returns {Promise<boolean>} - True if the response was handled as part of this conversation flow, false otherwise.
   */
  async handleCategoryResponse(msg, response) {
    const userId = msg.author.id;
    const state = this.conversationStates.get(userId);
    if (!state || state.state !== 'AWAITING_CATEGORY') return false;

    let categoryId = null;

    if (response.toLowerCase().match(/^(none|skip|no|0)$/)) {
      // Continue without a category
    } else if (response.match(/^create (\p{Emoji_Presentation}|\p{Extended_Pictographic}) (.+)$/ui)) {
      const matches = response.match(/^create (\p{Emoji_Presentation}|\p{Extended_Pictographic}) (.+)$/ui);
      const emoji = matches[1];
      const name = matches[2].trim();

      try {
        categoryId = await this.categoryManager.createCategory(name, emoji, `Created by ${msg.author.tag}`);
        await this.categoryManager.subscribeUserToCategory(userId, categoryId);
        await msg.reply(`✅ Created new category **${name}** ${emoji}! You're automatically subscribed.`);
      } catch (error) {
        console.error('Error creating category:', error);
        await msg.reply('Sorry, I had trouble creating that category. I\'ll continue without a category.');
      }
    } else if (response.match(/^[1-9]\d*$/)) {
      const categoryIndex = parseInt(response) - 1;
      const categories = await this.categoryManager.getAllCategories();

      if (categoryIndex >= 0 && categoryIndex < categories.length) {
        categoryId = categories[categoryIndex].id;
      } else {
        await msg.reply(`That's not a valid category number. I'll continue without a category.`);
      }
    } else if (response.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/ui)) {
      const matches = response.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/ui);
      const emoji = matches[1];

      const category = await this.categoryManager.getCategoryByEmoji(emoji);
      if (category) {
        categoryId = category.id;
      } else {
        await msg.reply(`I don't recognize a category with the emoji ${emoji}. I'll continue without a category.`);
      }
    } else {
      await msg.reply(`I didn't understand that choice. I'll continue without a category.`);
    }

    this.conversationStates.delete(userId);

    await this.reminderManager.createReminder(
      msg.author.id,
      msg.author.tag,
      state.task,
      state.time,
      msg.channel.id,
      categoryId
    );

    return msg.reply('🎊 Reminder created! I’ll remind you when it’s time.');
  }
}

export default ConversationFlowManager;
