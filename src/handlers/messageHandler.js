import { sendErrorReply, sendNotFoundSuggestCreate } from '../utils/errorHandler.js';
import CategoryHandler from './categoryHandler.js';
import ReminderFunctions from './reminderFunctions.js';
// ConversationFlowManager is now injected, so direct import for instantiation is not needed here.
// If types are needed and not available globally, it might be imported for type hinting:
// import type ConversationFlowManager from './ConversationFlowManager.js';

/**
 * Enhanced message handler with support for categories and voting
 */
class MessageHandler {
  constructor(client, contextManager, parser, reminderManager, categoryManager, reactionManager, standupHandler, retroHandler, guildManager, conversationFlowManager) {
    // No need to require EnhancedParserExtended here as it's now imported at the module level
    // Will use the parser provided in the constructor
    this.client = client;
    this.contextManager = contextManager;
    // Use the parser provided in constructor
    this.parser = parser;
    this.reminderManager = reminderManager;
    this.categoryManager = categoryManager;
    this.reactionManager = reactionManager;
    this.standupHandler = standupHandler;
    this.retroHandler = retroHandler;
    this.guildManager = guildManager;
    
    // Note: GuildHandler would need to be imported at the top of the file if needed
    // this.guildHandler = guildHandler ? guildHandler : null;
    
    // Use injected ConversationFlowManager
    this.conversationFlowManager = conversationFlowManager;
  }

  /**
   * Process incoming messages
   * @param {import('discord.js').Message} msg - Discord message
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
        // Delegate conversation state handling to ConversationFlowManager
        if (await this.conversationFlowManager.handleTimeResponse(msg, content)) return;
        if (await this.conversationFlowManager.handleCategoryResponse(msg, content)) return;
        
        // Convert content to lowercase for easier matching
        const lowerContent = content.toLowerCase();

        if (await this._handlePing(msg, lowerContent)) return;
        if (await this._handleHelp(msg, lowerContent)) return;
        if (await this._handleStandupCommand(msg, content, lowerContent)) return;
        if (await this._handleRetroCommand(msg, content, lowerContent)) return;

        // Try to handle category commands first
        const catHandler = new CategoryHandler(this.client, this.categoryManager);
        const handledByCategory = await catHandler.handleMessage(msg, content);
        if (handledByCategory) return;

        // Try to handle guild commands if guild handler is available
        if (this.guildHandler) {
          const handledByGuild = await this.guildHandler.handleMessage(msg, content);
          if (handledByGuild) return;
        }

        if (await this._handleReminderList(msg, userId, content, lowerContent)) return;
        if (await this._handleReminderModification(msg, userId, content)) return;
        if (await this._handleReminderCreation(msg, content)) return;

      } catch (error) {
        sendErrorReply(msg, null, error);
      }
    }
  }

  /**
   * Show help information
   * @param {import('discord.js').Message} msg - Discord message
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
   * Handles ping responses.
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} lowerContent - Lowercased message content
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  async _handlePing(msg, lowerContent) {
    const pingWords = ['hi', 'hello', 'hey', 'ping', 'yo', 'sup', "'sup", 'are you there', 'bot'];
    // Check if lowerContent starts with any of the pingWords or is exactly 'bot?'
    if (pingWords.some(word => lowerContent.startsWith(word)) || lowerContent === 'bot?') {
      await msg.reply('Hi there! I\'m here and ready to help with your reminders, standups, and retrospectives. What can I do for you today?');
      return true;
    }
    return false;
  }

  /**
   * Handles help command.
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} lowerContent - Lowercased message content
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  async _handleHelp(msg, lowerContent) {
    const helpTriggers = ['help', 'commands', 'support', 'what can you do'];

    for (const trigger of helpTriggers) {
      if (lowerContent.startsWith(trigger)) {
        // Check if the match is exact or followed by a space or '?'
        // e.g., "help", "help?", "help me"
        if (lowerContent.length === trigger.length ||
            lowerContent.charAt(trigger.length) === ' ' ||
            lowerContent.charAt(trigger.length) === '?') {
          await this.showHelp(msg);
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Handles standup commands.
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} content - Original message content
   * @param {string} lowerContent - Lowercased message content
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  async _handleStandupCommand(msg, content, lowerContent) {
    const standupMatch = lowerContent.match(/(?:standup|daily)(?:\s+(setup|start|list|summary|help))?/i);
    if (standupMatch) {
      if (this.standupHandler) {
        const subCommand = standupMatch[1] || '';
        const args = content.replace(/\b(?:standup|daily)\s*/i, '').trim().split(/\s+/);
        await this.standupHandler.processStandupCommand(msg, [subCommand, ...args]);
        return true;
      }
    }
    return false;
  }

  /**
   * Handles retrospective commands.
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} content - Original message content
   * @param {string} lowerContent - Lowercased message content
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  async _handleRetroCommand(msg, content, lowerContent) {
    const retroMatch = lowerContent.match(/(?:retro|retrospective)(?:\s+(setup|start|list|summary|help))?/i);
    if (retroMatch) {
      if (this.retroHandler) {
        const subCommand = retroMatch[1] || '';
        const args = content.replace(/\b(?:retro|retrospective)\s*/i, '').trim().split(/\s+/);
        await this.retroHandler.processRetroCommand(msg, [subCommand, ...args]);
        return true;
      }
    }
    return false;
  }

  /**
   * Handles listing reminders.
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} userId - User ID
   * @param {string} content - Original message content
   * @param {string} lowerContent - Lowercased message content
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  async _handleReminderList(msg, userId, content, lowerContent) {
    const reminderListMatch = lowerContent.match(/(?:show|list|what.?s|my|view|see|check|display|get|what are (?:my|the)|do i have any|show me|tell me about)\s+(?:reminders?|todos?|tasks?|list|upcoming|pending|due|stuff|things|assignments)/i);
    if (reminderListMatch) {
      let categoryId = null;
      const categoryMatch = content.match(/in\s+(?:category|tag)\s+([^\s]+)/i);
      if (categoryMatch) {
        const categoryEmoji = categoryMatch[1].trim();
        const category = await this.categoryManager.getCategoryByEmoji(categoryEmoji);
        if (category) {
          categoryId = category.id;
        }
      }

      const timeFilterMatch = lowerContent.match(/(today|this week|overdue)/i);
      let timeFilter = 'all';
      if (timeFilterMatch) {
        timeFilter = timeFilterMatch[1].toLowerCase();
        if (timeFilter === 'this week') timeFilter = 'week';
      }

      const sortByPriority = lowerContent.includes('priority') ||
                             lowerContent.includes('important') ||
                             lowerContent.includes('voted');

      await this.showRemindersSummary(msg, userId, {
        timeFilter,
        categoryId,
        sortByPriority
      });
      return true;
    }
    return false;
  }

  /**
   * Handles reminder modification (done, delete).
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} userId - User ID
   * @param {string} content - Original message content
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  async _handleReminderModification(msg, userId, content) {
    const doneMatch = content.match(/(?:done|complete|finish|completed|finished)\s+(\d+)/i);
    if (doneMatch) {
      const reminderId = doneMatch[1];
      try {
        await this.reminderManager.markReminderDone(reminderId, userId);
        await msg.reply('🎉 Reminder marked as done! Nice work!');
      } catch (error) {
        // sendErrorReply(msg, 'I couldn’t find that reminder to mark as done.', error);
        // Using sendNotFoundSuggestCreate for this specific case as it was the previous behavior
        sendNotFoundSuggestCreate(msg, 'reminder');
      }
      return true;
    }

    const deleteMatch = content.match(/(?:delete|remove|cancel)\s+(\d+)/i);
    if (deleteMatch) {
      const reminderId = deleteMatch[1];
      try {
        await this.reminderManager.deleteReminder(reminderId, userId);
        await msg.reply(`🗑️ Reminder #${reminderId} has been deleted.`);
      } catch (error) {
        // sendErrorReply(msg, `I couldn’t find reminder #${reminderId} to delete.`, error);
        // Using sendNotFoundSuggestCreate for this specific case
        sendNotFoundSuggestCreate(msg, 'reminder');
      }
      return true;
    }
    return false;
  }

  /**
   * Handles reminder creation.
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} content - Original message content
   * @returns {Promise<boolean>} - True if handled
   * @private
   */
  async _handleReminderCreation(msg, content) {
    if (content.toLowerCase().match(/(remind|todo|reminder|task|remember|don'?t forget|need to|have to|should|must)/i)) {
      await ReminderFunctions.handleReminderCreation(
        this.reminderManager,
        this.categoryManager,
        this.parser,
        this.conversationFlowManager.conversationStates,
        msg,
        content,
        this.conversationFlowManager
      );
      return true;
    }
    return false;
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
   * @param {import('discord.js').Message} msg - Discord message
   * @param {string} userId - User ID
   * @param {Object} options - Filter options
   * @param {string} [options.timeFilter='all'] - Time filter ('all', 'today', 'week', 'overdue').
   * @param {string} [options.categoryId=null] - Category ID to filter by.
   * @param {boolean} [options.sortByPriority=false] - Whether to sort by priority.
   * @returns {Promise<void>}
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
      sendErrorReply(msg, "Sorry, I couldn't retrieve your reminders.", error);
    }
  }
}

export default MessageHandler;
