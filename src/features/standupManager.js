/**
 * Standup meeting manager
 * Handles daily standup prompts and reporting
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');

class StandupManager {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.setupDatabase();
  }

  /**
   * Set up database tables
   */
  setupDatabase() {
    this.db.serialize(() => {
      // Standup configurations table
      this.db.run(`CREATE TABLE IF NOT EXISTS standup_configs (
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
      this.db.run(`CREATE TABLE IF NOT EXISTS standup_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        standupId INTEGER NOT NULL,
        userId TEXT NOT NULL,
        userTag TEXT NOT NULL,
        yesterday TEXT,
        today TEXT,
        blockers TEXT,
        submittedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        FOREIGN KEY(standupId) REFERENCES standup_sessions(id)
      )`);

      // Standup sessions table
      this.db.run(`CREATE TABLE IF NOT EXISTS standup_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        configId INTEGER NOT NULL,
        date TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        summary TEXT,
        startedAt INTEGER DEFAULT (cast(strftime('%s', 'now') as int)),
        completedAt INTEGER,
        FOREIGN KEY(configId) REFERENCES standup_configs(id)
      )`);
    });
  }

  /**
   * Initialize standup scheduler
   */
  initialize() {
    // Check and schedule all active standups
    this.db.all(
      'SELECT * FROM standup_configs WHERE active = 1',
      async (err, configs) => {
        if (err) {
          console.error('Error retrieving standup configs:', err);
          return;
        }

        for (const config of configs) {
          this.scheduleStandup(config);
        }
      }
    );

    console.log('Standup manager initialized');
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
        this.startStandupSession(config.id);
      });
      
      console.log(`Scheduled standup for ${config.guildId} in channel ${config.channelId} at ${config.scheduledTime} ${config.timezone}`);
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
      scheduledTime, // format: "HH:MM"
      timezone = 'UTC',
      createdBy
    } = options;

    // Parse time to cron expression
    // Format: "minute hour * * *" (daily at hour:minute)
    const [hour, minute] = scheduledTime.split(':');
    const cronExpression = `${minute} ${hour} * * 1-5`; // Monday-Friday

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO standup_configs 
         (guildId, channelId, scheduledTime, timezone, cronExpression, createdBy)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [guildId, channelId, scheduledTime, timezone, cronExpression, createdBy],
        function(err) {
          if (err) return reject(err);
          
          const configId = this.lastID;
          
          // Get the created config
          this.db.get(
            'SELECT * FROM standup_configs WHERE id = ?',
            [configId],
            (err, config) => {
              if (err) return reject(err);
              resolve(config);
            }
          );
        }.bind(this.db)
      );
    });
  }

  /**
   * Start a new standup session
   * @param {number} configId - Standup config ID
   */
  async startStandupSession(configId) {
    try {
      // Get the config
      const config = await this.getStandupConfig(configId);
      if (!config) {
        console.error(`Standup config ${configId} not found`);
        return;
      }

      // Get the channel
      const channel = await this.client.channels.fetch(config.channelId).catch(console.error);
      if (!channel) {
        console.error(`Channel ${config.channelId} not found for standup ${configId}`);
        return;
      }

      // Create a new session
      const today = new Date().toISOString().split('T')[0];
      const sessionId = await this.createStandupSession(configId, today);

      // Send the standup prompt
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
          new ButtonBuilder()
            .setCustomId(`standup_respond_${sessionId}`)
            .setLabel('Submit My Update')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`standup_view_${sessionId}`)
            .setLabel('View Updates')
            .setStyle(ButtonStyle.Secondary)
        );

      await channel.send({ embeds: [embed], components: [row] });
      
      // Update the config's lastRun time
      await this.updateLastRunTime(configId);
      
    } catch (error) {
      console.error(`Error starting standup session for config ${configId}:`, error);
    }
  }

  /**
   * Create a new standup session
   * @param {number} configId - Config ID
   * @param {string} date - Date string (YYYY-MM-DD)
   * @returns {Promise<number>} - Session ID
   */
  async createStandupSession(configId, date) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO standup_sessions (configId, date) VALUES (?, ?)`,
        [configId, date],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Get a standup config
   * @param {number} configId - Config ID
   * @returns {Promise<Object>} - Config object
   */
  async getStandupConfig(configId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM standup_configs WHERE id = ?',
        [configId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Update a config's last run time
   * @param {number} configId - Config ID
   */
  async updateLastRunTime(configId) {
    const now = Math.floor(Date.now() / 1000);
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE standup_configs SET lastRun = ? WHERE id = ?',
        [now, configId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Save a user's standup response
   * @param {number} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {string} userTag - User tag
   * @param {Object} data - Response data
   * @returns {Promise<number>} - Response ID
   */
  async saveStandupResponse(sessionId, userId, userTag, data) {
    const { yesterday, today, blockers } = data;
    
    return new Promise((resolve, reject) => {
      // Check if user already responded
      this.db.get(
        'SELECT id FROM standup_responses WHERE standupId = ? AND userId = ?',
        [sessionId, userId],
        (err, row) => {
          if (err) return reject(err);
          
          if (row) {
            // Update existing response
            this.db.run(
              `UPDATE standup_responses 
               SET yesterday = ?, today = ?, blockers = ?, submittedAt = cast(strftime('%s', 'now') as int) 
               WHERE id = ?`,
              [yesterday, today, blockers, row.id],
              function(err) {
                if (err) return reject(err);
                resolve(row.id);
              }
            );
          } else {
            // Create new response
            this.db.run(
              `INSERT INTO standup_responses 
               (standupId, userId, userTag, yesterday, today, blockers)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [sessionId, userId, userTag, yesterday, today, blockers],
              function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
              }
            );
          }
        }
      );
    });
  }

  /**
   * Get responses for a standup session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Array>} - Array of responses
   */
  async getStandupResponses(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM standup_responses WHERE standupId = ? ORDER BY submittedAt ASC',
        [sessionId],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  /**
   * Generate a summary for a standup session
   * @param {number} sessionId - Session ID
   * @returns {Promise<string>} - Summary text
   */
  async generateStandupSummary(sessionId) {
    try {
      const responses = await this.getStandupResponses(sessionId);
      
      if (responses.length === 0) {
        return "No responses for this standup session.";
      }
      
      // Get session info
      const session = await this.getStandupSession(sessionId);
      const config = session ? await this.getStandupConfig(session.configId) : null;
      
      let summary = `# Standup Summary - ${session.date}\n\n`;
      
      // Identify blockers
      const blockers = responses.filter(r => r.blockers && r.blockers.trim() !== '');
      
      if (blockers.length > 0) {
        summary += `## 🚨 Blockers & Issues (${blockers.length})\n`;
        for (const response of blockers) {
          summary += `- **${response.userTag}**: ${response.blockers}\n`;
        }
        summary += "\n";
      }
      
      // List all updates
      summary += `## 👥 Team Updates (${responses.length})\n\n`;
      
      for (const response of responses) {
        summary += `### ${response.userTag}\n`;
        summary += `**Yesterday**: ${response.yesterday || 'No update'}\n`;
        summary += `**Today**: ${response.today || 'No update'}\n`;
        
        if (response.blockers && response.blockers.trim() !== '') {
          summary += `**Blockers**: ${response.blockers}\n`;
        }
        
        summary += "\n";
      }
      
      // Stats
      summary += `## 📊 Stats\n`;
      summary += `- **Total Participants**: ${responses.length}\n`;
      summary += `- **Blockers Reported**: ${blockers.length}\n`;
      
      return summary;
    } catch (error) {
      console.error(`Error generating standup summary for session ${sessionId}:`, error);
      return "Error generating summary.";
    }
  }

  /**
   * Get a standup session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} - Session object
   */
  async getStandupSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM standup_sessions WHERE id = ?',
        [sessionId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Handle standup interaction (button click)
   * @param {Interaction} interaction - Discord interaction
   */
  async handleStandupInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    
    if (customId.startsWith('standup_respond_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      
      // Create a modal for standup response
      const modal = {
        title: "Daily Standup Update",
        custom_id: `standup_modal_${sessionId}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "yesterday",
                label: "What did you accomplish yesterday?",
                style: 2,
                min_length: 5,
                max_length: 1000,
                placeholder: "I completed...",
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "today",
                label: "What will you work on today?",
                style: 2,
                min_length: 5,
                max_length: 1000,
                placeholder: "I plan to...",
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "blockers",
                label: "Any blockers or issues?",
                style: 2,
                min_length: 0,
                max_length: 1000,
                placeholder: "I'm blocked by... (leave empty if none)",
                required: false
              }
            ]
          }
        ]
      };
      
      await interaction.showModal(modal);
      
    } else if (customId.startsWith('standup_view_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      
      try {
        const responses = await this.getStandupResponses(sessionId);
        const session = await this.getStandupSession(sessionId);
        
        if (!session) {
          return interaction.reply({ content: "This standup session no longer exists.", ephemeral: true });
        }
        
        if (responses.length === 0) {
          return interaction.reply({ content: "No responses for this standup session yet.", ephemeral: true });
        }
        
        // Create an embed for the responses summary
        const embed = new EmbedBuilder()
          .setColor('#0099ff')
          .setTitle(`Standup Responses - ${session.date}`)
          .setDescription(`${responses.length} team members have provided updates so far.`);
        
        // Add a field for each response (up to 10 max)
        const displayResponses = responses.slice(0, 10);
        for (const response of displayResponses) {
          let fieldContent = "";
          
          if (response.today) {
            fieldContent += `**Today:** ${response.today.substring(0, 100)}${response.today.length > 100 ? '...' : ''}\n`;
          }
          
          if (response.blockers && response.blockers.trim() !== '') {
            fieldContent += `**Blockers:** ${response.blockers.substring(0, 100)}${response.blockers.length > 100 ? '...' : ''}`;
          }
          
          embed.addFields({ name: response.userTag, value: fieldContent || 'No details' });
        }
        
        if (responses.length > 10) {
          embed.setFooter({ text: `+ ${responses.length - 10} more responses. View full summary for details.` });
        }
        
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`standup_summary_${sessionId}`)
              .setLabel('View Full Summary')
              .setStyle(ButtonStyle.Primary)
          );
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        
      } catch (error) {
        console.error('Error viewing standup responses:', error);
        await interaction.reply({ content: "There was an error retrieving the standup responses.", ephemeral: true });
      }
    } else if (customId.startsWith('standup_summary_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      
      try {
        const summary = await this.generateStandupSummary(sessionId);
        
        // Split summary if needed (Discord has a 2000 character limit)
        const maxChunkSize = 1900; // Leave some room for formatting
        
        if (summary.length <= maxChunkSize) {
          await interaction.reply({ content: summary, ephemeral: true });
        } else {
          // Split by paragraphs to avoid cutting in the middle of text
          const paragraphs = summary.split('\n\n');
          let currentChunk = '';
          
          for (const paragraph of paragraphs) {
            if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
              // Send current chunk
              await interaction.followUp({ content: currentChunk, ephemeral: true });
              currentChunk = paragraph + '\n\n';
            } else {
              currentChunk += paragraph + '\n\n';
            }
          }
          
          // Send any remaining content
          if (currentChunk.trim().length > 0) {
            await interaction.followUp({ content: currentChunk, ephemeral: true });
          }
          
          // Initial reply to show it's working
          await interaction.reply({ content: "Here's the full standup summary:", ephemeral: true });
        }
        
      } catch (error) {
        console.error('Error generating standup summary:', error);
        await interaction.reply({ content: "There was an error generating the standup summary.", ephemeral: true });
      }
    }
  }

  /**
   * Handle standup modal submission
   * @param {Interaction} interaction - Discord interaction
   */
  async handleStandupModalSubmit(interaction) {
    if (!interaction.isModalSubmit()) return;
    
    const customId = interaction.customId;
    
    if (customId.startsWith('standup_modal_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      
      const yesterday = interaction.fields.getTextInputValue('yesterday');
      const today = interaction.fields.getTextInputValue('today');
      const blockers = interaction.fields.getTextInputValue('blockers');
      
      try {
        await this.saveStandupResponse(sessionId, interaction.user.id, interaction.user.tag, {
          yesterday,
          today,
          blockers
        });
        
        await interaction.reply({ content: "Thanks for your standup update! 🎉", ephemeral: true });
        
        // Try to update the original message with current count
        try {
          const responses = await this.getStandupResponses(sessionId);
          const originalMessage = interaction.message;
          
          if (originalMessage && responses.length > 0) {
            const embed = originalMessage.embeds[0];
            if (embed) {
              const newEmbed = EmbedBuilder.from(embed)
                .setDescription(`Good morning team! It's time for our daily standup.\nPlease share your updates by clicking the button below.\n\n**Responses so far:** ${responses.length}`);
              
              await originalMessage.edit({ embeds: [newEmbed] });
            }
          }
        } catch (err) {
          console.error('Error updating standup message:', err);
          // Non-critical, just continue
        }
        
      } catch (error) {
        console.error('Error saving standup response:', error);
        await interaction.reply({ content: "There was an error saving your standup response. Please try again.", ephemeral: true });
      }
    }
  }
}

module.exports = StandupManager;
