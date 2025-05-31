/**
 * Retrospective manager
 * Handles team retrospective meetings and feedback collection
 */
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import cron from 'node-cron'; // Changed from require

class RetroManager {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    // this.setupDatabase(); // Call this from an async context after instantiation
  }

  /**
   * Set up database tables for retrospectives
   */
  async setupDatabase() { // Made async
    // Retrospective configurations table
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS retro_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      frequency TEXT NOT NULL, /* weekly, biweekly, monthly, custom */
      scheduledDay TEXT NOT NULL, /* day of week or date of month */
      scheduledTime TEXT NOT NULL, /* HH:MM format */
      timezone TEXT DEFAULT 'UTC',
      cronExpression TEXT,
      active BOOLEAN DEFAULT 1,
      createdBy TEXT NOT NULL,
      createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      lastRun INTEGER,
      UNIQUE(guildId, channelId)
    )`);

    // Retrospective sessions table
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS retro_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      configId INTEGER NOT NULL,
      title TEXT,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      status TEXT DEFAULT 'active', /* active, collecting, completed */
      summary TEXT,
      startedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      completedAt INTEGER,
      FOREIGN KEY(configId) REFERENCES retro_configs(id)
    )`);

    // Retrospective responses table
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS retro_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId INTEGER NOT NULL,
      userId TEXT NOT NULL,
      userTag TEXT NOT NULL,
      wentWell TEXT,
      wentPoorly TEXT,
      actionItems TEXT,
      anonymous BOOLEAN DEFAULT 0,
      submittedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY(sessionId) REFERENCES retro_sessions(id)
    )`);

    // Retrospective action items table
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS retro_action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId INTEGER NOT NULL,
      content TEXT NOT NULL,
      assignedTo TEXT,
      status TEXT DEFAULT 'open', /* open, in-progress, completed */
      reminderId INTEGER, /* Link to a reminder if created */
      createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      completedAt INTEGER,
      FOREIGN KEY(sessionId) REFERENCES retro_sessions(id),
      FOREIGN KEY(reminderId) REFERENCES reminders(id)
    )`);
  }

  /**
   * Initialize retrospective scheduler
   */
  async initialize() { // Made async
    try {
      const configs = await this.db.allAsync('SELECT * FROM retro_configs WHERE active = 1');
      for (const config of configs) {
        this.scheduleRetrospective(config);
      }
      console.log('Retrospective manager initialized and schedules loaded.');
    } catch (err) {
      console.error('Error initializing retrospective manager:', err);
    }
  }

  /**
   * Schedule a retrospective job
   * @param {Object} config - Retrospective configuration
   */
  scheduleRetrospective(config) {
    if (!config.cronExpression) {
      console.error(`Retrospective ${config.id} has no cron expression`);
      return;
    }

    try {
      cron.schedule(config.cronExpression, () => {
        this.startRetroSession(config.id).catch(err =>
            console.error(`Error running scheduled retro session for config ${config.id}:`, err)
        );
      }, {
        timezone: config.timezone || 'UTC'
      });
      
      console.log(`Scheduled retrospective for ${config.guildId} in channel ${config.channelId} (${config.frequency} at ${config.scheduledTime} ${config.timezone || 'UTC'})`);
    } catch (error) {
      console.error(`Error scheduling retrospective ${config.id}:`, error);
    }
  }

  /**
   * Create a new retrospective configuration
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - Created configuration
   */
  async createRetroConfig(options) {
    const {
      guildId,
      channelId,
      frequency,
      scheduledDay,
      scheduledTime,
      timezone = 'UTC',
      createdBy
    } = options;

    let cronExpression;
    const [hour, minute] = scheduledTime.split(':');
    const dayMap = {
      'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
      'thursday': 4, 'friday': 5, 'saturday': 6
    };

    switch (frequency.toLowerCase()) {
      case 'weekly':
        const dayNum = dayMap[scheduledDay.toLowerCase()] ?? 5; // Default to Friday
        cronExpression = `${minute} ${hour} * * ${dayNum}`;
        break;
      case 'biweekly':
        const biDay = dayMap[scheduledDay.toLowerCase()] ?? 5;
        cronExpression = `${minute} ${hour} * * ${biDay}`; // Note: actual biweekly check is in startRetroSession
        break;
      case 'monthly':
        const dayOfMonth = parseInt(scheduledDay) || 1;
        cronExpression = `${minute} ${hour} ${dayOfMonth} * *`;
        break;
      default:
        cronExpression = options.cronExpression || '0 15 * * 5'; // Default: Fridays at 3pm
    }

    const stmt = await this.db.runAsync(
      `INSERT INTO retro_configs
       (guildId, channelId, frequency, scheduledDay, scheduledTime, timezone, cronExpression, createdBy)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [guildId, channelId, frequency, scheduledDay, scheduledTime, timezone, cronExpression, createdBy]
    );

    const configId = stmt.lastID;
    return this.getRetroConfig(configId);
  }

  /**
   * Start a new retrospective session
   * @param {number} configId - Retrospective config ID
   */
  async startRetroSession(configId) {
    const config = await this.getRetroConfig(configId);
    if (!config) {
      console.error(`Retrospective config ${configId} not found`);
      return;
    }

    if (config.frequency.toLowerCase() === 'biweekly') {
      const lastRunDate = config.lastRun ? new Date(config.lastRun * 1000) : null;
      const today = new Date();
      if (lastRunDate) {
        const diffTime = Math.abs(today - lastRunDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 13) {
          console.log(`Skipping biweekly retro ${configId}, only ${diffDays} days since last run.`);
          return;
        }
      }
    }

    const channel = await this.client.channels.fetch(config.channelId).catch(err => {
        console.error(`Channel ${config.channelId} not found for retrospective ${configId}:`, err);
        return null;
    });
    if (!channel) return;

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const sessionId = await this.createRetroSession(
      configId,
      `Retrospective - ${startDate.toISOString().split('T')[0]}`,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🔄 Team Retrospective')
      .setDescription(`It's time for our ${config.frequency} retrospective!\nPlease share your thoughts on our recent work by clicking the button below.`)
      .addFields(
        { name: '📅 Period', value: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}` },
        { name: '⏰ Please respond by', value: `End of day (${config.timezone})` },
        { name: '🔍 We\'ll reflect on', value: '1. What went well?\n2. What could have gone better?\n3. What actions should we take?' }
      )
      .setFooter({ text: `Retrospective ID: ${sessionId}` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`retro_respond_${sessionId}`).setLabel('Submit Feedback').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`retro_anon_${sessionId}`).setLabel('Submit Anonymously').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`retro_view_${sessionId}`).setLabel('View Feedback').setStyle(ButtonStyle.Secondary)
      );

    await channel.send({ embeds: [embed], components: [row] });
    await this.updateLastRunTime(configId);
  }

  /**
   * Create a new retrospective session
   * @returns {Promise<number>} - Session ID
   */
  async createRetroSession(configId, title, startDate, endDate) {
    const stmt = await this.db.runAsync(
      `INSERT INTO retro_sessions (configId, title, startDate, endDate)
       VALUES (?, ?, ?, ?)`,
      [configId, title, startDate, endDate]
    );
    return stmt.lastID;
  }

  /**
   * Get a retrospective config
   * @returns {Promise<Object>} - Config object
   */
  async getRetroConfig(configId) {
    return this.db.getAsync('SELECT * FROM retro_configs WHERE id = ?', [configId]);
  }

  /**
   * Update a config's last run time
   */
  async updateLastRunTime(configId) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = await this.db.runAsync('UPDATE retro_configs SET lastRun = ? WHERE id = ?', [now, configId]);
    return stmt.changes > 0;
  }

  /**
   * Save a user's retrospective response
   * @returns {Promise<number>} - Response ID
   */
  async saveRetroResponse(sessionId, userId, userTag, data, anonymous = false) {
    const { wentWell, wentPoorly, actionItems } = data;
    
    const existingResponse = await this.db.getAsync(
      'SELECT id FROM retro_responses WHERE sessionId = ? AND userId = ?',
      [sessionId, userId]
    );

    if (existingResponse) {
      const stmt = await this.db.runAsync(
        `UPDATE retro_responses
         SET wentWell = ?, wentPoorly = ?, actionItems = ?, anonymous = ?,
         submittedAt = cast(strftime('%s', 'now') as int)
         WHERE id = ?`,
        [wentWell, wentPoorly, actionItems, anonymous ? 1 : 0, existingResponse.id]
      );
      return existingResponse.id; // Return existing ID on update
    } else {
      const stmt = await this.db.runAsync(
        `INSERT INTO retro_responses
         (sessionId, userId, userTag, wentWell, wentPoorly, actionItems, anonymous)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, userTag, wentWell, wentPoorly, actionItems, anonymous ? 1 : 0]
      );
      return stmt.lastID;
    }
  }

  /**
   * Get responses for a retrospective session
   * @returns {Promise<Array>} - Array of responses
   */
  async getRetroResponses(sessionId) {
    const rows = await this.db.allAsync(
      'SELECT * FROM retro_responses WHERE sessionId = ? ORDER BY submittedAt ASC',
      [sessionId]
    );

    return (rows || []).map(row => {
      if (row.anonymous) {
        return { ...row, userId: 'anonymous', userTag: 'Anonymous User' };
      }
      return row;
    });
  }

  /**
   * Generate a summary for a retrospective session
   * @returns {Promise<string>} - Summary text
   */
  async generateRetroSummary(sessionId) {
    const responses = await this.getRetroResponses(sessionId);
    if (responses.length === 0) return "No responses for this retrospective session.";

    const session = await this.getRetroSession(sessionId);
    // const config = session ? await this.getRetroConfig(session.configId) : null; // Config not used in summary text

    let summary = `# Retrospective Summary - ${session?.title || `Session ${sessionId}`}\n\n`;
    summary += `## 📅 Period: ${session?.startDate || 'N/A'} to ${session?.endDate || 'N/A'}\n\n`;
    summary += `## 👥 Participants: ${responses.length}\n\n`;

    summary += `## ✅ What Went Well\n\n`;
    responses.filter(r => r.wentWell?.trim()).forEach(r => {
      summary += `- **${r.userTag}**: ${r.wentWell}\n`;
    });
    if (!responses.some(r => r.wentWell?.trim())) summary += "_No feedback provided for this section._\n";

    summary += `\n## 🔄 What Could Be Improved\n\n`;
    responses.filter(r => r.wentPoorly?.trim()).forEach(r => {
      summary += `- **${r.userTag}**: ${r.wentPoorly}\n`;
    });
    if (!responses.some(r => r.wentPoorly?.trim())) summary += "_No feedback provided for this section._\n";

    summary += `\n## 📋 Action Items\n\n`;
    let hasActionItems = false;
    responses.filter(r => r.actionItems?.trim()).forEach(r => {
      summary += `- **${r.userTag}**: ${r.actionItems}\n`;
      hasActionItems = true;
    });
    if (!hasActionItems) summary += "_No action items were submitted._\n";

    summary += `\n## 📊 Summary Notes\n\n`;
    summary += `This retrospective had ${responses.length} participant(s). `;
    summary += hasActionItems ? `Action items have been identified.` : `No specific action items were identified.`;

    return summary;
  }

  /**
   * Get a retrospective session
   * @returns {Promise<Object>} - Session object
   */
  async getRetroSession(sessionId) {
    return this.db.getAsync('SELECT * FROM retro_sessions WHERE id = ?', [sessionId]);
  }

  /**
   * Handle retrospective interaction (button click)
   */
  async handleRetroInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    const sessionId = parseInt(customId.split('_')[2]); // Assumes format like retro_action_sessionId...

    if (!sessionId) {
        console.warn("Could not parse sessionId from customId:", customId);
        await interaction.reply({ content: "Invalid interaction ID.", ephemeral: true });
        return;
    }
    
    if (customId.startsWith('retro_respond_') || customId.startsWith('retro_anon_')) {
      const isAnonymous = customId.startsWith('retro_anon_');
      const modal = new EmbedBuilder() // This should be ModalBuilder, but discord.js v13 might not have it directly or named this.
                                        // For now, this will be a placeholder for the actual modal creation.
                                        // The original code used a raw object for the modal.
          .setTitle("Retrospective Feedback")
          .setCustomId(`retro_modal_${sessionId}_${isAnonymous ? 'anon' : 'named'}`)
          // .addComponents(...) // ActionRows with TextInputs
          // This part needs to be adapted to the correct ModalBuilder API if available,
          // or keep the raw object structure if that's what interaction.showModal expects.
          // For now, sticking to the original structure for showModal:
      const modalPayload = {
        title: "Retrospective Feedback",
        custom_id: `retro_modal_${sessionId}_${isAnonymous ? 'anon' : 'named'}`,
        components: [
          { type: 1, components: [{ type: 4, custom_id: "wentWell", label: "What went well?", style: 2, min_length: 5, max_length: 1000, placeholder: "I really liked how...", required: true }] },
          { type: 1, components: [{ type: 4, custom_id: "wentPoorly", label: "What could have gone better?", style: 2, min_length: 5, max_length: 1000, placeholder: "I think we struggled with...", required: true }] },
          { type: 1, components: [{ type: 4, custom_id: "actionItems", label: "What actions should we take?", style: 2, min_length: 0, max_length: 1000, placeholder: "We should...", required: false }] }
        ]
      };
      await interaction.showModal(modalPayload);
      
    } else if (customId.startsWith('retro_view_')) {
      const responses = await this.getRetroResponses(sessionId);
      const session = await this.getRetroSession(sessionId);
      
      if (!session) return interaction.reply({ content: "This retrospective session no longer exists.", ephemeral: true });
      if (responses.length === 0) return interaction.reply({ content: "No responses for this retrospective session yet.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`Retrospective Responses - ${session.title}`)
        .setDescription(`${responses.length} team member(s) have provided feedback.`); // Corrected pluralization

      const wellResponses = responses.filter(r => r.wentWell?.trim());
      if (wellResponses.length > 0) {
          embed.addFields({ 
            name: '✅ What Went Well',
            value: wellResponses.slice(0, 5).map(r => `**${r.userTag}**: ${r.wentWell.substring(0, 80)}${r.wentWell.length > 80 ? '...' : ''}`).join('\n') || 'No feedback yet'
          });
      }

      const actionItems = responses.filter(r => r.actionItems?.trim());
      if (actionItems.length > 0) {
        embed.addFields({
          name: '📋 Action Items',
          value: actionItems.slice(0, 5).map(r => `**${r.userTag}**: ${r.actionItems.substring(0, 80)}${r.actionItems.length > 80 ? '...' : ''}`).join('\n')
        });
      }

      if (responses.length > 5) {
        embed.setFooter({ text: `+ ${responses.length - 5} more response(s). View full summary for details.` });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`retro_summary_${sessionId}`).setLabel('View Full Summary').setStyle(ButtonStyle.Primary)
      );
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    } else if (customId.startsWith('retro_summary_')) {
      const summary = await this.generateRetroSummary(sessionId);
      const maxChunkSize = 1900;
      
      if (summary.length <= maxChunkSize) {
        await interaction.reply({ content: summary, ephemeral: true });
      } else {
        await interaction.reply({ content: "The summary is quite long! Sending it in parts...", ephemeral: true });
        const paragraphs = summary.split('\n\n');
        let currentChunk = '';
        for (const paragraph of paragraphs) {
          if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
            await interaction.followUp({ content: currentChunk, ephemeral: true });
            currentChunk = paragraph + '\n\n';
          } else {
            currentChunk += paragraph + '\n\n';
          }
        }
        if (currentChunk.trim().length > 0) {
          await interaction.followUp({ content: currentChunk, ephemeral: true });
        }
      }
    }
  }

  /**
   * Handle retrospective modal submission
   */
  async handleRetroModalSubmit(interaction) {
    if (!interaction.isModalSubmit()) return;
    
    const customId = interaction.customId;
    
    if (customId.startsWith('retro_modal_')) {
      const parts = customId.split('_');
      const sessionId = parseInt(parts[2]);
      const isAnonymous = parts[3] === 'anon';
      
      const wentWell = interaction.fields.getTextInputValue('wentWell');
      const wentPoorly = interaction.fields.getTextInputValue('wentPoorly');
      const actionItems = interaction.fields.getTextInputValue('actionItems');
      
      await this.saveRetroResponse(
        sessionId,
        interaction.user.id,
        interaction.user.tag,
        { wentWell, wentPoorly, actionItems },
        isAnonymous
      );

      let responseMessage = "Thanks for your retrospective feedback! 🎉";
      if (isAnonymous) responseMessage += " Your response has been recorded anonymously.";
      await interaction.reply({ content: responseMessage, ephemeral: true });

      try {
        const responses = await this.getRetroResponses(sessionId);
        const originalMessage = interaction.message; // Message where the button was clicked
        
        if (originalMessage && originalMessage.embeds && originalMessage.embeds.length > 0) {
          const currentEmbed = originalMessage.embeds[0];
          const newEmbed = EmbedBuilder.from(currentEmbed) // Rebuild from existing embed
            .setDescription( // Update description to include response count
              `${currentEmbed.description.split('\n\n**Responses so far:**')[0]}\n\n**Responses so far:** ${responses.length}`
            );
          await originalMessage.edit({ embeds: [newEmbed] });
        }
      } catch (err) {
        console.error('Error updating original retro message with count:', err);
      }
    }
  }
}

export default RetroManager;
