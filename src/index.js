/**
 * BotBot - Main Entry Point
 * A friendly Discord bot with natural language processing,
 * games, and community engagement features
 */

import "dotenv/config";
import { Client, GatewayIntentBits, Partials, ActivityType } from "discord.js";
import { logger } from "./utils/logger.js";
import config from "./config.js";
import { initializeDatabase } from "./database/index.js";
import ContextManager from "./contextManager.js";
import EnhancedParser from "./enhancedParser.js";
import EnhancedParserExtended from "./enhancedParserExtended.js";
import MessageHandler from "./handlers/messageHandler.js";
import ReactionHandler from "./handlers/reactionHandler.js";
import NaturalMessageHandler from "./handlers/naturalMessageHandler.js";
import { COLORS, EMOJIS } from "./utils/embedUtils.js";
import ReminderManager from "./database/reminderManager.js";
import ReminderManagerExtended from "./database/reminderManagerExtended.js";
import GuildNotificationService from "./services/guildNotificationService.js";
import TestHandler from "./handlers/testHandler.js";
import { advancedHandler } from "./handlers/advancedHandler.js";

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught Exception:", error);
  // Attempt to log the error before exiting
  setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Handle process termination
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

let client;
let shutdownInProgress = false;

async function gracefulShutdown(signal) {
  if (shutdownInProgress) return;
  shutdownInProgress = true;

  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    if (client) {
      logger.info("Destroying Discord client...");
      client.destroy();
    }

    // Add any cleanup tasks here

    logger.info("Shutdown complete. Goodbye!");
    process.exit(0);
  } catch (error) {
    logger.error("Error during shutdown:", error);
    process.exit(1);
  }
}

async function startBot() {
  logger.info("Starting BotBot...");
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
      GatewayIntentBits.GuildMembers,
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.Reaction,
      Partials.User,
      Partials.GuildMember,
    ],
  });

  try {
    // Initialize database and services
    logger.info("Initializing database...");
    const { db, categoryManager, reactionManager, guildManager, gameService } =
      await initializeDatabase();

    // Initialize database managers
    const reminderManagerBase = new ReminderManager(db);
    const reminderManagerExtended = new ReminderManagerExtended(db);
    const reminderManager = reminderManagerExtended || reminderManagerBase;

    // Initialize core components
    const contextManager = new ContextManager(db);
    // Use the extended parser for better natural language understanding
    const parserBase = new EnhancedParser();
    const parserExtended = new EnhancedParserExtended();
    const parser = parserExtended || parserBase;

    // Initialize services
    logger.info("Initializing services...");
    const guildNotificationService = new GuildNotificationService(
      client,
      guildManager,
    );

    // Initialize handlers
    logger.info("Initializing message handlers...");
    const messageHandler = new MessageHandler(
      client,
      contextManager,
      parser,
      reminderManager,
      categoryManager,
      reactionManager,
      null, // standupHandler (not initialized yet)
      null, // retroHandler (not initialized yet)
      guildManager, // pass the guild manager
    );

    const naturalMessageHandler = new NaturalMessageHandler(client, db);
    const testHandler = new TestHandler(client, db);

    // Log when the bot is ready
    client.once("ready", () => {
      console.log(`Logged in as ${client.user.tag}!`);

      // Set bot's status
      client.user
        .setActivity("your conversations", { type: "LISTENING" })
        .catch(console.error);
    });

    // Handle all messages with natural language processing
    client.on("messageCreate", async (message) => {
      try {
        // Ignore messages from bots
        if (message.author.bot) return;

        // First check for test commands (hidden developer feature)
        const testHandled = await testHandler.handleMessage(message);
        if (testHandled) return; // If it was a test command, stop processing

        // Then try natural language processing
        const nlpHandled = await naturalMessageHandler.handleMessage(message);
        if (nlpHandled) return; // If NLP handled it, stop processing

        // Finally fall back to command processing
        if (message.content.startsWith(process.env.PREFIX || "!")) {
          await messageHandler.handleMessage(message);
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    // Handle reactions for interactive messages
    client.on("messageReactionAdd", async (reaction, user) => {
      try {
        // When a reaction is received, check if the structure is partial
        if (reaction.partial) {
          try {
            await reaction.fetch();
          } catch (error) {
            console.error(
              "Something went wrong when fetching the message:",
              error,
            );
            return;
          }
        }

        // Process the reaction
        await reactionHandler.handleReaction(reaction, user);
      } catch (error) {
        console.error("Error processing reaction:", error);
      }
    });

    // Handle button interactions and other interactions
    client.on("interactionCreate", async (interaction) => {
      try {
        if (interaction.isButton()) {
          await advancedHandler.handleButtonInteraction(interaction);
        } else if (interaction.isModalSubmit()) {
          // Handle modal submissions if needed
          console.log("Modal submission received:", interaction.customId);
        } else if (interaction.isSelectMenu()) {
          // Handle select menu interactions if needed
          console.log(
            "Select menu interaction received:",
            interaction.customId,
          );
        }
      } catch (error) {
        console.error("Error processing interaction:", error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content:
                "❌ An error occurred while processing your interaction.",
              ephemeral: true,
            })
            .catch(console.error);
        }
      }
    });

    // Create reaction handler
    const reactionHandler = new ReactionHandler(
      client,
      reactionManager,
      categoryManager,
      reminderManager,
    );

    // Initialize reaction handler
    reactionHandler.initialize();

    // Set up event handlers
    logger.info("Setting up event handlers...");
    client.on("ready", () => {
      logger.info(`Bot is ready! Logged in as ${client.user.tag}`);
      client.user.setActivity("Remind me to...", { type: "LISTENING" });

      // Set up interval to process guild reminders every minute
      setInterval(async () => {
        try {
          const processedReminders =
            await guildNotificationService.processDueGuildReminders();
          if (processedReminders.length > 0) {
            logger.info(
              `Processed ${processedReminders.length} guild reminders`,
            );
          }
        } catch (error) {
          logger.error("Error processing guild reminders:", error);
        }
      }, 60000); // check every minute

      // Start scheduled jobs here if needed
      require("./bot").scheduleReminders();
    });

    // Handle incoming messages
    client.on("messageCreate", async (msg) => {
      await messageHandler.handleMessage(msg);
    });

    // Log in to Discord
    if (process.env.DISCORD_TOKEN) {
      await client.login(process.env.DISCORD_TOKEN);
    } else {
      console.error("Error: DISCORD_TOKEN not found in .env file.");
      console.log(
        "Please create a .env file in the root directory and add your DISCORD_TOKEN.",
      );
      process.exit(1);
    }
  } catch (error) {
    console.error("Error starting bot:", error);
    process.exit(1);
  }
}

// Start the bot
startBot();
