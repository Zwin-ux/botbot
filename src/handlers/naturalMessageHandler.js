const { recognizeIntent } = require('../utils/intentRecognizer');
const { createEmbed } = require('../utils/embedUtils');
const { COLORS, EMOJIS } = require('../utils/embedUtils');

// Minimum confidence threshold for automatic actions
const MIN_CONFIDENCE = 0.3;

class NaturalMessageHandler {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.userStates = new Map(); // Track user conversation states
    this.cooldowns = new Map(); // Track command cooldowns
  }

  /**
   * Handle an incoming message with natural language processing
   * @param {Message} message - The Discord message object
   */
  async handleMessage(message) {
    // Ignore messages from bots and empty messages
    if (message.author.bot || !message.content.trim()) return;

    try {
      // Check if user is in a conversation state
      const userId = message.author.id;
      const userState = this.userStates.get(userId) || {};
      
      // Reset state if it's been more than 5 minutes
      if (userState.lastInteraction && (Date.now() - userState.lastInteraction > 5 * 60 * 1000)) {
        this.userStates.delete(userId);
        return;
      }

      // Process the message with intent recognition
      const { intent, confidence, entities, response } = recognizeIntent(message.content);
      
      // Log the intent for analytics
      this.logIntent(message, intent, confidence);

      // Handle the recognized intent
      await this.handleIntent(message, intent, confidence, entities, response, userState);
      
      // Update user state
      userState.lastInteraction = Date.now();
      this.userStates.set(userId, userState);
      
    } catch (error) {
      console.error('Error in natural message handling:', error);
      // Don't spam the channel with errors
      if (Math.random() < 0.1) { // 10% chance to log error to avoid spam
        message.channel.send({
          embeds: [createEmbed({
            title: 'Oops!',
            description: 'I encountered an error processing that. Let me try again!',
            color: COLORS.DANGER,
            emoji: EMOJIS.ERROR
          })]
        });
      }
    }
  }

  /**
   * Handle a recognized intent
   * @private
   */
  async handleIntent(message, intent, confidence, entities, response, userState) {
    // If we're not confident, ask for clarification
    if (confidence < MIN_CONFIDENCE) {
      if (Math.random() < 0.3) { // Only respond to some low-confidence messages to avoid spam
        await this.askForClarification(message);
      }
      return;
    }

    // Handle the specific intent
    switch (intent) {
      case 'start_meeting':
        await this.handleMeetingIntent(message, entities);
        break;
        
      case 'set_reminder':
        userState.awaitingReminderTime = true;
        await message.reply(response);
        break;
        
      case 'blocked':
        await this.handleBlockedIntent(message);
        break;
        
      case 'start_game':
        await this.handleGameIntent(message, entities);
        break;
        
      case 'help':
        await message.reply(response);
        break;
        
      default:
        // No specific handler for this intent
        break;
    }
  }

  /**
   * Handle meeting start intent
   * @private
   */
  async handleMeetingIntent(message, entities) {
    const meetingType = entities.meeting_type || 'meeting';
    const embed = createEmbed({
      title: `Start ${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)}?`,
      description: `React with 📅 to start a ${meetingType}.`,
      color: COLORS.INFO,
      emoji: '📅'
    });
    
    const msg = await message.reply({ embeds: [embed] });
    await msg.react('📅');
    
    // Set up collector for the reaction
    const filter = (reaction, user) => {
      return !user.bot && reaction.emoji.name === '📅';
    };
    
    const collector = msg.createReactionCollector({ filter, time: 60000 });
    
    collector.on('collect', async (reaction, user) => {
      // Create a thread for the meeting
      const thread = await message.channel.threads.create({
        name: `${meetingType} - ${new Date().toLocaleDateString()}`,
        autoArchiveDuration: 60,
        reason: `Started by ${user.tag}`
      });
      
      // Send initial message in thread
      await thread.send({
        content: `🤖 ${user} has started a ${meetingType}!\n\n` +
                `Use this thread for discussion. I'll help keep things organized.`
      });
      
      // Update the original message
      await msg.edit({
        embeds: [createEmbed({
          title: `${meetingType.charAt(0).toUpperCase() + meetingType.slice(1)} Started!`,
          description: `Join the discussion here: ${thread}`,
          color: COLORS.SUCCESS,
          emoji: '✅'
        })]
      });
      
      // Stop collecting reactions
      collector.stop();
    });
    
    collector.on('end', () => {
      if (!msg.deleted) {
        msg.reactions.removeAll().catch(console.error);
      }
    });
  }

  /**
   * Handle blocked/help intent
   * @private
   */
  async handleBlockedIntent(message) {
    const embed = createEmbed({
      title: 'Need Help?',
      description: 'It looks like you might be blocked. Would you like to create a help thread?',
      color: COLORS.WARNING,
      emoji: '🆘'
    });
    
    const msg = await message.reply({ embeds: [embed] });
    await msg.react('✅');
    await msg.react('❌');
    
    const filter = (reaction, user) => {
      return !user.bot && (reaction.emoji.name === '✅' || reaction.emoji.name === '❌');
    };
    
    const collector = msg.createReactionCollector({ filter, time: 60000 });
    
    collector.on('collect', async (reaction, user) => {
      if (reaction.emoji.name === '✅') {
        const thread = await message.channel.threads.create({
          name: `help-${user.username}-${Date.now().toString(36).slice(-4)}`,
          autoArchiveDuration: 1440, // 1 day
          reason: `Help thread for ${user.tag}`
        });
        
        await thread.send({
          content: `🆘 **Help Request**\n` +
                  `${user} needs assistance. Please help if you can!\n\n` +
                  `> ${message.content}`
        });
        
        await msg.edit({
          embeds: [createEmbed({
            title: 'Help Thread Created',
            description: `I've created a help thread for you: ${thread}`,
            color: COLORS.SUCCESS,
            emoji: '✅'
          })]
        });
      } else {
        await msg.edit({
          embeds: [createEmbed({
            title: 'Got it!',
            description: 'Let me know if you need anything else!',
            color: COLORS.INFO,
            emoji: '👍'
          })]
        });
      }
      
      collector.stop();
    });
    
    collector.on('end', () => {
      if (!msg.deleted) {
        msg.reactions.removeAll().catch(console.error);
      }
    });
  }

  /**
   * Handle game start intent
   * @private
   */
  async handleGameIntent(message, entities) {
    const gameType = entities.game_type || 'game';
    const embed = createEmbed({
      title: `Start ${gameType}?`,
      description: `React with 🎮 to start a ${gameType}!`,
      color: COLORS.INFO,
      emoji: '🎮'
    });
    
    const msg = await message.reply({ embeds: [embed] });
    await msg.react('🎮');
    
    const filter = (reaction, user) => {
      return !user.bot && reaction.emoji.name === '🎮';
    };
    
    const collector = msg.createReactionCollector({ filter, time: 60000 });
    
    collector.on('collect', async (reaction, user) => {
      // Start the game based on type
      let gameCommand;
      switch(gameType.toLowerCase()) {
        case 'emoji race':
        case 'emojirace':
          gameCommand = 'start emoji race';
          break;
        case 'story builder':
        case 'story':
          gameCommand = 'start story';
          break;
        case 'who said it':
        case 'quote game':
          gameCommand = 'start who said it';
          break;
        default:
          gameCommand = 'start game';
      }
      
      // Trigger the game command
      message.channel.send(`Starting ${gameType}...`);
      // This would be replaced with your actual game start logic
      // await this.client.emit('messageCreate', { ...message, content: gameCommand });
      
      collector.stop();
    });
    
    collector.on('end', () => {
      if (!msg.deleted) {
        msg.reactions.removeAll().catch(console.error);
      }
    });
  }

  /**
   * Ask for clarification when intent is unclear
   * @private
   */
  async askForClarification(message) {
    // Only ask for clarification sometimes to avoid being annoying
    if (Math.random() > 0.3) return;
    
    const clarifications = [
      "I'm not quite sure what you mean. Could you rephrase that?",
      "I didn't catch that. Could you say it differently?",
      "Hmm, I'm not sure I understand. Can you clarify?",
      "I'm still learning! Could you try saying that another way?",
      "I'm not sure how to help with that. Could you give me more details?"
    ];
    
    const randomClarification = clarifications[Math.floor(Math.random() * clarifications.length)];
    
    await message.reply({
      embeds: [createEmbed({
        title: 'Hmm...',
        description: randomClarification,
        color: COLORS.WARNING,
        emoji: '🤔'
      })]
    });
  }

  /**
   * Log intent for analytics
   * @private
   */
  async logIntent(message, intent, confidence) {
    // In a real implementation, you'd log this to a database
    console.log(`[${new Date().toISOString()}] Intent: ${intent} (${confidence}) - "${message.content}"`);
    
    // Here you could add code to store this in your database:
    /*
    await this.db.collection('intent_logs').insertOne({
      userId: message.author.id,
      username: message.author.tag,
      channelId: message.channel.id,
      channelName: message.channel.name,
      message: message.content,
      intent,
      confidence,
      timestamp: new Date()
    });
    */
  }
}

module.exports = NaturalMessageHandler;
