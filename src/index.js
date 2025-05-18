/**
 * BotBot - Main Entry Point
 * A friendly Discord reminder bot with natural language processing, 
 * categories, and voting features
 */
require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const ContextManager = require('./contextManager');
const EnhancedParser = require('./enhancedParser');
const { initializeDatabase } = require('./database');
const MessageHandler = require('./handlers/messageHandler');
const ReactionHandler = require('./handlers/reactionHandler');

async function startBot() {
  console.log('Starting BotBot...');

  // Initialize the Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessageReactions
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction]
  });

  try {
    // Initialize database and managers
    const { 
      db, 
      categoryManager, 
      reactionManager,
      reminderManager 
    } = await initializeDatabase();
    
    // Initialize handlers
    const contextManager = new ContextManager(db);
    const parser = new EnhancedParser();
    
    // Create message handler
    const messageHandler = new MessageHandler(
      client, 
      contextManager, 
      parser, 
      reminderManager, 
      categoryManager, 
      reactionManager
    );
    
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
