/**
 * BotBot - Main Entry Point
 * A friendly Discord bot with natural language processing,
 * games, and community engagement features
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, ActivityType } from 'discord.js';
import { logger } from './utils/logger.js';
import config from './config.js';
import { initializeDatabase } from './database/index.js';
import ContextManager from './contextManager.js';
import EnhancedParser from './enhancedParser.js';
import MessageHandler from './handlers/messageHandler.js';
import ReactionHandler from './handlers/reactionHandler.js';
import NaturalMessageHandler from './handlers/naturalMessageHandler.js';
import { COLORS, EMOJIS } from './utils/embedUtils.js';

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught Exception:', error);
  // Attempt to log the error before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle process termination
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

let client;
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
    
    // Add any cleanup tasks here
    
    logger.info('Shutdown complete. Goodbye!');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

async function startBot() {
  logger.info('Starting BotBot...');
  logger.debug(`Environment: ${config.NODE_ENV}`);

  // Initialize the Discord client
  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.GuildMembers
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.Reaction,
      Partials.User,
      Partials.GuildMember
    ]
  });

  try {
    // Initialize database and services
    logger.info('Initializing database...');
    const { 
      db, 
      categoryManager, 
      reactionManager,
      reminderManager,
      gameService
    } = await initializeDatabase();
    
    // Initialize core components
    const contextManager = new ContextManager(db);
    const parser = new EnhancedParser();
    
    // Initialize handlers
    logger.info('Initializing message handlers...');
    const messageHandler = new MessageHandler(
      client, 
      contextManager, 
      parser, 
      reminderManager, 
      categoryManager, 
      reactionManager
    );
    
    const naturalMessageHandler = new NaturalMessageHandler(client, db);
    
    // Log when the bot is ready
    client.once('ready', () => {
      console.log(`Logged in as ${client.user.tag}!`);
      
      // Set bot's status
      client.user.setActivity('your conversations', { type: 'LISTENING' })
        .catch(console.error);
    });
    
    // Handle all messages with natural language processing
    client.on('messageCreate', async (message) => {
      try {
        // First try natural language processing
        await naturalMessageHandler.handleMessage(message);
        
        // Then fall back to command processing
        if (message.content.startsWith(process.env.PREFIX || '!')) {
          await messageHandler.handleMessage(message);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
    
    // Handle reactions for interactive messages
    client.on('messageReactionAdd', async (reaction, user) => {
      try {
        // When a reaction is received, check if the structure is partial
        if (reaction.partial) {
          try {
            await reaction.fetch();
          } catch (error) {
            console.error('Something went wrong when fetching the message:', error);
            return;
          }
        }
        
        // Process the reaction
        await reactionHandler.handleReaction(reaction, user);
      } catch (error) {
        console.error('Error processing reaction:', error);
      }
    });
    
    // Create reaction handler
    const reactionHandler = new ReactionHandler(
      client,
      reactionManager,
      categoryManager,
      reminderManager
    );
    
    // Initialize reaction handler
    reactionHandler.initialize();
    
    // Listen for when the client is ready
    client.once('ready', () => {
      console.log(`Logged in as ${client.user.tag}!`);
      client.user.setActivity('for reminders (no /commands)', { type: 'WATCHING' });
      
      // Start scheduled jobs here if needed
      require('./bot').scheduleReminders();
    });
    
    // Handle incoming messages
    client.on('messageCreate', async (msg) => {
      await messageHandler.handleMessage(msg);
    });
    
    // Log in to Discord
    if (process.env.DISCORD_TOKEN) {
      await client.login(process.env.DISCORD_TOKEN);
    } else {
      console.error('Error: DISCORD_TOKEN not found in .env file.');
      console.log('Please create a .env file in the root directory and add your DISCORD_TOKEN.');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error starting bot:', error);
    process.exit(1);
  }
}

// Start the bot
startBot();
