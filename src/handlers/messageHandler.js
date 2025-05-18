/**
 * Enhanced message handler with support for categories and voting
 */
class MessageHandler {
  constructor(client, contextManager, parser, reminderManager, categoryManager, reactionManager, standupHandler, retroHandler) {
    this.client = client;
    this.contextManager = contextManager;
    this.parser = parser;
    this.reminderManager = reminderManager;
    this.categoryManager = categoryManager;
    this.reactionManager = reactionManager;
    this.standupHandler = standupHandler;
    this.retroHandler = retroHandler;
    
    // Conversation state management (for interactive flows)
    this.conversationStates = new Map();
  }

  /**
   * Process incoming messages
   * @param {Message} msg - Discord message
   * @returns {Promise<void>}
   */
  async handleMessage(msg) {
    // Don't process messages from bots
    if (msg.author.bot) return;
    
    // Allow bot to work in DMs or specified channels
    if (msg.channel.type === 'DM' || msg.guild) {
      const userId = msg.author.id;
      const content = msg.content.trim();
      
      try {
        // First, check if we're in a conversation state
        const state = this.conversationStates.get(userId);
        
        // If we're waiting for a time, try to handle that first
        if (state?.state === 'AWAITING_TIME') {
          const handled = await this.handleTimeResponse(msg, content);
          if (handled) return;
        }
        
        // If we're waiting for a category, try to handle that
        if (state?.state === 'AWAITING_CATEGORY') {
          const handled = await this.handleCategoryResponse(msg, content);
          if (handled) return;
        }
        
        // Convert content to lowercase for easier matching
        const lowerContent = content.toLowerCase();
        
        // Ping response
        if (lowerContent.match(/^(hi|hello|hey|ping|yo|sup|'?sup|are you there|bot\??)/i)) {
          return msg.reply('Hi there! I\'m here and ready to help with your reminders, standups, and retrospectives. What can I do for you today?');
        }
        
        // Help command
        if (lowerContent.match(/^(help|what can you do|commands|support)\??/i)) {
          return this.showHelp(msg);
        }
        
        // Handle standup commands
        const standupMatch = lowerContent.match(/(?:standup|daily)(?:\s+(setup|start|list|summary|help))?/i);
        if (standupMatch) {
          if (this.standupHandler) {
            const subCommand = standupMatch[1] || '';
            const args = content.replace(/\b(?:standup|daily)\s*/i, '').trim().split(/\s+/);
            await this.standupHandler.processStandupCommand(msg, [subCommand, ...args]);
            return;
          }
        }
        
        // Handle retrospective commands
        const retroMatch = lowerContent.match(/(?:retro|retrospective)(?:\s+(setup|start|list|summary|help))?/i);
        if (retroMatch) {
          if (this.retroHandler) {
            const subCommand = retroMatch[1] || '';
            const args = content.replace(/\b(?:retro|retrospective)\s*/i, '').trim().split(/\s+/);
            await this.retroHandler.processRetroCommand(msg, [subCommand, ...args]);
            return;
          }
        }
        
        // Try to handle category commands first
        const categoryHandler = require('./categoryHandler');
        const catHandler = new categoryHandler(this.client, this.categoryManager);
        const handledByCategory = await catHandler.handleMessage(msg, content);
        if (handledByCategory) return;
        
        // Show reminders commands with enhanced filtering and natural language
        const reminderListMatch = lowerContent.match(/(?:show|list|what.?s|my|view|see|check|display|get|what are (?:my|the)|do i have any)\s+(?:reminders?|todos?|tasks?|list|upcoming|pending|due)/i);
        if (reminderListMatch) {
          // Check for category filter
          let categoryId = null;
          const categoryMatch = content.match(/in\s+(?:category|tag)\s+([^\s]+)/i);
          if (categoryMatch) {
            const categoryEmoji = categoryMatch[1].trim();
            const category = await this.categoryManager.getCategoryByEmoji(categoryEmoji);
            if (category) {
              categoryId = category.id;
            }
          }
          
          // Check for time filter
          const timeFilterMatch = content.toLowerCase().match(/(today|this week|overdue)/i);
          let timeFilter = 'all';
          if (timeFilterMatch) {
            timeFilter = timeFilterMatch[1].toLowerCase();
            if (timeFilter === 'this week') timeFilter = 'week';
          }
          
          // Check for priority sorting
          const sortByPriority = content.toLowerCase().includes('priority') || 
                                 content.toLowerCase().includes('important') || 
                                 content.toLowerCase().includes('voted');
          
          return this.showRemindersSummary(msg, userId, {
            timeFilter, 
            categoryId,
            sortByPriority
          });
        }
        
        // Mark reminder as done
        const doneMatch = content.match(/(?:done|complete|finish|completed|finished)\s+(\\d+)/i);
        if (doneMatch) {
          const reminderId = doneMatch[1];
          try {
            await this.reminderManager.markReminderDone(reminderId, userId);
            // Confetti/celebratory feedback for first-time reminder completion
          return msg.reply('🎉 Reminder marked as done! Nice work!');
          } catch (error) {
            // Friendly suggestion for reminders
          const { getSetupSuggestion } = require('../features/setupSuggest');
          const { embed, row } = getSetupSuggestion('reminder');
          return msg.reply({ content: 'I couldn’t find that reminder. Want to create a new one?', embeds: [embed], components: [row] });
          }
        }
        
        // Delete reminder
        const deleteMatch = content.match(/(?:delete|remove|cancel)\s+(\\d+)/i);
        if (deleteMatch) {
          const reminderId = deleteMatch[1];
          try {
            await this.reminderManager.deleteReminder(reminderId, userId);
            return msg.reply(`🗑️ Reminder #${reminderId} has been deleted.`);
          } catch (error) {
            // Friendly suggestion for reminders
          const { getSetupSuggestion } = require('../features/setupSuggest');
          const { embed, row } = getSetupSuggestion('reminder');
          return msg.reply({ content: 'I couldn’t find that reminder. Want to create a new one?', embeds: [embed], components: [row] });
          }
        }
        
        // Handle reminder creation with enhanced parser
        if (content.toLowerCase().match(/(remind|todo|reminder|task|remember)/i)) {
          return this.handleReminderCreation(msg, content);
        }
      } catch (error) {
        console.error('Error processing message:', error);
        msg.reply('Sorry, I ran into a problem processing your message. Please try again.').catch(console.error);
      }
    }
  }

  /**
   * Show help information
   * @param {Message} msg - Discord message
   */
  async showHelp(msg) {
    const helpEmbed = {
      color: 0x0099ff,
      title: 'How to Use Me',
      description: 'Talk to me naturally. No special commands needed.',
      fields: [
        {
          name: 'Reminders',
          value: 'Set a reminder: "remind me to call John tomorrow at 3pm"\n' +
                 'Recurring: "remind me to drink water every day at 9am"\n' +
                 'In X time: "remind me in 30 minutes to check the oven"'
        },
        {
          name: 'To-Do List',
          value: 'Add: "todo buy milk"\n' +
                 'View: "show my todos"\n' +
                 'Complete: "done 1" or click Done button\n' +
                 'Delete: "delete 2" or click Delete button\n' +
                 'Snooze: "snooze 1 for 1 hour" or click Snooze button'
        },
        {
          name: 'Games',
          value: 'Start a game: "start emoji race" or "start trivia"\n' +
                 'Join a game: "join"\n' +
                 'Available games: emoji race, trivia, word chain, guess the number\n' +
                 'End game: "end game" (moderators only)'
        },
        {
          name: 'Quick Examples',
          value: 'remind me to water plants in 1 hour\n' +
                 'todo finish project by friday\n' +
                 'show my reminders\n' +
                 'start trivia'
        }
      ],
      footer: {
        text: 'Type your request like you would say it to a person.'
      }
    };

    await msg.reply({ embeds: [helpEmbed] });
  }

  /**
   * Handle reminder creation
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   */
  async handleReminderCreation(msg, content) {
    const result = this.parser.parseReminder(content);
    
    if (!result.task) {
      return msg.reply("I'm not sure what you want to be reminded about. Could you try again with something like 'remind me to call John tomorrow'?");
    }
    
    if (!result.time) {
      return this.handleIncompleteReminder(msg, result.task);
    }
    
    // Look for category emoji in the message
    const emojiMatch = content.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu);
    let categoryId = null;
    
    if (emojiMatch) {
      // Check if any of the emojis match a category
      for (const emoji of emojiMatch) {
        const category = await this.categoryManager.getCategoryByEmoji(emoji);
        if (category) {
          categoryId = category.id;
          break;
        }
      }
    }
    
    // If no category was found but we have emojis, ask user if they want to create one
    if (!categoryId && emojiMatch && emojiMatch.length > 0) {
      this.conversationStates.set(msg.author.id, { 
        state: 'AWAITING_CATEGORY',
        task: result.task,
        time: result.time,
        suggestedEmoji: emojiMatch[0]
      });
      
      return msg.reply(`I noticed you used the emoji ${emojiMatch[0]}. Would you like to:\n1. Create a new category with this emoji\n2. Use an existing category\n3. Don't use a category\n\nReply with the number or your choice.`);
    }
    
    // Create the reminder with the category if available
    const reminder = await this.reminderManager.createReminder(
      msg.author.id,
      msg.author.tag,
      result.task,
      result.time,
      msg.channel.id,
      categoryId
    );
    
    // Confetti/celebratory feedback for first reminder creation
    return msg.reply('🎊 Reminder created! I’ll remind you when it’s time.');
  }

  /**
   * Handle incomplete reminder (missing time)
   * @param {Message} msg - Discord message
   * @param {string} task - Task content
   */
  async handleIncompleteReminder(msg, task) {
    const userId = msg.author.id;
    this.conversationStates.set(userId, { state: 'AWAITING_TIME', task });
    await msg.reply(`Got it! When would you like to be reminded to "${task}"? (e.g., "in 2 hours", "tomorrow at 3pm")`);
  }

  /**
   * Handle time response in conversation
   * @param {Message} msg - Discord message
   * @param {string} timeText - Time text
   * @returns {Promise<boolean>} - True if handled
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
      message += categories.map((cat, i) => `${i+1}. ${cat.emoji} ${cat.name}`).join('\n');
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
   * Handle category response in conversation
   * @param {Message} msg - Discord message
   * @param {string} response - User response
   * @returns {Promise<boolean>} - True if handled
   */
  async handleCategoryResponse(msg, response) {
    const userId = msg.author.id;
    const state = this.conversationStates.get(userId);
    if (!state || state.state !== 'AWAITING_CATEGORY') return false;
    
    let categoryId = null;
    
    // Check if user said "none" or "skip"
    if (response.toLowerCase().match(/^(none|skip|no|0)$/)) {
      // Continue without a category
    } else if (response.match(/^create (\p{Emoji_Presentation}|\p{Extended_Pictographic}) (.+)$/ui)) {
      // Create a new category
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
      // User selected a category by number
      const categoryIndex = parseInt(response) - 1;
      const categories = await this.categoryManager.getAllCategories();
      
      if (categoryIndex >= 0 && categoryIndex < categories.length) {
        categoryId = categories[categoryIndex].id;
      } else {
        await msg.reply(`That's not a valid category number. I'll continue without a category.`);
      }
    } else if (response.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/ui)) {
      // User provided an emoji
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
    
    // Clear conversation state
    this.conversationStates.delete(userId);
    
    // Create the reminder
    const reminder = await this.reminderManager.createReminder(
      msg.author.id,
      msg.author.tag,
      state.task,
      state.time,
      msg.channel.id,
      categoryId
    );
    
    // Confetti/celebratory feedback for first reminder creation
    return msg.reply('🎊 Reminder created! I’ll remind you when it’s time.');
  }

  /**
   * Create an interactive embedded message for a reminder
   * @param {Object} reminder - Reminder object
   * @returns {Object} - Discord message options with embed and components
   */
  createReminderEmbed(reminder) {
    const embed = {
      color: 0x0099ff,
      title: 'Reminder Set!',
      fields: [
        { name: 'Task', value: reminder.content, inline: true }
      ],
      footer: {
        text: `ID: ${reminder.id}`
      },
      timestamp: new Date()
    };

    if (reminder.dueTime) {
      const dueDate = new Date(reminder.dueTime * 1000);
      embed.fields.push({ 
        name: 'Due', 
        value: dueDate.toLocaleString(), 
        inline: true 
      });
    } else {
      embed.fields.push({ 
        name: 'Due', 
        value: 'No specific time', 
        inline: true 
      });
    }
    
    // Add category if present
    if (reminder.categoryId && reminder.categoryName) {
      embed.fields.push({
        name: 'Category',
        value: `${reminder.categoryEmoji} ${reminder.categoryName}`,
        inline: true
      });
    }

    const row = {
      type: 1,
      components: [
        {
          type: 2,
          custom_id: `done_${reminder.id}`,
          label: 'Done ✅',
          style: 3 // SUCCESS
        },
        {
          type: 2,
          custom_id: `snooze_${reminder.id}`,
          label: 'Snooze ⏰',
          style: 1 // PRIMARY
        },
        {
          type: 2,
          custom_id: `delete_${reminder.id}`,
          label: 'Delete 🗑️',
          style: 4 // DANGER
        }
      ]
    };

    return { 
      embeds: [embed], 
      components: [row] 
    };
  }

  /**
   * Show reminders summary with enhanced filtering
   * @param {Message} msg - Discord message
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   */
  async showRemindersSummary(msg, userId, options = {}) {
    try {
      const reminders = await this.reminderManager.getUserReminders(userId, options);
      
      if (reminders.length === 0) {
        let noRemindersMsg = "You don't have any active reminders";
        
        if (options.timeFilter === 'today') {
          noRemindersMsg = "You don't have any reminders for today! 🎉";
        } else if (options.timeFilter === 'week') {
          noRemindersMsg = "You don't have any reminders for this week! 🎉";
        } else if (options.timeFilter === 'overdue') {
          noRemindersMsg = "No overdue reminders! You're all caught up! 🎉";
        }
        
        if (options.categoryId) {
          const category = await this.categoryManager.getCategoryById(options.categoryId);
          if (category) {
            noRemindersMsg += ` in the ${category.emoji} ${category.name} category.`;
          }
        }
        
        return msg.reply(noRemindersMsg);
      }

      let title = `Your reminders`;
      
      if (options.timeFilter === 'today') {
        title = `Today's reminders`;
      } else if (options.timeFilter === 'week') {
        title = `This week's reminders`;
      } else if (options.timeFilter === 'overdue') {
        title = `Overdue reminders`;
      }
      
      if (options.categoryId) {
        const category = await this.categoryManager.getCategoryById(options.categoryId);
        if (category) {
          title += ` in ${category.emoji} ${category.name}`;
        }
      }
      
      if (options.sortByPriority) {
        title += ` (sorted by priority)`;
      }
      
      const embed = {
        color: 0x0099ff,
        title: title,
        description: '',
        fields: [],
        footer: {
          text: `Showing ${reminders.length} reminder(s)`
        }
      };
      
      for (const reminder of reminders) {
        let dueText = 'No specific time';
        if (reminder.dueTime) {
          const dueDate = new Date(reminder.dueTime * 1000);
          dueText = `⏰ ${dueDate.toLocaleString()}`;
        }
        
        let categoryText = '';
        if (reminder.categoryName) {
          categoryText = `\n${reminder.categoryEmoji} ${reminder.categoryName}`;
        }
        
        let priorityText = '';
        if (options.sortByPriority && reminder.priority !== undefined) {
          const prioritySymbol = reminder.priority > 0 ? '⬆️' : 
                              reminder.priority < 0 ? '⬇️' : '↔️';
          priorityText = `\nPriority: ${prioritySymbol} ${reminder.priority}`;
        }
        
        embed.fields.push({
          name: `#${reminder.id}: ${reminder.content}`,
          value: `${dueText}${categoryText}${priorityText}`
        });
      }
      
      // Add quick filters if showing all reminders
      if (!options.timeFilter || options.timeFilter === 'all') {
        const now = Math.floor(Date.now() / 1000);
        const today = reminders.filter(r => {
          if (!r.dueTime) return false;
          const date = new Date(r.dueTime * 1000);
          const today = new Date();
          return date.getDate() === today.getDate() &&
                 date.getMonth() === today.getMonth() &&
                 date.getFullYear() === today.getFullYear();
        }).length;
        
        const overdue = reminders.filter(r => r.dueTime && r.dueTime < now).length;
        
        if (today > 0 || overdue > 0) {
          let quickFilters = '\n\n**Quick Filters:**\n';
          if (today > 0) quickFilters += `- Show today's reminders (${today})\n`;
          if (overdue > 0) quickFilters += `- Show overdue reminders (${overdue})\n`;
          
          embed.description = quickFilters;
        }
      }
      
      return msg.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error showing reminders summary:', error);
      return msg.reply("Sorry, I couldn't retrieve your reminders. Please try again later.");
    }
  }
}

module.exports = MessageHandler;
