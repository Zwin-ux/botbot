/**
 * Enhanced reminder handling functions
 * These functions extend the MessageHandler to support more natural language capabilities
 */
class ReminderFunctions {
  /**
   * Handle reminder creation
   * @param {Object} reminderManager - The reminder manager instance
   * @param {Object} categoryManager - The category manager instance
   * @param {Object} parser - The parser instance
   * @param {Map} conversationStates - The conversation states map
   * @param {Message} msg - Discord message
   * @param {string} content - Message content
   * @returns {Promise<Message>} - Reply message
   */
  static async handleReminderCreation(reminderManager, categoryManager, parser, conversationStates, msg, content) {
    const result = parser.parseReminder(content);
    
    if (!result.task) {
      return msg.reply("I'm not sure what you want to be reminded about. Could you try again with something like 'remind me to call John tomorrow'?");
    }
    
    // Handle recurring reminders if supported by the parser
    if (result.recurring) {
      return this.handleRecurringReminder(reminderManager, categoryManager, msg, result);
    }
    
    // If not recurring and no time specified, ask for a time
    if (!result.time) {
      return this.handleIncompleteReminder(conversationStates, msg, result.task);
    }
    
    // Look for category emoji in the message
    const emojiMatch = content.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu);
    let categoryId = null;
    
    if (emojiMatch && emojiMatch.length > 0) {
      // Check if the emoji matches an existing category
      const category = await categoryManager.getCategoryByEmoji(emojiMatch[0]);
      if (category) {
        categoryId = category.id;
      } else {
        // Enter a conversation state to ask about category creation
        conversationStates.set(msg.author.id, {
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
    if (result.target && (!result.target.self)) {
      return this.handleTargetedReminder(reminderManager, msg, result, categoryId);
    }
    
    // Create the reminder with the category if available and priority if specified
    const reminder = await reminderManager.createReminder(
      msg.author.id,
      msg.author.tag,
      result.task,
      result.time,
      msg.channel.id,
      categoryId,
      result.priority || 0
    );
    
    // Confetti/celebratory feedback for first reminder creation
    return msg.reply('🎊 Reminder created! I'll remind you when it's time.');
  }

  /**
   * Handle recurring reminders
   * @param {Object} reminderManager - The reminder manager instance  
   * @param {Object} categoryManager - The category manager instance
   * @param {Message} msg - Discord message
   * @param {Object} result - Parsed reminder result
   * @returns {Promise<Message>} - Reply message
   */
  static async handleRecurringReminder(reminderManager, categoryManager, msg, result) {
    try {
      // Extract recurring information
      const { frequency, hour, minute } = result.recurring;
      let cronExpression = '';
      
      // Build cron expression based on frequency
      switch (frequency) {
        case 'day':
        case 'daily':
        case 'morning':
        case 'afternoon':
        case 'evening':
        case 'night':
          // Daily at the specified time
          cronExpression = `${minute} ${hour} * * *`;
          break;
        case 'week':
        case 'weekly':
          // Weekly on the same day at the specified time
          cronExpression = `${minute} ${hour} * * ${new Date().getDay()}`;
          break;
        case 'monday':
        case 'tuesday':
        case 'wednesday':
        case 'thursday':
        case 'friday':
        case 'saturday':
        case 'sunday':
          // On specific day of the week
          const days = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 };
          cronExpression = `${minute} ${hour} * * ${days[frequency]}`;
          break;
        case 'weekday':
          // Monday through Friday
          cronExpression = `${minute} ${hour} * * 1-5`;
          break;
        case 'weekend':
          // Saturday and Sunday
          cronExpression = `${minute} ${hour} * * 0,6`;
          break;
        default:
          // Default to daily
          cronExpression = `${minute} ${hour} * * *`;
      }
      
      // Look for category emoji in the message
      let categoryId = null;
      // Check if the task contains an emoji
      const emojiMatch = result.task.match(/\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu);
      if (emojiMatch && emojiMatch.length > 0) {
        // Check if the emoji matches an existing category
        const category = await categoryManager.getCategoryByEmoji(emojiMatch[0]);
        if (category) {
          categoryId = category.id;
        }
      }
      
      // Create a recurring reminder
      // Note: We'll implement a basic version here since the actual implementation depends on ReminderManager
      const reminder = await reminderManager.createReminder(
        msg.author.id,
        msg.author.tag,
        result.task,
        new Date(), // Set initial time to now, but flag as recurring
        msg.channel.id,
        categoryId,
        result.priority || 0,
        { recurring: true, cronExpression } // Pass recurring metadata
      );
      
      // Format a user-friendly message about the recurring reminder
      let friendlyTime;
      if (hour < 12) {
        friendlyTime = `${hour === 0 ? 12 : hour}:${minute.toString().padStart(2, '0')} AM`;
      } else {
        friendlyTime = `${hour === 12 ? 12 : hour - 12}:${minute.toString().padStart(2, '0')} PM`;
      }
      
      let friendlyFrequency;
      switch (frequency) {
        case 'day':
        case 'daily':
          friendlyFrequency = 'daily';
          break;
        case 'week':
        case 'weekly':
          friendlyFrequency = 'weekly';
          break;
        case 'weekday':
          friendlyFrequency = 'every weekday';
          break;
        case 'weekend':
          friendlyFrequency = 'every weekend';
          break;
        default:
          // If it's a specific day
          if (Object.keys({ monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 0 }).includes(frequency)) {
            friendlyFrequency = `every ${frequency}`;
          } else {
            friendlyFrequency = frequency;
          }
      }
      
      return msg.reply(`🔄 Recurring reminder set! I'll remind you about "${result.task}" ${friendlyFrequency} at ${friendlyTime}.`);
    } catch (error) {
      console.error('Error creating recurring reminder:', error);
      return msg.reply('Sorry, I had trouble setting up that recurring reminder. Could you try again?');
    }
  }

  /**
   * Handle targeted reminders (for teams, channels, or users)
   * @param {Object} reminderManager - The reminder manager instance
   * @param {Message} msg - Discord message
   * @param {Object} result - Parsed reminder result
   * @param {number|null} categoryId - Category ID if applicable
   * @returns {Promise<Message>} - Reply message
   */
  static async handleTargetedReminder(reminderManager, msg, result, categoryId = null) {
    try {
      const { type, target } = result.target;
      
      // Handle different target types
      switch (type) {
        case 'group':
        case 'channel':
          // For channel reminders, we need to handle it differently
          // This would broadcast to everyone in the channel when it's due
          let channelId = msg.channel.id; // Default to current channel
          
          // If a specific channel was mentioned
          if (target !== 'current' && target !== 'everyone') {
            // Find the channel by name if specified
            const channel = msg.guild?.channels.cache.find(c => c.name.toLowerCase() === target.toLowerCase());
            if (channel) {
              channelId = channel.id;
            }
          }
          
          // Create a basic reminder but add a flag for group notification
          const groupReminder = await reminderManager.createReminder(
            msg.author.id,
            msg.author.tag,
            result.task,
            result.time,
            channelId, // Target channel ID
            categoryId,
            result.priority || 0,
            { isGroupReminder: true } // Add metadata
          );
          
          return msg.reply(`📣 Group reminder set! I'll remind ${type === 'channel' ? 'the channel' : 'everyone'} about "${result.task}" when it's time.`);
          
        case 'user':
          // If targeting a specific user, we need to find their user ID
          if (target && target !== 'self') {
            // Try to find user by username
            const mentionedUser = msg.guild?.members.cache.find(member => {
              return member.user.username.toLowerCase() === target.toLowerCase() || 
                     member.displayName.toLowerCase() === target.toLowerCase();
            });
            
            if (mentionedUser) {
              // Create a basic reminder but flag it as targeting another user
              const userReminder = await reminderManager.createReminder(
                msg.author.id, // Creator ID
                msg.author.tag, // Creator tag
                result.task,
                result.time,
                msg.channel.id,
                categoryId,
                result.priority || 0,
                { targetUserId: mentionedUser.id } // Add metadata
              );
              
              return msg.reply(`✉️ Reminder for ${mentionedUser.displayName} set! They'll be notified about "${result.task}" when it's time.`);
            } else {
              return msg.reply(`I couldn't find a user named "${target}". Please check the name and try again.`);
            }
          }
          break;
          
        default:
          // If we couldn't determine the target type, fall back to personal reminder
          const reminder = await reminderManager.createReminder(
            msg.author.id,
            msg.author.tag,
            result.task,
            result.time,
            msg.channel.id,
            categoryId,
            result.priority || 0
          );
          
          return msg.reply('🎊 Reminder created! I'll remind you when it's time.');
      }
    } catch (error) {
      console.error('Error creating targeted reminder:', error);
      return msg.reply('Sorry, I had trouble setting up that reminder. Could you try again?');
    }
  }

  /**
   * Handle incomplete reminder (missing time)
   * @param {Map} conversationStates - The conversation states map
   * @param {Message} msg - Discord message
   * @param {string} task - Task content
   * @returns {Promise<Message>} - Reply message
   */
  static async handleIncompleteReminder(conversationStates, msg, task) {
    const userId = msg.author.id;
    conversationStates.set(userId, { state: 'AWAITING_TIME', task });
    return msg.reply(`Got it! When would you like to be reminded to "${task}"? (e.g., "in 2 hours", "tomorrow at 3pm")`);
  }
}

export default ReminderFunctions;
