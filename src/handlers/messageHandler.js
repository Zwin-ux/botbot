/**
 * Enhanced message handler with support for categories and voting
 */
class MessageHandler {
  constructor(client, contextManager, parser, reminderManager, categoryManager, reactionManager, standupHandler, retroHandler, guildManager) {
    // Check if we have the extended parser
    const EnhancedParserExtended = require('../enhancedParserExtended');
    const extendedParser = new EnhancedParserExtended();
    this.client = client;
    this.contextManager = contextManager;
    // Use extended parser if available, otherwise fall back to original parser
    this.parser = extendedParser || parser;
    this.reminderManager = reminderManager;
    this.categoryManager = categoryManager;
    this.reactionManager = reactionManager;
    this.standupHandler = standupHandler;
    this.retroHandler = retroHandler;
    this.guildManager = guildManager;
    
    // Initialize guild handler if guild manager is available
    if (this.guildManager) {
      const GuildHandler = require('./guildHandler');
      this.guildHandler = new GuildHandler(client, guildManager, reminderManager);
    }
    
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
        
        // Try to handle guild commands if guild handler is available
        if (this.guildHandler) {
          const handledByGuild = await this.guildHandler.handleMessage(msg, content);
          if (handledByGuild) return;
        }
        
        // Show reminders commands with enhanced filtering and natural language
        const reminderListMatch = lowerContent.match(/(?:show|list|what.?s|my|view|see|check|display|get|what are (?:my|the)|do i have any|show me|tell me about)\s+(?:reminders?|todos?|tasks?|list|upcoming|pending|due|stuff|things|assignments)/i);
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
        if (content.toLowerCase().match(/(remind|todo|reminder|task|remember|don'?t forget|need to|have to|should|must)/i)) {
          // Use the new ReminderFunctions module
          const ReminderFunctions = require('./reminderFunctions');
          return ReminderFunctions.handleReminderCreation(
            this.reminderManager,
            this.categoryManager,
            this.parser,
            this.conversationStates,
            msg,
            content
          );
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
      title: 'Bot Commands and Features',
      description: "I understand natural language! Here's a breakdown of what I can do and some examples:",
      fields: [
        {
          name: 'Reminders & Tasks',
          value: '**Setting Reminders/Tasks:**\n' +
                 '- "remind me to call John tomorrow at 3pm"\n' +
                 '- "todo buy milk for tomorrow morning"\n' +
                 '- "remember to check the oven in 20 minutes"\n' +
                 '- "task: send email next Monday"\n' +
                 '**Recurring Reminders:**\n' +
                 '- "remind me to drink water every day at 9am"\n' +
                 '- "set a reminder for standup every weekday at 10"\n' +
                 '**Viewing Reminders/Tasks:**\n' +
                 '- "show my todos"\n' +
                 '- "what are my reminders for today?"\n' +
                 '- "list my tasks for this week"\n' +
                 '- "do I have anything due tomorrow?"\n' +
                 '**Managing Reminders/Tasks:**\n' +
                 '- "done 1" (to complete the first task in the list)\n' +
                 '- "complete task 3"\n' +
                 '- "delete reminder 2"\n' +
                 '- "remove todo 4"\n' +
                 '- "snooze task 1 for 1 hour"\n' +
                 '- "delay reminder 2 by 30 minutes"'
        },
        {
          name: 'Categories',
          value: '**Creating & Using Categories:**\n' +
                 '- "create category :work: Work Projects"\n' +
                 '- "new category :house: Home Chores"\n' +
                 '- "todo buy milk :shopping_cart:" (adds to existing or prompts to create)\n' +
                 '- "remind me to finish report :work: by Friday"\n' +
                 '**Viewing Categories & Categorized Tasks:**\n' +
                 '- "show categories"\n' +
                 '- "list my tags"\n' +
                 '- "show my :shopping_cart: todos"\n' +
                 '- "what work tasks do I have?" (if "Work" category exists)'
        },
        {
          name: 'Games',
          value: '**Starting & Joining Games:**\n' +
                 '- "start emoji race"\n' +
                 '- "let\'s play emoji race"\n' +
                 '- "join game"\n' +
                 '_(Currently, only Emoji Race is available. More games coming soon!)_'
        },
        {
          name: 'General Help',
          value: '**Asking for Help:**\n' +
                 '- "help"\n' +
                 '- "what can you do?"\n' +
                 '- "show me commands"\n' +
                 '- "how do I set a reminder with a category?"\n' +
                 '- "can you show examples for tasks?"'
        }
      ],
      footer: {
        text: "Tip: Don't worry about exact phrasing. I'll do my best to understand!"
      }
    };

    await msg.reply({ embeds: [helpEmbed] });
  }

  /**
        state: 'AWAITING_CATEGORY',
        data: {
          task: result.task,
          time: result.time,
          emoji: emojiMatch[0],
          priority: result.priority || 0,
          target: result.target
        }
      });
    
      return msg.reply(`I noticed you used the emoji ${emojiMatch[0]}. Would you like to:\n1. Create a new category with this emoji\n2. Use an existing category\n3. Don't use a category\n\nReply with the number or your choice.`);
    }
  }
  
  // Handle non-self targets like team or channels if supported
  if (result.target && !result.target.self) {
    return this.handleTargetedReminder(msg, result, categoryId);
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
