/**
 * BotBot - Main Entry Point
 * A friendly Discord bot with natural language processing,
 * games, and community engagement features
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js'; // Removed ActivityType as it's not directly used here
import { logger } from './utils/logger.js';
import config from './config.js';
import { initializeDatabase } from './database/index.js';
import ContextManager from './contextManager.js';
import EnhancedParser from './enhancedParser.js';
import EnhancedParserExtended from './enhancedParserExtended.js';
import MessageHandler from './handlers/messageHandler.js';
import ReactionHandler from './handlers/reactionHandler.js';
import NaturalMessageHandler from './handlers/naturalMessageHandler.js';
// import { COLORS, EMOJIS } from './utils/embedUtils.js'; // Not directly used in this file
import ReminderManager from './database/reminderManager.js';
import ReminderManagerExtended from './database/reminderManagerExtended.js';
import GuildNotificationService from './services/guildNotificationService.js';
import TestHandler from './handlers/testHandler.js';
import ConversationFlowManager from './handlers/ConversationFlowManager.js'; // Added
import IntentService from './services/intentService.js'; // Added

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000); // Exit after attempting to log
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle process termination
let client; // Define client here to be accessible in gracefulShutdown
let shutdownInProgress = false;

async function gracefulShutdown(signal) {
  if (shutdownInProgress) return;
  shutdownInProgress = true;
  
  logger.info(`Received ${signal}, shutting down gracefully...`);
  
  try {
    if (client) {
      logger.info('Destroying Discord client...');
      client.destroy();
    }
    // Add any other cleanup tasks here (e.g., close database connections if necessary)
    logger.info('Shutdown complete. Goodbye!');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function startBot() {
  logger.info('Starting BotBot...');
  logger.debug(`Environment: ${config.NODE_ENV}`);

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.GuildMembers, // Added GuildMembers if not already present
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.Reaction,
      Partials.User,
      Partials.GuildMember, // Added GuildMember if not already present
    ],
  });

  try {
    logger.info('Initializing database...');
    const { 
      db, 
      categoryManager, 
      reactionManager: dbReactionManager, // Renamed to avoid conflict with Handler
      guildManager,
      gameService
    } = await initializeDatabase();
    
    const reminderManagerBase = new ReminderManager(db);
    const reminderManagerExtended = new ReminderManagerExtended(db);
    const reminderManager = reminderManagerExtended || reminderManagerBase;
    
    const contextManager = new ContextManager(db);
    const parserBase = new EnhancedParser();
    const parserExtended = new EnhancedParserExtended();
    const parser = parserExtended || parserBase;
    
    logger.info('Initializing services...');
    const guildNotificationService = new GuildNotificationService(client, guildManager);
    const conversationFlowManager = new ConversationFlowManager(parser, reminderManager, categoryManager); // Instantiated here

    logger.info('Initializing handlers...');
    // StandupHandler and RetroHandler are not initialized in the provided index.js, passing null.
    // These would need to be initialized similarly if they exist and are to be used.
    const standupHandler = null; // Placeholder
    const retroHandler = null;   // Placeholder

    const messageHandler = new MessageHandler(
      client, 
      contextManager, 
      parser, 
      reminderManager, 
      categoryManager, 
      dbReactionManager, // Pass the reactionManager from DB init
      standupHandler,
      retroHandler,
      guildManager,
      conversationFlowManager // Injected
    );
    
    const intentService = new IntentService( // Instantiated here
      {
        messageHandler,
        reminderManager,
        categoryManager,
        conversationFlowManager,
        gameHandler: gameService, // Assuming gameService is the gameHandler
        standupHandler, // Pass initialized standupHandler if available
        retroHandler    // Pass initialized retroHandler if available
      },
      client
    );

    const naturalMessageHandler = new NaturalMessageHandler(client, db, intentService); // Injected intentService
    const testHandler = new TestHandler(client, db);
    
    // Reaction Handler (instantiated once, correctly)
    const reactionHandler = new ReactionHandler(
      client,
      dbReactionManager, // Use the one from DB
      categoryManager,
      reminderManager
    );
    reactionHandler.initialize(); // Initialize it

    // Event Handlers
    logger.info('Setting up event handlers...');
    client.on('ready', () => {
      logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
      client.user.setActivity('your conversations', { type: 'LISTENING' }); // Consolidated from duplicate
      
      // Interval for guild reminders (consolidated)
      setInterval(async () => {
        try {
          const processedReminders = await guildNotificationService.processDueGuildReminders();
          if (processedReminders.length > 0) {
            logger.info(`Processed ${processedReminders.length} guild reminders`);
          }
        } catch (error) {
          logger.error('Error processing guild reminders:', error);
        }
      }, 60000);

      // TODO: review the 'require('./bot').scheduleReminders();' line.
      // If './bot.js' contains another client login or duplicate reminder scheduling, it needs to be refactored.
      // For now, assuming it contains other specific scheduled tasks.
      // If it's the old reminder logic, it might conflict with GuildNotificationService.
      // require('./bot').scheduleReminders(); // Commenting out if it's legacy/conflicting
    });
    
    client.on('messageCreate', async (message) => { // Single messageCreate handler
      try {
        if (message.author.bot) return;
        
        const testHandled = await testHandler.handleMessage(message);
        if (testHandled) return;
        
        const nlpHandled = await naturalMessageHandler.handleMessage(message);
        if (nlpHandled) return;
        
        // Fallback to prefix-based command processing
        // Ensure PREFIX is defined in your .env or config, defaulting to '!'
        const prefix = config.DEFAULT_PREFIX || '!';
        if (message.content.startsWith(prefix)) {
          // Clone the message object or modify a copy if MessageHandler alters it.
          // For now, assume MessageHandler handles it correctly.
          await messageHandler.handleMessage(message);
        }
      } catch (error) {
        logger.error('Error processing message:', error, { messageContent: message.content, guildId: message.guild?.id, userId: message.author.id });
      }
    });
    
    client.on('messageReactionAdd', async (reaction, user) => {
      try {
        if (reaction.partial) {
          await reaction.fetch();
        }
        if (user.partial) { // Also fetch partial user
          await user.fetch();
        }
        if (user.bot) return; // Ignore bot reactions

        await reactionHandler.handleReaction(reaction, user);
      } catch (error)
      {
        logger.error('Error processing reaction:', error);
      }
    });
    
    logger.info('Logging in to Discord...');
    if (!config.DISCORD_TOKEN) {
      logger.error('Error: DISCORD_TOKEN not found in environment variables or config.');
      process.exit(1);
    }
    await client.login(config.DISCORD_TOKEN);

  } catch (error) {
    logger.fatal('Error starting bot:', error);
    process.exit(1);
  }
}

startBot();
