/**
 * Standup meeting manager
 * Handles daily standup prompts and reporting
 */
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import cron from 'node-cron';

class StandupManager {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    // this.setupDatabase(); // Call this from an async context after instantiation
  }

  /**
   * Set up database tables
   */
  async setupDatabase() { // Made async
    // Standup configurations table
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS standup_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      channelId TEXT NOT NULL,
      scheduledTime TEXT NOT NULL,
      timezone TEXT DEFAULT 'UTC',
      cronExpression TEXT,
      active BOOLEAN DEFAULT 1,
      createdBy TEXT NOT NULL,
      createdAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      lastRun INTEGER,
      UNIQUE(guildId, channelId)
    )`);

    // Standup responses table
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS standup_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standupId INTEGER NOT NULL, -- This should reference standup_sessions(id)
      userId TEXT NOT NULL,
      userTag TEXT NOT NULL,
      yesterday TEXT,
      today TEXT,
      blockers TEXT,
      submittedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      FOREIGN KEY(standupId) REFERENCES standup_sessions(id) ON DELETE CASCADE -- Added ON DELETE CASCADE
    )`);

    // Standup sessions table
    await this.db.runAsync(`CREATE TABLE IF NOT EXISTS standup_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      configId INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      summary TEXT,
      startedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
      completedAt INTEGER,
      FOREIGN KEY(configId) REFERENCES standup_configs(id) ON DELETE CASCADE -- Added ON DELETE CASCADE
    )`);
  }

  /**
   * Initialize standup scheduler
   */
  async initialize() { // Made async
    try {
      const configs = await this.db.allAsync('SELECT * FROM standup_configs WHERE active = 1');
      for (const config of configs) {
        this.scheduleStandup(config);
      }
      console.log('Standup manager initialized and schedules loaded.');
    } catch (err) {
      console.error('Error initializing standup manager:', err);
    }
  }

  /**
   * Schedule a standup job
   * @param {Object} config - Standup configuration
   */
  scheduleStandup(config) {
    if (!config.cronExpression) {
      console.error(`Standup ${config.id} has no cron expression`);
      return;
    }

    try {
      cron.schedule(config.cronExpression, () => {
        this.startStandupSession(config.id).catch(err =>
            console.error(`Error running scheduled standup session for config ${config.id}:`, err)
        );
      }, {
        timezone: config.timezone || 'UTC'
      });
      
      console.log(`Scheduled standup for ${config.guildId} in channel ${config.channelId} at ${config.scheduledTime} ${config.timezone || 'UTC'}`);
    } catch (error) {
      console.error(`Error scheduling standup ${config.id}:`, error);
    }
  }

  /**
   * Create a new standup configuration
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} - Created configuration
   */
  async createStandupConfig(options) {
    const {
      guildId,
      channelId,
      scheduledTime,
      timezone = 'UTC',
      createdBy
    } = options;

    const [hour, minute] = scheduledTime.split(':');
    const cronExpression = `${minute} ${hour} * * 1-5`; // Monday-Friday

    const stmt = await this.db.runAsync(
      `INSERT INTO standup_configs
       (guildId, channelId, scheduledTime, timezone, cronExpression, createdBy)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [guildId, channelId, scheduledTime, timezone, cronExpression, createdBy]
    );

    const configId = stmt.lastID;
    return this.getStandupConfig(configId);
  }

  /**
   * Start a new standup session
   * @param {number} configId - Standup config ID
   */
  async startStandupSession(configId) {
    const config = await this.getStandupConfig(configId);
    if (!config) {
      console.error(`Standup config ${configId} not found`);
      return;
    }

    const channel = await this.client.channels.fetch(config.channelId).catch(err => {
        console.error(`Channel ${config.channelId} not found for standup ${configId}:`, err);
        return null;
    });
    if (!channel) return;

    const today = new Date().toISOString().split('T')[0];
    const sessionId = await this.createStandupSession(configId, today);

    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('🌅 Daily Standup')
      .setDescription(`Good morning team! It's time for our daily standup.\nPlease share your updates by clicking the button below.`)
      .addFields(
        { name: '📅 Date', value: today },
        { name: '⏰ Please respond by', value: `End of day (${config.timezone})` },
        { name: '🔍 Questions', value: '1. What did you accomplish yesterday?\n2. What will you work on today?\n3. Any blockers or issues?' }
      )
      .setFooter({ text: `Standup ID: ${sessionId}` });

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId(`standup_respond_${sessionId}`).setLabel('Submit My Update').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`standup_view_${sessionId}`).setLabel('View Updates').setStyle(ButtonStyle.Secondary)
      );

    await channel.send({ embeds: [embed], components: [row] });
    await this.updateLastRunTime(configId);
  }

  /**
   * Create a new standup session
   * @returns {Promise<number>} - Session ID
   */
  async createStandupSession(configId, date) {
    const stmt = await this.db.runAsync(
      `INSERT INTO standup_sessions (configId, date) VALUES (?, ?)`,
      [configId, date]
    );
    return stmt.lastID;
  }

  /**
   * Get a standup config
   * @returns {Promise<Object>} - Config object
   */
  async getStandupConfig(configId) {
    return this.db.getAsync('SELECT * FROM standup_configs WHERE id = ?', [configId]);
  }

  /**
   * Update a config's last run time
   */
  async updateLastRunTime(configId) {
    const now = Math.floor(Date.now() / 1000);
    const stmt = await this.db.runAsync('UPDATE standup_configs SET lastRun = ? WHERE id = ?', [now, configId]);
    return stmt.changes > 0;
  }

  /**
   * Save a user's standup response
   * @returns {Promise<number>} - Response ID
   */
  async saveStandupResponse(sessionId, userId, userTag, data) {
    const { yesterday, today, blockers } = data;
    
    const existingResponse = await this.db.getAsync(
      'SELECT id FROM standup_responses WHERE standupId = ? AND userId = ?',
      [sessionId, userId]
    );

    if (existingResponse) {
      await this.db.runAsync(
        `UPDATE standup_responses
         SET yesterday = ?, today = ?, blockers = ?, submittedAt = cast(strftime('%s', 'now') as int)
         WHERE id = ?`,
        [yesterday, today, blockers, existingResponse.id]
      );
      return existingResponse.id;
    } else {
      const stmt = await this.db.runAsync(
        `INSERT INTO standup_responses
         (standupId, userId, userTag, yesterday, today, blockers)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [sessionId, userId, userTag, yesterday, today, blockers]
      );
      return stmt.lastID;
    }
  }

  /**
   * Get responses for a standup session
   * @returns {Promise<Array>} - Array of responses
   */
  async getStandupResponses(sessionId) {
    const rows = await this.db.allAsync(
      'SELECT * FROM standup_responses WHERE standupId = ? ORDER BY submittedAt ASC',
      [sessionId]
    );
    return rows || [];
  }

  /**
   * Generate a summary for a standup session
   * @returns {Promise<string>} - Summary text
   */
  async generateStandupSummary(sessionId) {
    const responses = await this.getStandupResponses(sessionId);
    if (responses.length === 0) return "No responses for this standup session.";

    const session = await this.getStandupSession(sessionId);
    // const config = session ? await this.getStandupConfig(session.configId) : null; // Config not used in summary

    let summary = `# Standup Summary - ${session?.date || `Session ${sessionId}`}\n\n`;

    const blockers = responses.filter(r => r.blockers?.trim());
    if (blockers.length > 0) {
      summary += `## 🚨 Blockers & Issues (${blockers.length})\n`;
      blockers.forEach(r => {
        summary += `- **${r.userTag}**: ${r.blockers}\n`;
      });
      summary += "\n";
    }

    summary += `## 👥 Team Updates (${responses.length})\n\n`;
    responses.forEach(r => {
      summary += `### ${r.userTag}\n`;
      summary += `**Yesterday**: ${r.yesterday || 'No update'}\n`;
      summary += `**Today**: ${r.today || 'No update'}\n`;
      if (r.blockers?.trim()) {
        summary += `**Blockers**: ${r.blockers}\n`;
      }
      summary += "\n";
    });

    summary += `## 📊 Stats\n`;
    summary += `- **Total Participants**: ${responses.length}\n`;
    summary += `- **Blockers Reported**: ${blockers.length}\n`;

    return summary;
  }

  /**
   * Get a standup session
   * @returns {Promise<Object>} - Session object
   */
  async getStandupSession(sessionId) {
    return this.db.getAsync('SELECT * FROM standup_sessions WHERE id = ?', [sessionId]);
  }

  /**
   * Handle standup interaction (button click)
   */
  async handleStandupInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    const sessionId = parseInt(customId.split('_')[2]);

    if (!sessionId) {
        console.warn("Could not parse sessionId from customId:", customId);
        await interaction.reply({ content: "Invalid interaction ID.", ephemeral: true });
        return;
    }

    if (customId.startsWith('standup_respond_')) {
      const modalPayload = {
        title: "Daily Standup Update",
        custom_id: `standup_modal_${sessionId}`,
        components: [
          { type: 1, components: [{ type: 4, custom_id: "yesterday", label: "What did you accomplish yesterday?", style: 2, min_length: 5, max_length: 1000, placeholder: "I completed...", required: true }] },
          { type: 1, components: [{ type: 4, custom_id: "today", label: "What will you work on today?", style: 2, min_length: 5, max_length: 1000, placeholder: "I plan to...", required: true }] },
          { type: 1, components: [{ type: 4, custom_id: "blockers", label: "Any blockers or issues?", style: 2, min_length: 0, max_length: 1000, placeholder: "I'm blocked by... (leave empty if none)", required: false }] }
        ]
      };
      await interaction.showModal(modalPayload);
      
    } else if (customId.startsWith('standup_view_')) {
      const responses = await this.getStandupResponses(sessionId);
      const session = await this.getStandupSession(sessionId);
      
      if (!session) return interaction.reply({ content: "This standup session no longer exists.", ephemeral: true });
      if (responses.length === 0) return interaction.reply({ content: "No responses for this standup session yet.", ephemeral: true });

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle(`Standup Responses - ${session.date}`)
        .setDescription(`${responses.length} team member(s) have provided updates.`);

      const displayResponses = responses.slice(0, 10);
      for (const response of displayResponses) {
        let fieldContent = "";
        if (response.today) fieldContent += `**Today:** ${response.today.substring(0, 100)}${response.today.length > 100 ? '...' : ''}\n`;
        if (response.blockers?.trim()) fieldContent += `**Blockers:** ${response.blockers.substring(0, 100)}${response.blockers.length > 100 ? '...' : ''}`;
        embed.addFields({ name: response.userTag, value: fieldContent || 'No details provided.' });
      }

      if (responses.length > 10) {
        embed.setFooter({ text: `+ ${responses.length - 10} more response(s). View full summary for details.` });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`standup_summary_${sessionId}`).setLabel('View Full Summary').setStyle(ButtonStyle.Primary)
      );
      await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });

    } else if (customId.startsWith('standup_summary_')) {
      const summary = await this.generateStandupSummary(sessionId);
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
   * Handle standup modal submission
   */
  async handleStandupModalSubmit(interaction) {
    if (!interaction.isModalSubmit()) return;
    
    const customId = interaction.customId;
    
    if (customId.startsWith('standup_modal_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      
      const yesterday = interaction.fields.getTextInputValue('yesterday');
      const today = interaction.fields.getTextInputValue('today');
      const blockers = interaction.fields.getTextInputValue('blockers');
      
      await this.saveStandupResponse(sessionId, interaction.user.id, interaction.user.tag, {
        yesterday, today, blockers
      });

      await interaction.reply({ content: "Thanks for your standup update! 🎉", ephemeral: true });

      try {
        const responses = await this.getStandupResponses(sessionId);
        const originalMessage = interaction.message;
        
        if (originalMessage && originalMessage.embeds && originalMessage.embeds.length > 0) {
          const currentEmbed = originalMessage.embeds[0];
          const newEmbed = EmbedBuilder.from(currentEmbed)
            .setDescription(
              `${currentEmbed.description.split('\n\n**Responses so far:**')[0]}\n\n**Responses so far:** ${responses.length}`
            );
          await originalMessage.edit({ embeds: [newEmbed] });
        }
      } catch (err) {
        console.error('Error updating standup message with count:', err);
      }
    }
  }
}

export default StandupManager;
