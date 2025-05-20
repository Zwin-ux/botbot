// Main bot file
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const cron = require('node-cron');
const { 
  format, addDays, addHours, addMinutes, addWeeks,
  setHours, setMinutes, setSeconds,
  getTime, isFuture, startOfTomorrow, endOfDay, isValid
} = require('date-fns');

// Core components
const ContextManager = require('./contextManager');
const EnhancedParser = require('./enhancedParser');

// Database managers
const ReminderManager = require('./database/reminderManager');
const CategoryManager = require('./database/categoryManager');
const ReactionManager = require('./database/reactionManager');

// Feature managers
const StandupManager = require('./features/standupManager');
const RetroManager = require('./features/retroManager');

// Message handlers
const MessageHandler = require('./handlers/messageHandler');
const ReactionHandler = require('./handlers/reactionHandler');
const CategoryHandler = require('./handlers/categoryHandler');
const StandupHandler = require('./handlers/standupHandler');
const RetroHandler = require('./handlers/retroHandler');
const TestHandler = require('./handlers/testHandler');
const NaturalMessageHandler = require('./handlers/naturalMessageHandler');

const AgentChannel = require('./features/agent/agentChannel');
const agentChannel = new AgentChannel(client, db);
const Onboarding = require('./features/onboarding');
const onboarding = new Onboarding(client, agentChannel);

console.log('Bot is starting...');

// Discord Client Initialization
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required to read message content
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessageReactions, // For emoji interactions later
    GatewayIntentBits.DirectMessageReactions // For emoji interactions later
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction] // Required for DMs and uncached reactions
});

// SQLite Database Initialization
const db = new sqlite3.Database('./reminders.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    // Setup database tables
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        userTag TEXT NOT NULL,
        content TEXT NOT NULL,
        dueTime INTEGER, /* Store as Unix timestamp (seconds) for easy comparison */
        isRecurring BOOLEAN DEFAULT 0,
        recurrencePattern TEXT,
        channelId TEXT NOT NULL,
        messageId TEXT,
        status TEXT DEFAULT 'pending', /* pending, done, snoozed, deleted */
        createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int))
      )`);
      
      db.run(`CREATE TABLE IF NOT EXISTS motivational_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        category TEXT DEFAULT 'general'
      )`);

      // Add some default motivational messages if none exist
      db.get('SELECT COUNT(*) as count FROM motivational_messages', (err, row) => {
        if (err) return console.error('Error checking motivational messages:', err);
        if (row.count === 0) {
          const defaultMessages = [
            { message: "You got this! 💪", category: "general" },
            { message: "One step at a time, you're making progress! 🚀", category: "general" },
            { message: "Stay focused, stay determined! 🔥", category: "productivity" },
            { message: "Remember why you started! 💭", category: "motivation" },
            { message: "Every small task completed is a victory! 🏆", category: "achievement" }
          ];
          
          const stmt = db.prepare('INSERT INTO motivational_messages (message, category) VALUES (?, ?)');
          defaultMessages.forEach(msg => {
            stmt.run(msg.message, msg.category);
          });
          stmt.finalize();
          console.log('Added default motivational messages to database.');
        }
      });
      
      // Add category table for reminder categorization
      db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        emoji TEXT,
        description TEXT,
        createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        UNIQUE(name)
      )`);
      
      // Add user category subscriptions table
      db.run(`CREATE TABLE IF NOT EXISTS category_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        categoryId INTEGER NOT NULL,
        subscribedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        UNIQUE(userId, categoryId),
        FOREIGN KEY(categoryId) REFERENCES categories(id)
      )`);
      
      // Add reaction tracking table
      db.run(`CREATE TABLE IF NOT EXISTS reminder_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reminderId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        emoji TEXT NOT NULL,
        value INTEGER NOT NULL,
        createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        UNIQUE(reminderId, userId, emoji),
        FOREIGN KEY(reminderId) REFERENCES reminders(id)
      )`);
      
      // Add priority column to reminders if it doesn't exist
      db.run(`ALTER TABLE reminders ADD COLUMN priority INTEGER DEFAULT 0`, (err) => {
        // Ignore error - column likely already exists
      });
      
      // Add categoryId column to reminders if it doesn't exist
      db.run(`ALTER TABLE reminders ADD COLUMN categoryId INTEGER`, (err) => {
        // Ignore error - column likely already exists
      });
    });
  }
});

// Initialize context manager and parser
const contextManager = new ContextManager(db);
const parser = new EnhancedParser();

// Initialize database managers
const reminderManager = new ReminderManager(db);
const categoryManager = new CategoryManager(db);
const reactionManager = new ReactionManager(db);

// Initialize feature managers
const standupManager = new StandupManager(client, db);
const retroManager = new RetroManager(client, db);

// Initialize feature handlers
const standupHandler = new StandupHandler(client, standupManager);
const retroHandler = new RetroHandler(client, retroManager);
const gameHandler = new (require('./handlers/gameHandler'))(client, db);

// Initialize message handlers
const messageHandler = new MessageHandler(client, contextManager, parser, reminderManager, categoryManager, reactionManager, standupHandler, retroHandler);
const reactionHandler = new ReactionHandler(client, reminderManager, reactionManager, categoryManager);
const categoryHandler = new CategoryHandler(client, categoryManager);
const testHandler = new TestHandler(client, db);

// Setup interaction handlers for buttons and modals
client.on('interactionCreate', async (interaction) => {
  // Handle button interactions
  if (interaction.isButton()) {
    // Reminder buttons (done, snooze, delete) have format: action_reminderId
    if (interaction.customId.startsWith('done_') || 
        interaction.customId.startsWith('snooze_') || 
        interaction.customId.startsWith('delete_')) {
      const [action, reminderId] = interaction.customId.split('_');
      
      try {
        if (action === 'done') {
  // Fetch the reminder to check ownership
  const reminder = await reminderManager.getReminderById(reminderId);
  if (!reminder) {
    await interaction.reply({ content: 'Sorry, I couldn\'t find that reminder.', ephemeral: true });
    return;
  }
  await markReminderDone(reminderId, interaction.user.id);
  await interaction.reply({ content: '✅ Reminder marked as done!', ephemeral: true });
  // Try to delete the original message with the buttons
  try {
    await interaction.message.delete();
  } catch (e) {
    // Ignore errors if we can't delete the message
  }
  // If the user is NOT the owner, offer to copy
  if (reminder.userId !== interaction.user.id) {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(`copyreminder_${reminderId}`)
          .setLabel('Copy Reminder')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`nocopy_${reminderId}`)
          .setLabel('No thanks')
          .setStyle(ButtonStyle.Secondary)
      );
    await interaction.followUp({
      content: `You just checked off <@${reminder.userId}>'s reminder. Want to challenge yourself and do the same?`,
      components: [row],
      ephemeral: true
    });
  }
} else if (action === 'snooze') {
          // Show a selection of snooze options
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`snooze_time_${reminderId}_30`)
                .setLabel('30 minutes')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId(`snooze_time_${reminderId}_60`)
                .setLabel('1 hour')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId(`snooze_time_${reminderId}_360`)
                .setLabel('6 hours')
                .setStyle(ButtonStyle.Primary),
              new ButtonBuilder()
                .setCustomId(`snooze_time_${reminderId}_1440`)
                .setLabel('1 day')
                .setStyle(ButtonStyle.Primary)
            );
          
          await interaction.reply({ content: 'For how long would you like to snooze this reminder?', components: [row], ephemeral: true });
        } else if (action === 'delete') {
          await deleteReminder(reminderId, interaction.user.id);
          await interaction.reply({ content: '🗑️ Reminder deleted.', ephemeral: true });
          // Try to delete the original message with the buttons
          try {
            await interaction.message.delete();
          } catch (e) {
            // Ignore errors if we can't delete the message
          }
        }
      } catch (error) {
        console.error('Error handling reminder interaction:', error);
        await interaction.reply({ content: 'Sorry, there was an error processing your request.', ephemeral: true });
      }
      return;
    }
    
    // Handle copy reminder button
    if (interaction.customId.startsWith('copyreminder_')) {
      const reminderId = interaction.customId.split('_')[1];
      const reminder = await reminderManager.getReminderById(reminderId);
      if (!reminder) {
        await interaction.reply({ content: 'Sorry, I couldn\'t find that reminder to copy.', ephemeral: true });
        return;
      }
      // Create a new reminder for the current user with the same content and time
      await reminderManager.createReminder(
        interaction.user.id,
        interaction.user.tag,
        reminder.content,
        reminder.dueTime ? new Date(reminder.dueTime * 1000) : null,
        reminder.channelId,
        reminder.categoryId
      );
      await interaction.reply({ content: '✅ Copied! I\'ve set the same reminder for you.', ephemeral: true });
      return;
    }

    // Handle "No thanks" button
    if (interaction.customId.startsWith('nocopy_')) {
      await interaction.reply({ content: 'No problem! If you ever want to copy a reminder, just let me know. 😊', ephemeral: true });
      return;
    }

    // Snooze time selection buttons have format: snooze_time_reminderId_minutes
    if (interaction.customId.startsWith('snooze_time_')) {
      const parts = interaction.customId.split('_');
      const reminderId = parts[2];
      const minutes = parseInt(parts[3]);
      
      try {
        await snoozeReminder(reminderId, interaction.user.id, minutes);
        await interaction.update({ content: `⏰ Reminder snoozed for ${minutes} minutes.`, components: [] });
      } catch (error) {
        console.error('Error handling snooze interaction:', error);
        await interaction.reply({ content: 'Sorry, there was an error processing your snooze request.', ephemeral: true });
      }
      return;
    }
    
    // Handle standup interactions
    if (interaction.customId.startsWith('standup_')) {
      try {
        await standupManager.handleStandupInteraction(interaction);
      } catch (error) {
        console.error('Error handling standup interaction:', error);
        await interaction.reply({ content: 'Sorry, there was an error processing your standup request.', ephemeral: true });
      }
      return;
    }
    
    // Handle retro interactions
    if (interaction.customId.startsWith('retro_')) {
      try {
        await retroManager.handleRetroInteraction(interaction);
      } catch (error) {
        console.error('Error handling retrospective interaction:', error);
        await interaction.reply({ content: 'Sorry, there was an error processing your retrospective request.', ephemeral: true });
      }
      return;
    }
  }
  
  // Handle modal submissions
  if (interaction.isModalSubmit()) {
    // Handle standup modal submissions
    if (interaction.customId.startsWith('standup_modal_')) {
      try {
        await standupManager.handleStandupModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling standup modal submission:', error);
        await interaction.reply({ content: 'Sorry, there was an error processing your standup response.', ephemeral: true });
      }
      return;
    }
    
    // Handle retro modal submissions
    if (interaction.customId.startsWith('retro_modal_')) {
      try {
        await retroManager.handleRetroModalSubmit(interaction);
      } catch (error) {
        console.error('Error handling retrospective modal submission:', error);
        await interaction.reply({ content: 'Sorry, there was an error processing your retrospective feedback.', ephemeral: true });
      }
      return;
    }
  }
});

// Helper functions for reminder management
async function createReminder(userId, userTag, content, dueTime, channelId) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO reminders 
       (userId, userTag, content, dueTime, channelId, createdAt)
       VALUES (?, ?, ?, ?, ?, cast(strftime('%s', 'now') as int))`,
      [userId, userTag, content, dueTime ? Math.floor(dueTime.getTime() / 1000) : null, channelId],
      function(err) {
        if (err) return reject(err);
        resolve({
          id: this.lastID,
          userId,
          userTag,
          content,
          dueTime: dueTime ? Math.floor(dueTime.getTime() / 1000) : null,
          channelId
        });
      }
    );
  });
}

// Helper function to get user's reminders
async function getUserReminders(userId, status = 'pending', filter = 'all') {
  return new Promise((resolve, reject) => {
    let query = 'SELECT * FROM reminders WHERE userId = ? AND status = ?';
    const params = [userId, status];
    
    if (filter === 'today') {
      const today = new Date();
      const startOfDay = Math.floor(new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000);
      const endOfDay = Math.floor(new Date(today.setHours(23, 59, 59, 999)).getTime() / 1000);
      query += ' AND (dueTime IS NULL OR (dueTime >= ? AND dueTime <= ?))';
      params.push(startOfDay, endOfDay);
    } else if (filter === 'overdue') {
      const now = Math.floor(Date.now() / 1000);
      query += ' AND dueTime < ?';
      params.push(now);
    }
    
    query += ' ORDER BY dueTime ASC';
    
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Helper function to mark a reminder as done
async function markReminderDone(reminderId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE reminders SET status = ? WHERE id = ? AND userId = ?',
      ['done', reminderId, userId],
      function(err) {
        if (err) return reject(err);
        if (this.changes === 0) return reject(new Error('Reminder not found or not owned by user'));
        resolve(true);
      }
    );
  });
}

// Helper function to snooze a reminder
async function snoozeReminder(reminderId, userId, snoozeMinutes = 30) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM reminders WHERE id = ? AND userId = ? AND status = ?',
      [reminderId, userId, 'pending'],
      (err, reminder) => {
        if (err) return reject(err);
        if (!reminder) return reject(new Error('Reminder not found or not owned by user'));
        
        let newDueTime;
        if (reminder.dueTime) {
          // If reminder had a due time, add snooze time to it
          newDueTime = reminder.dueTime + (snoozeMinutes * 60);
        } else {
          // If reminder had no due time, set it to now + snooze time
          newDueTime = Math.floor(Date.now() / 1000) + (snoozeMinutes * 60);
        }
        
        db.run(
          'UPDATE reminders SET dueTime = ? WHERE id = ?',
          [newDueTime, reminderId],
          function(err) {
            if (err) return reject(err);
            resolve({
              id: reminderId,
              newDueTime
            });
          }
        );
      }
    );
  });
}

// Helper function to delete a reminder
async function deleteReminder(reminderId, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM reminders WHERE id = ? AND userId = ?',
      [reminderId, userId],
      function(err) {
        if (err) return reject(err);
        if (this.changes === 0) return reject(new Error('Reminder not found or not owned by user'));
        resolve(true);
      }
    );
  });
}

// Helper function to get a random motivational message
async function getMotivationalMessage(category = null) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT message FROM motivational_messages';
    const params = [];
    
    if (category) {
      query += ' WHERE category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY RANDOM() LIMIT 1';
    
    db.get(query, params, (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.message : null);
    });
  });
}

// Create interactive reminder message
function createReminderEmbed(reminder) {
  const embed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Reminder Set!')
    .addFields(
      { name: 'Task', value: reminder.content, inline: true }
    );

  if (reminder.dueTime) {
    const dueDate = new Date(reminder.dueTime * 1000);
    embed.addFields(
      { name: 'Due', value: format(dueDate, 'PPPPpppp'), inline: true }
    );
  } else {
    embed.addFields({ name: 'Due', value: 'No specific time', inline: true });
  }

  embed.setFooter({ text: `ID: ${reminder.id}` })
       .setTimestamp();

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`done_${reminder.id}`)
        .setLabel('Done ✅')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`snooze_${reminder.id}`)
        .setLabel('Snooze ⏰')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`delete_${reminder.id}`)
        .setLabel('Delete 🗑️')
        .setStyle(ButtonStyle.Danger)
    );

  return { embeds: [embed], components: [row] };
}

// Handle conversation states
const conversationStates = new Map();

async function handleIncompleteReminder(msg, task) {
  const userId = msg.author.id;
  conversationStates.set(userId, { state: 'AWAITING_TIME', task });
  await msg.reply(`Got it! When would you like to be reminded to "${task}"? (e.g., "in 2 hours", "tomorrow at 3pm")`);
}

async function handleTimeResponse(msg, timeText) {
  const userId = msg.author.id;
  const state = conversationStates.get(userId);
  if (!state || state.state !== 'AWAITING_TIME') return false;

  const dueTime = parser.parseTime(timeText);
  if (!dueTime) {
    await msg.reply("I couldn't understand that time. Could you try again? (e.g., 'in 2 hours', 'tomorrow at 3pm')");
    return true;
  }

  const reminder = await createReminder(
    msg.author.id,
    msg.author.tag,
    state.task,
    dueTime,
    msg.channel.id
  );

  conversationStates.delete(userId);
  await msg.reply(createReminderEmbed(reminder));
  return true;
}

// Show reminders summary
async function showRemindersSummary(msg, userId, filter = 'all') {
  try {
    const reminders = await getUserReminders(userId, 'pending', filter);
    
    if (reminders.length === 0) {
      const noRemindersMsg = filter === 'today' 
        ? "You don't have any reminders for today! 🎉" 
        : filter === 'overdue'
          ? "No overdue reminders! You're all caught up! 🎉"
          : "You don't have any active reminders!";
      return msg.reply(noRemindersMsg);
    }

    let message = `📋 **Your ${filter === 'today' ? 'today\'s' : filter === 'overdue' ? 'overdue' : ''} reminders:**\n\n`;
    
    reminders.forEach((reminder, index) => {
      const dueText = reminder.dueTime 
        ? `⏰ ${format(new Date(reminder.dueTime * 1000), 'MMM d, yyyy h:mm a')}`
        : 'No specific time';
      message += `**${index + 1}.** ${reminder.content} (ID: ${reminder.id})\n${dueText}\n\n`;
    });

    if (filter === 'all') {
      const now = Math.floor(Date.now() / 1000);
      const today = reminders.filter(r => r.dueTime && r.dueTime >= now - (now % 86400) && r.dueTime < now - (now % 86400) + 86400).length;
      const overdue = reminders.filter(r => r.dueTime && r.dueTime < now).length;
      
      if (today > 0 || overdue > 0) {
        message += '\nQuick filters: ';
        const filters = [];
        if (today > 0) filters.push(`[Today (${today})]`);
        if (overdue > 0) filters.push(`[Overdue (${overdue})]`);
        message += filters.join(' • ');
      }
    }

    return msg.reply(message);
  } catch (error) {
    console.error('Error showing reminders summary:', error);
    return msg.reply("Sorry, I couldn't retrieve your reminders. Please try again later.");
  }
}

client.on('ready', async () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity('for reminders (no /commands)', { type: 'WATCHING' });
  
  // Ensure agent channel exists for all guilds
  for (const [id, guild] of client.guilds.cache) {
    await agentChannel.ensureAgentChannel(guild);
  }
  // Schedule daily and weekly reminders
  scheduleReminders();
});

client.on('guildCreate', async (guild) => {
  await agentChannel.ensureAgentChannel(guild);
  await onboarding.start(guild);
});

const InputManager = require('./input/InputManager');
const OutputManager = require('./output/OutputManager');

client.on('messageCreate', async msg => {
  // Unified, language-aware input/output pipeline
  if (msg.author.bot) return;
  try {
    const input = await InputManager.handleInput({ text: msg.content, user: msg.author, channel: msg.channel });
    // Example: respond with detected intent and language
    let reply = `Detected intent: ${input.intent.intent}\nLanguage: ${input.language}`;
    if (input.intent.response) reply += `\n${input.intent.response}`;
    await OutputManager.sendResponse({ text: reply, language: input.language, user: msg.author, channel: msg.channel, discordClient: client });
  } catch (e) {
    console.error('Input/Output pipeline error:', e);
  }
  // Contextual help: intercept help-like phrases anywhere
  const helpTriggers = ['help', 'what can i do here', 'show me examples'];
  if (helpTriggers.some(t => msg.content.toLowerCase().includes(t))) {
    const { getContextualHelp } = require('./features/contextualHelp');
    const isAgentChannel = msg.guild && agentChannel.agentChannels.has(msg.guild.id) && msg.channel.id === agentChannel.agentChannels.get(msg.guild.id);
    const isDM = msg.channel.type === 1 || msg.channel.type === 'DM';
    const isOwner = msg.guild && msg.author.id === msg.guild.ownerId;
    // For agent admin check, fallback to false if not available
    let isAdmin = false;
    if (msg.guild && msg.author.id !== msg.guild.ownerId && agentChannel.agentManager) {
      try {
        isAdmin = await agentChannel.agentManager.isUserAdmin(msg.guild.id, msg.author.id);
      } catch {}
    }
    const embed = getContextualHelp({
      channelType: msg.channel.type,
      isAgentChannel,
      isDM,
      isOwner,
      isAdmin
    });
    await msg.reply({ embeds: [embed] });
    return;
  }

  // Agent channel onboarding trigger (first message in agent channel)
  if (msg.guild && agentChannel.agentChannels.has(msg.guild.id)) {
    const agentChannelId = agentChannel.agentChannels.get(msg.guild.id);
    if (msg.channel.id === agentChannelId) {
      await onboarding.start(msg.guild);
    }
  }
  // Agent channel interception
  if (msg.guild && await agentChannel.handleMessage(msg)) return;
  if (msg.author.bot) return;
  // Allow bot to work in DMs or specified channels
  if (msg.channel.type === Partials.Channel && !client.guilds.cache.get(msg.guildId)?.channels.cache.get(msg.channelId) && msg.channel.type !== 'DM') {
      // If it's a partial channel and not a known guild channel, and not a DM, ignore (e.g. thread without bot perms)
      return;
  }
  
  const userId = msg.author.id;
  const content = msg.content.trim();
  
  try {
    // Handle test commands first (hidden developer feature)
    const testCommandHandled = await testHandler.handleMessage(msg);
    if (testCommandHandled) return;
    
    // Handle game commands next
    const gameCommandHandled = await gameHandler.handleMessage(msg);
    if (gameCommandHandled) return;
    
    // Then check conversation state
    const state = conversationStates.get(userId);
    
    // If we're waiting for a time, try to handle that first
    if (state?.state === 'AWAITING_TIME') {
      const handled = await handleTimeResponse(msg, content);
      if (handled) return;
    }
    
    // Special ping response
    if (content.toLowerCase() === 'ping bot') {
      return msg.reply('Pong! I\'m here and ready to help with your reminders.');
    }
    
    // Help command
    if (content.toLowerCase() === 'help' || content.toLowerCase() === 'what can you do?') {
      const helpEmbed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('How I Can Help You')
        .setDescription('I\'m your reminder buddy! No slash commands needed - just chat with me naturally.')
        .addFields(
          { name: 'Set a reminder', value: '`remind me to [task] [time]`\nExample: `remind me to call John tomorrow at 3pm`' },
          { name: 'Quick todo', value: '`todo [task]`\nExample: `todo buy milk`' },
          { name: 'View reminders', value: '`show my reminders` or `what\'s on my list?`' },
          { name: 'Mark as done', value: 'Use the buttons on reminders or `done [id]`\nExample: `done 1`' },
          { name: 'Snooze reminder', value: 'Use the snooze button on reminders' },
          { name: 'Delete reminder', value: 'Use the delete button on reminders or `delete [id]`\nExample: `delete 2`' }
        )
        .setFooter({ text: 'I understand natural language, so feel free to ask naturally!' });
      
      return msg.reply({ embeds: [helpEmbed] });
    }
    
    // Show reminders commands
    if (content.toLowerCase().match(/(?:show|list|what.?s|my)\s+(?:reminders?|todos?|tasks?|list)/i)) {
      const filterMatch = content.toLowerCase().match(/(?:today|overdue)/i);
      const filter = filterMatch ? filterMatch[0].toLowerCase() : 'all';
      return showRemindersSummary(msg, userId, filter);
    }
    
    // Mark reminder as done
    const doneMatch = content.match(/(?:done|complete|finish|completed|finished)\s+(\d+)/i);
    if (doneMatch) {
      const reminderId = doneMatch[1];
      try {
        await markReminderDone(reminderId, userId);
        // Confetti/celebratory feedback for first-time reminder completion
        return msg.reply('🎉 Reminder marked as done! Nice work!');
      } catch (error) {
        // Friendly suggestion for reminders
        const { getSetupSuggestion } = require('./features/setupSuggest');
        const { embed, row } = getSetupSuggestion('reminder');
        return msg.reply({ content: 'I couldn’t find that reminder. Want to create a new one?', embeds: [embed], components: [row] });
      }
    }
    
    // Delete reminder
    const deleteMatch = content.match(/(?:delete|remove|cancel)\s+(\d+)/i);
    if (deleteMatch) {
      const reminderId = deleteMatch[1];
      try {
        await deleteReminder(reminderId, userId);
        return msg.reply(`🗑️ Reminder #${reminderId} has been deleted.`);
      } catch (error) {
        // Friendly suggestion for reminders
        const { getSetupSuggestion } = require('./features/setupSuggest');
        const { embed, row } = getSetupSuggestion('reminder');
        return msg.reply({ content: 'I couldn’t find that reminder. Want to create a new one?', embeds: [embed], components: [row] });
      }
    }
    
    // Handle reminder creation with enhanced parser
    if (content.toLowerCase().match(/(remind|todo|reminder|task|remember)/i)) {
      const result = parser.parseReminder(content);
      
      if (!result.task) {
        return msg.reply("I'm not sure what you want to be reminded about. Could you try again with something like 'remind me to call John tomorrow'?");
      }
      
      if (!result.time) {
        return handleIncompleteReminder(msg, result.task);
      }
      
      // We have both task and time, create the reminder
      const reminder = await createReminder(
        msg.author.id,
        msg.author.tag,
        result.task,
        result.time,
        msg.channel.id
      );
      
      // Confetti/celebratory feedback for first reminder creation
      return msg.reply('🎊 Reminder created! I’ll remind you when it’s time.');
    }
  } catch (error) {
    console.error('Error processing message:', error);
    msg.reply('Sorry, I ran into a problem processing your message. Please try again.').catch(console.error);
  }

});

// Handle button interactions
client.on('interactionCreate', async (interaction) => {
  // Onboarding button handling
  if (interaction.isButton() && interaction.customId.startsWith('onboard_')) {
    await onboarding.handleInteraction(interaction);
    return;
  }

  // Setup suggestion buttons for retro/standup
  if (interaction.isButton() && interaction.customId === 'suggest_setup_retro') {
    await interaction.reply({ content: 'Let’s get your first retrospective scheduled! Use `!retro setup weekly #channel friday 15:00` or type `!retro help` for more options.', ephemeral: true });
    return;
  }
  if (interaction.isButton() && interaction.customId === 'suggest_setup_standup') {
    await interaction.reply({ content: 'Let’s set up your daily standup! Use `!standup setup #channel 09:30 America/Los_Angeles` or type `!standup help` for more options.', ephemeral: true });
    return;
  }
  if (!interaction.isButton()) return;
  
  const [action, actionDetail, reminderId] = interaction.customId.split('_');
  
  try {
    if (action === 'done') {
      await markReminderDone(reminderId, interaction.user.id);
      await interaction.update({ content: '✅ Marked as done!', components: [], embeds: [] });
    } else if (action === 'snooze') {
      // Show snooze options
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`snooze_30_${reminderId}`)
            .setLabel('30 minutes')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`snooze_60_${reminderId}`)
            .setLabel('1 hour')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`snooze_1440_${reminderId}`)
            .setLabel('Tomorrow')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.update({ content: 'How long would you like to snooze this reminder?', components: [row] });
    } else if (action === 'snooze' && actionDetail) {
      const snoozeMinutes = parseInt(actionDetail);
      if (isNaN(snoozeMinutes)) {
        return await interaction.update({ content: 'Invalid snooze time', components: [] });
      }
      
      try {
        const result = await snoozeReminder(reminderId, interaction.user.id, snoozeMinutes);
        const newTime = new Date(result.newDueTime * 1000);
        await interaction.update({ 
          content: `⏰ Reminder snoozed until ${format(newTime, 'EEEE, MMMM d, yyyy \'at\' h:mm a')}`, 
          components: [], 
          embeds: [] 
        });
      } catch (error) {
        await interaction.update({ 
          content: 'Sorry, I could not snooze that reminder. It may have been deleted or already completed.', 
          components: [], 
          embeds: [] 
        });
      }
    } else if (action === 'delete') {
      try {
        await deleteReminder(reminderId, interaction.user.id);
        await interaction.update({ content: '🗑️ Reminder deleted!', components: [], embeds: [] });
      } catch (error) {
        await interaction.update({ 
          content: 'Sorry, I could not delete that reminder. It may have been already deleted or it\'s not yours.', 
          components: [], 
          embeds: [] 
        });
      }
    }
  } catch (error) {
    console.error('Error handling button interaction:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: 'There was an error processing your request.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'There was an error processing your request.', ephemeral: true });
      }
    } catch (e) {
      console.error('Error sending error message:', e);
    }
  }
});

// Setup scheduled reminders with node-cron
function scheduleReminders() {
  // Check for due reminders every minute
  setInterval(() => {
    const now = Math.floor(Date.now() / 1000);
    const query = `
      SELECT * FROM reminders 
      WHERE status = 'pending' 
      AND dueTime IS NOT NULL 
      AND dueTime <= ? 
      AND dueTime > ? - 60`; // Check for items due in the last minute

    db.all(query, [now, now], (err, reminders) => {
      if (err) {
        console.error('Error checking for due reminders:', err);
        return;
      }

      reminders.forEach(async (reminder) => {
        try {
          const channel = await client.channels.fetch(reminder.channelId).catch(console.error);
          if (!channel) return;

          const user = await client.users.fetch(reminder.userId).catch(console.error);
          const mention = user ? `<@${user.id}>` : 'Hey there';
          
          // Get a random motivational message
          const motivation = await getMotivationalMessage().catch(() => null);
          const motivationText = motivation ? `\n\n💡 ${motivation}` : '';
          
          // Send the reminder
          const reminderEmbed = new EmbedBuilder()
            .setColor('#ff9900')
            .setTitle('⏰ Reminder!')
            .setDescription(reminder.content)
            .setFooter({ text: `ID: ${reminder.id}` })
            .setTimestamp();
            
          const row = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`done_${reminder.id}`)
                .setLabel('Done ✅')
                .setStyle(ButtonStyle.Success),
              new ButtonBuilder()
                .setCustomId(`snooze_${reminder.id}`)
                .setLabel('Snooze ⏰')
                .setStyle(ButtonStyle.Primary)
            );
          
          await channel.send({ 
            content: `${mention}${motivationText}`,
            embeds: [reminderEmbed],
            components: [row]
          });
          
          // Mark as done
          db.run('UPDATE reminders SET status = ? WHERE id = ?', ['done', reminder.id]);
        } catch (error) {
          console.error('Error processing due reminder:', error);
        }
      });
    });
  }, 60000); // Check every minute
  
  // Daily summary at 9 AM
  cron.schedule('0 9 * * *', async () => {
    console.log('Running daily reminder summary...');
    
    // Get all users with pending reminders
    db.all(
      'SELECT DISTINCT userId FROM reminders WHERE status = ? AND dueTime IS NOT NULL AND dueTime > ?',
      ['pending', Math.floor(Date.now() / 1000)],
      async (err, users) => {
        if (err) return console.error('Error fetching users for daily summary:', err);
        
        for (const user of users) {
          try {
            const today = new Date();
            const startOfDay = Math.floor(new Date(today.setHours(0, 0, 0, 0)).getTime() / 1000);
            const endOfDay = Math.floor(new Date(today.setHours(23, 59, 59, 999)).getTime() / 1000);
            
            // Get today's reminders
            db.all(
              'SELECT * FROM reminders WHERE userId = ? AND status = ? AND dueTime >= ? AND dueTime <= ?',
              [user.userId, 'pending', startOfDay, endOfDay],
              async (err, reminders) => {
                if (err || reminders.length === 0) return;
                
                try {
                  const discordUser = await client.users.fetch(user.userId);
                  if (!discordUser) return;
                  
                  let message = `🌅 **Good morning! Here are your reminders for today:**\n\n`;
                  
                  reminders.forEach((reminder, index) => {
                    const dueTime = new Date(reminder.dueTime * 1000);
                    message += `**${index + 1}.** ${reminder.content}\n⏰ ${format(dueTime, 'h:mm a')}\n\n`;
                  });
                  
                  await discordUser.send(message);
                } catch (error) {
                  console.error('Error sending daily summary to user:', error);
                }
              }
            );
          } catch (error) {
            console.error('Error processing user for daily summary:', error);
          }
        }
      }
    );
  });
  
  // Weekly summary on Sunday at 6 PM
  cron.schedule('0 18 * * 0', async () => {
    console.log('Running weekly reminder summary...');
    
    // Get all users with pending reminders
    db.all(
      'SELECT DISTINCT userId FROM reminders WHERE status = ?',
      ['pending'],
      async (err, users) => {
        if (err) return console.error('Error fetching users for weekly summary:', err);
        
        for (const user of users) {
          try {
            // Get all pending reminders
            db.all(
              'SELECT * FROM reminders WHERE userId = ? AND status = ? ORDER BY dueTime ASC',
              [user.userId, 'pending'],
              async (err, reminders) => {
                if (err || reminders.length === 0) return;
                
                try {
                  const discordUser = await client.users.fetch(user.userId);
                  if (!discordUser) return;
                  
                  let message = `📅 **Weekly Summary**\n\nYou have ${reminders.length} pending reminder(s):\n\n`;
                  
                  // Group by time (today, this week, later)
                  const now = Math.floor(Date.now() / 1000);
                  const endOfToday = Math.floor(new Date(new Date().setHours(23, 59, 59, 999)).getTime() / 1000);
                  const endOfWeek = Math.floor(new Date(new Date().setDate(new Date().getDate() + 7)).getTime() / 1000);
                  
                  const dueTodayReminders = reminders.filter(r => r.dueTime && r.dueTime <= endOfToday);
                  const dueThisWeekReminders = reminders.filter(r => r.dueTime && r.dueTime > endOfToday && r.dueTime <= endOfWeek);
                  const dueLaterReminders = reminders.filter(r => !r.dueTime || r.dueTime > endOfWeek);
                  const overdueReminders = reminders.filter(r => r.dueTime && r.dueTime < now);
                  
                  if (overdueReminders.length > 0) {
                    message += `**Overdue (${overdueReminders.length})**\n`;
                    overdueReminders.slice(0, 3).forEach((reminder, index) => {
                      message += `${index + 1}. ${reminder.content}\n`;
                    });
                    if (overdueReminders.length > 3) {
                      message += `...and ${overdueReminders.length - 3} more\n`;
                    }
                    message += '\n';
                  }
                  
                  if (dueTodayReminders.length > 0) {
                    message += `**Due Today (${dueTodayReminders.length})**\n`;
                    dueTodayReminders.slice(0, 3).forEach((reminder, index) => {
                      message += `${index + 1}. ${reminder.content}\n`;
                    });
                    if (dueTodayReminders.length > 3) {
                      message += `...and ${dueTodayReminders.length - 3} more\n`;
                    }
                    message += '\n';
                  }
                  
                  if (dueThisWeekReminders.length > 0) {
                    message += `**Coming This Week (${dueThisWeekReminders.length})**\n`;
                    dueThisWeekReminders.slice(0, 3).forEach((reminder, index) => {
                      const date = new Date(reminder.dueTime * 1000);
                      message += `${index + 1}. ${reminder.content} (${format(date, 'EEE')})\n`;
                    });
                    if (dueThisWeekReminders.length > 3) {
                      message += `...and ${dueThisWeekReminders.length - 3} more\n`;
                    }
                    message += '\n';
                  }
                  
                  message += `\nType "show my reminders" to see all your reminders.`;
                  
                  await discordUser.send(message);
                } catch (error) {
                  console.error('Error sending weekly summary to user:', error);
                }
              }
            );
          } catch (error) {
            console.error('Error processing user for weekly summary:', error);
          }
        }
      }
    );
  });
  
  console.log('Scheduled daily (9 AM) and weekly (Sunday 6 PM) reminders.');
}

if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN);
} else {
  console.error('Error: DISCORD_TOKEN not found in .env file.');
  console.log('Please create a .env file in the root directory (c:\\Users\\mason\\CascadeProjects\\botbot\\.env) and add your DISCORD_TOKEN.');
  console.log('Example: DISCORD_TOKEN=your_bot_token_here');
}

console.log('bot.js with reminder parsing logic loaded.');
