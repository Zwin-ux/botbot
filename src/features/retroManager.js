/**
 * Retrospective manager
 * Handles team retrospective meetings and feedback collection
 */
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const cron = require('node-cron');

class RetroManager {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.setupDatabase();
  }

  /**
   * Set up database tables for retrospectives
   */
  setupDatabase() {
    this.db.serialize(() => {
      // Retrospective configurations table
      this.db.run(`CREATE TABLE IF NOT EXISTS retro_configs (
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
      this.db.run(`CREATE TABLE IF NOT EXISTS retro_sessions (
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
      this.db.run(`CREATE TABLE IF NOT EXISTS retro_responses (
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
      this.db.run(`CREATE TABLE IF NOT EXISTS retro_action_items (
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
    });
  }

  /**
   * Initialize retrospective scheduler
   */
  initialize() {
    // Check and schedule all active retrospectives
    this.db.all(
      'SELECT * FROM retro_configs WHERE active = 1',
      async (err, configs) => {
        if (err) {
          console.error('Error retrieving retro configs:', err);
          return;
        }

        for (const config of configs) {
          this.scheduleRetrospective(config);
        }
      }
    );

    console.log('Retrospective manager initialized');
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
        this.startRetroSession(config.id);
      });
      
      console.log(`Scheduled retrospective for ${config.guildId} in channel ${config.channelId} ${config.frequency} at ${config.scheduledTime} ${config.timezone}`);
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
      frequency, // weekly, biweekly, monthly, custom
      scheduledDay, // Monday, 1st, etc.
      scheduledTime, // format: "HH:MM"
      timezone = 'UTC',
      createdBy
    } = options;

    // Generate cron expression based on frequency
    let cronExpression;
    
    switch (frequency.toLowerCase()) {
      case 'weekly':
        // Format: "minute hour * * dayOfWeek"
        // dayOfWeek: 0-6 (Sunday-Saturday) or names
        const dayMap = {
          'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
          'thursday': 4, 'friday': 5, 'saturday': 6
        };
        const dayNum = dayMap[scheduledDay.toLowerCase()] || 5; // Default to Friday
        const [hour, minute] = scheduledTime.split(':');
        cronExpression = `${minute} ${hour} * * ${dayNum}`;
        break;
        
      case 'biweekly':
        // We'll use the same as weekly but will check dates in the actual execution
        const biDay = dayMap[scheduledDay.toLowerCase()] || 5;
        const [biHour, biMinute] = scheduledTime.split(':');
        cronExpression = `${biMinute} ${biHour} * * ${biDay}`;
        break;
        
      case 'monthly':
        // For monthly, scheduledDay should be date of month (1-31)
        const dayOfMonth = parseInt(scheduledDay) || 1;
        const [monthHour, monthMinute] = scheduledTime.split(':');
        cronExpression = `${monthMinute} ${monthHour} ${dayOfMonth} * *`;
        break;
        
      default:
        // Custom - direct cron expression
        cronExpression = options.cronExpression || '0 15 * * 5'; // Default: Fridays at 3pm
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO retro_configs 
         (guildId, channelId, frequency, scheduledDay, scheduledTime, timezone, cronExpression, createdBy)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [guildId, channelId, frequency, scheduledDay, scheduledTime, timezone, cronExpression, createdBy],
        function(err) {
          if (err) return reject(err);
          
          const configId = this.lastID;
          
          // Get the created config
          this.db.get(
            'SELECT * FROM retro_configs WHERE id = ?',
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
   * Start a new retrospective session
   * @param {number} configId - Retrospective config ID
   */
  async startRetroSession(configId) {
    try {
      // Get the config
      const config = await this.getRetroConfig(configId);
      if (!config) {
        console.error(`Retrospective config ${configId} not found`);
        return;
      }

      // For biweekly, check if we should run this week
      if (config.frequency.toLowerCase() === 'biweekly') {
        const lastRunDate = config.lastRun ? new Date(config.lastRun * 1000) : null;
        const today = new Date();
        
        if (lastRunDate) {
          const diffTime = Math.abs(today - lastRunDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          // If less than 13 days since last run, skip (allows for some flexibility)
          if (diffDays < 13) {
            console.log(`Skipping biweekly retro ${configId}, only ${diffDays} days since last run`);
            return;
          }
        }
      }

      // Get the channel
      const channel = await this.client.channels.fetch(config.channelId).catch(console.error);
      if (!channel) {
        console.error(`Channel ${config.channelId} not found for retrospective ${configId}`);
        return;
      }

      // Create a new session
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7); // Default to 1 week period
      
      const sessionId = await this.createRetroSession(
        configId, 
        `Retrospective - ${startDate.toISOString().split('T')[0]}`,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Send the retrospective prompt
      const embed = new EmbedBuilder()
        .setColor('#9B59B6') // Purple for retros
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
          new ButtonBuilder()
            .setCustomId(`retro_respond_${sessionId}`)
            .setLabel('Submit Feedback')
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`retro_anon_${sessionId}`)
            .setLabel('Submit Anonymously')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`retro_view_${sessionId}`)
            .setLabel('View Feedback')
            .setStyle(ButtonStyle.Secondary)
        );

      await channel.send({ embeds: [embed], components: [row] });
      
      // Update the config's lastRun time
      await this.updateLastRunTime(configId);
      
    } catch (error) {
      console.error(`Error starting retrospective session for config ${configId}:`, error);
    }
  }

  /**
   * Create a new retrospective session
   * @param {number} configId - Config ID
   * @param {string} title - Session title
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<number>} - Session ID
   */
  async createRetroSession(configId, title, startDate, endDate) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO retro_sessions (configId, title, startDate, endDate)
         VALUES (?, ?, ?, ?)`,
        [configId, title, startDate, endDate],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Get a retrospective config
   * @param {number} configId - Config ID
   * @returns {Promise<Object>} - Config object
   */
  async getRetroConfig(configId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM retro_configs WHERE id = ?',
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
        'UPDATE retro_configs SET lastRun = ? WHERE id = ?',
        [now, configId],
        function(err) {
          if (err) return reject(err);
          resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Save a user's retrospective response
   * @param {number} sessionId - Session ID
   * @param {string} userId - User ID
   * @param {string} userTag - User tag
   * @param {Object} data - Response data
   * @param {boolean} anonymous - Whether the response is anonymous
   * @returns {Promise<number>} - Response ID
   */
  async saveRetroResponse(sessionId, userId, userTag, data, anonymous = false) {
    const { wentWell, wentPoorly, actionItems } = data;
    
    return new Promise((resolve, reject) => {
      // Check if user already responded
      this.db.get(
        'SELECT id FROM retro_responses WHERE sessionId = ? AND userId = ?',
        [sessionId, userId],
        (err, row) => {
          if (err) return reject(err);
          
          if (row) {
            // Update existing response
            this.db.run(
              `UPDATE retro_responses 
               SET wentWell = ?, wentPoorly = ?, actionItems = ?, anonymous = ?, 
               submittedAt = cast(strftime('%s', 'now') as int)
               WHERE id = ?`,
              [wentWell, wentPoorly, actionItems, anonymous ? 1 : 0, row.id],
              function(err) {
                if (err) return reject(err);
                resolve(row.id);
              }
            );
          } else {
            // Create new response
            this.db.run(
              `INSERT INTO retro_responses 
               (sessionId, userId, userTag, wentWell, wentPoorly, actionItems, anonymous)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [sessionId, userId, userTag, wentWell, wentPoorly, actionItems, anonymous ? 1 : 0],
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
   * Get responses for a retrospective session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Array>} - Array of responses
   */
  async getRetroResponses(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT * FROM retro_responses WHERE sessionId = ? ORDER BY submittedAt ASC',
        [sessionId],
        (err, rows) => {
          if (err) return reject(err);
          
          // Anonymize responses if requested
          const responses = rows.map(row => {
            if (row.anonymous) {
              return {
                ...row,
                userId: 'anonymous',
                userTag: 'Anonymous User'
              };
            }
            return row;
          });
          
          resolve(responses || []);
        }
      );
    });
  }

  /**
   * Generate a summary for a retrospective session
   * @param {number} sessionId - Session ID
   * @returns {Promise<string>} - Summary text
   */
  async generateRetroSummary(sessionId) {
    try {
      const responses = await this.getRetroResponses(sessionId);
      
      if (responses.length === 0) {
        return "No responses for this retrospective session.";
      }
      
      // Get session info
      const session = await this.getRetroSession(sessionId);
      const config = session ? await this.getRetroConfig(session.configId) : null;
      
      let summary = `# Retrospective Summary - ${session.title}\n\n`;
      summary += `## 📅 Period: ${session.startDate} to ${session.endDate}\n\n`;
      summary += `## 👥 Participants: ${responses.length}\n\n`;
      
      // What went well
      summary += `## ✅ What Went Well\n\n`;
      for (const response of responses) {
        if (response.wentWell && response.wentWell.trim() !== '') {
          summary += `- **${response.userTag}**: ${response.wentWell}\n`;
        }
      }
      
      // What could be improved
      summary += `\n## 🔄 What Could Be Improved\n\n`;
      for (const response of responses) {
        if (response.wentPoorly && response.wentPoorly.trim() !== '') {
          summary += `- **${response.userTag}**: ${response.wentPoorly}\n`;
        }
      }
      
      // Action items
      summary += `\n## 📋 Action Items\n\n`;
      let hasActionItems = false;
      for (const response of responses) {
        if (response.actionItems && response.actionItems.trim() !== '') {
          summary += `- **${response.userTag}**: ${response.actionItems}\n`;
          hasActionItems = true;
        }
      }
      
      if (!hasActionItems) {
        summary += "No action items were submitted.\n";
      }
      
      // Final notes
      summary += `\n## 📊 Summary\n\n`;
      summary += `This retrospective had ${responses.length} participants. `;
      
      if (hasActionItems) {
        summary += `Action items have been identified and should be assigned and tracked.`;
      } else {
        summary += `No specific action items were identified.`;
      }
      
      return summary;
    } catch (error) {
      console.error(`Error generating retrospective summary for session ${sessionId}:`, error);
      return "Error generating summary.";
    }
  }

  /**
   * Get a retrospective session
   * @param {number} sessionId - Session ID
   * @returns {Promise<Object>} - Session object
   */
  async getRetroSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM retro_sessions WHERE id = ?',
        [sessionId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Handle retrospective interaction (button click)
   * @param {Interaction} interaction - Discord interaction
   */
  async handleRetroInteraction(interaction) {
    if (!interaction.isButton()) return;
    
    const customId = interaction.customId;
    
    if (customId.startsWith('retro_respond_') || customId.startsWith('retro_anon_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      const isAnonymous = customId.startsWith('retro_anon_');
      
      // Create a modal for retrospective response
      const modal = {
        title: "Retrospective Feedback",
        custom_id: `retro_modal_${sessionId}_${isAnonymous ? 'anon' : 'named'}`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "wentWell",
                label: "What went well?",
                style: 2,
                min_length: 5,
                max_length: 1000,
                placeholder: "I really liked how...",
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "wentPoorly",
                label: "What could have gone better?",
                style: 2,
                min_length: 5,
                max_length: 1000,
                placeholder: "I think we struggled with...",
                required: true
              }
            ]
          },
          {
            type: 1,
            components: [
              {
                type: 4,
                custom_id: "actionItems",
                label: "What actions should we take?",
                style: 2,
                min_length: 0,
                max_length: 1000,
                placeholder: "We should...",
                required: false
              }
            ]
          }
        ]
      };
      
      await interaction.showModal(modal);
      
    } else if (customId.startsWith('retro_view_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      
      try {
        const responses = await this.getRetroResponses(sessionId);
        const session = await this.getRetroSession(sessionId);
        
        if (!session) {
          return interaction.reply({ content: "This retrospective session no longer exists.", ephemeral: true });
        }
        
        if (responses.length === 0) {
          return interaction.reply({ content: "No responses for this retrospective session yet.", ephemeral: true });
        }
        
        // Create an embed for the responses summary
        const embed = new EmbedBuilder()
          .setColor('#9B59B6')
          .setTitle(`Retrospective Responses - ${session.title}`)
          .setDescription(`${responses.length} team members have provided feedback so far.`);
        
        // Add a field for what went well (up to 5)
        embed.addFields({ 
          name: '✅ What Went Well', 
          value: responses.slice(0, 5).map(r => 
            `**${r.userTag}**: ${r.wentWell.substring(0, 80)}${r.wentWell.length > 80 ? '...' : ''}`
          ).join('\n') || 'No feedback yet'
        });
        
        // Add a field for action items (up to 5)
        const actionItems = responses
          .filter(r => r.actionItems && r.actionItems.trim() !== '')
          .slice(0, 5);
          
        if (actionItems.length > 0) {
          embed.addFields({ 
            name: '📋 Action Items', 
            value: actionItems.map(r => 
              `**${r.userTag}**: ${r.actionItems.substring(0, 80)}${r.actionItems.length > 80 ? '...' : ''}`
            ).join('\n') 
          });
        }
        
        if (responses.length > 5) {
          embed.setFooter({ text: `+ ${responses.length - 5} more responses. View full summary for details.` });
        }
        
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId(`retro_summary_${sessionId}`)
              .setLabel('View Full Summary')
              .setStyle(ButtonStyle.Primary)
          );
        
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
        
      } catch (error) {
        console.error('Error viewing retrospective responses:', error);
        await interaction.reply({ content: "There was an error retrieving the retrospective responses.", ephemeral: true });
      }
    } else if (customId.startsWith('retro_summary_')) {
      const sessionId = parseInt(customId.split('_')[2]);
      
      try {
        const summary = await this.generateRetroSummary(sessionId);
        
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
          await interaction.reply({ content: "Here's the full retrospective summary:", ephemeral: true });
        }
        
      } catch (error) {
        console.error('Error generating retrospective summary:', error);
        await interaction.reply({ content: "There was an error generating the retrospective summary.", ephemeral: true });
      }
    }
  }

  /**
   * Handle retrospective modal submission
   * @param {Interaction} interaction - Discord interaction
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
      
      try {
        await this.saveRetroResponse(
          sessionId, 
          interaction.user.id, 
          interaction.user.tag, 
          { wentWell, wentPoorly, actionItems },
          isAnonymous
        );
        
        let responseMessage = "Thanks for your retrospective feedback! 🎉";
        if (isAnonymous) {
          responseMessage += " Your response has been recorded anonymously.";
        }
        
        await interaction.reply({ content: responseMessage, ephemeral: true });
        
        // Try to update the original message with current count
        try {
          const responses = await this.getRetroResponses(sessionId);
          const originalMessage = interaction.message;
          
          if (originalMessage && responses.length > 0) {
            const embed = originalMessage.embeds[0];
            if (embed) {
              const newEmbed = EmbedBuilder.from(embed)
                .setDescription(`It's time for our retrospective!\nPlease share your thoughts on our recent work by clicking the button below.\n\n**Responses so far:** ${responses.length}`);
              
              await originalMessage.edit({ embeds: [newEmbed] });
            }
          }
        } catch (err) {
          console.error('Error updating retrospective message:', err);
          // Non-critical, just continue
        }
        
      } catch (error) {
        console.error('Error saving retrospective response:', error);
        await interaction.reply({ 
          content: "There was an error saving your retrospective feedback. Please try again.", 
          ephemeral: true 
        });
      }
    }
  }
}

module.exports = RetroManager;
