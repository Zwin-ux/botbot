/**
 * Handler for standup-related commands
 */
const { EmbedBuilder } = require('discord.js');

class StandupHandler {
  constructor(client, standupManager) {
    this.client = client;
    this.standupManager = standupManager;
    this.commands = {
      setup: this.setupStandup.bind(this),
      list: this.listStandups.bind(this),
      start: this.startStandup.bind(this),
      summary: this.getStandupSummary.bind(this),
      help: this.showStandupHelp.bind(this)
    };
  }

  /**
   * Process standup commands
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async processStandupCommand(message, args) {
    if (!args.length) {
      return this.showStandupHelp(message);
    }

    const subCommand = args[0].toLowerCase();
    const handler = this.commands[subCommand];

    if (handler) {
      await handler(message, args.slice(1));
    } else {
      await this.showStandupHelp(message);
    }
  }

  /**
   * Show help for standup commands
   * @param {Message} message - Discord message
   */
  async showStandupHelp(message) {
    const embed = new EmbedBuilder()
      .setColor('#0099ff')
      .setTitle('Daily Standup Commands Help')
      .setDescription('Manage daily standup meetings for your team')
      .addFields(
        { name: '!standup setup <channel> <time> [timezone]', value: 'Set up a daily standup in the specified channel' },
        { name: '!standup list', value: 'List all active standups in this server' },
        { name: '!standup start [id]', value: 'Manually start a standup session' },
        { name: '!standup summary <id>', value: 'Get a summary of standup responses' }
      )
      .setFooter({ text: 'Example: !standup setup #team-channel 09:30 America/Los_Angeles' });

    await message.reply({ embeds: [embed] });
  }

  /**
   * Set up a new standup configuration
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async setupStandup(message, args) {
    if (args.length < 2) {
      return message.reply('Usage: !standup setup <channel> <time> [timezone]');
    }

    // Parse channel
    let channel;
    if (args[0].startsWith('<#') && args[0].endsWith('>')) {
      const channelId = args[0].slice(2, -1);
      channel = message.guild.channels.cache.get(channelId);
    } else {
      channel = message.guild.channels.cache.find(ch => ch.name === args[0].replace('#', ''));
    }
    
    if (!channel) {
      return message.reply(`Unable to find channel ${args[0]}`);
    }

    // Parse time
    const time = args[1]; // Format: HH:MM
    if (!/^\d{1,2}:\d{2}$/.test(time)) {
      return message.reply('Time must be in the format HH:MM, e.g., 09:30');
    }
    
    // Optional timezone
    const timezone = args[2] || 'UTC';

    try {
      const config = await this.standupManager.createStandupConfig({
        guildId: message.guild.id,
        channelId: channel.id,
        scheduledTime: time,
        timezone,
        createdBy: message.author.id
      });

      this.standupManager.scheduleStandup(config);

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Daily Standup Scheduled')
        .setDescription('A daily standup has been scheduled!')
        .addFields(
          { name: 'Channel', value: channel.toString() },
          { name: 'Time', value: `${time} ${timezone}` },
          { name: 'Schedule', value: 'Monday-Friday (workdays)' }
        );

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error setting up standup:', error);
      await message.reply('There was an error setting up the standup. Please try again.');
    }
  }

  /**
   * List all active standups
   * @param {Message} message - Discord message
   */
  async listStandups(message) {
    try {
      const standups = await new Promise((resolve, reject) => {
        this.standupManager.db.all(
          'SELECT * FROM standup_configs WHERE guildId = ? AND active = 1',
          [message.guild.id],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
          }
        );
      });

      if (!standups.length) {
        return message.reply('No active standups found.');
      }

      const embed = new EmbedBuilder()
        .setColor('#0099ff')
        .setTitle('Active Standups')
        .setDescription(`${standups.length} active standup(s) for this server:`);

      for (const standup of standups) {
        const channel = message.guild.channels.cache.get(standup.channelId);
        const channelName = channel ? channel.toString() : 'Unknown channel';
        
        embed.addFields({
          name: `Standup #${standup.id}`,
          value: `**Channel:** ${channelName}\n**Time:** ${standup.scheduledTime} ${standup.timezone}\n**Last Run:** ${standup.lastRun ? new Date(standup.lastRun * 1000).toLocaleString() : 'Never'}`
        });
      }

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error listing standups:', error);
      await message.reply('There was an error retrieving the standups. Please try again.');
    }
  }

  /**
   * Start a standup session manually
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async startStandup(message, args) {
    try {
      let configId;
      
      if (args.length) {
        configId = parseInt(args[0]);
      } else {
        // Find the first active standup for this guild
        const config = await new Promise((resolve, reject) => {
          this.standupManager.db.get(
            'SELECT id FROM standup_configs WHERE guildId = ? AND active = 1 LIMIT 1',
            [message.guild.id],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            }
          );
        });
        
        if (!config) {
          // Friendly suggestion with setup button
          const { getSetupSuggestion } = require('../features/setupSuggest');
          const { embed, row } = getSetupSuggestion('standup');
          return message.reply({ embeds: [embed], components: [row] });
        }
        
        configId = config.id;
      }
      
      await this.standupManager.startStandupSession(configId);
      await message.reply('Standup session started! Check the configured channel for the prompt.');
      
    } catch (error) {
      console.error('Error starting standup:', error);
      await message.reply('There was an error starting the standup. Please try again.');
    }
  }

  /**
   * Get a summary of standup responses
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async getStandupSummary(message, args) {
    if (!args.length) {
      return message.reply('Please specify the standup session ID to get the summary for.');
    }

    const sessionId = parseInt(args[0]);

    try {
      const summary = await this.standupManager.generateStandupSummary(sessionId);
      
      // Split summary if needed (Discord has a 2000 character limit)
      const maxChunkSize = 1900; // Leave some room for formatting
      
      if (summary.length <= maxChunkSize) {
        await message.reply(summary);
      } else {
        // Split by paragraphs to avoid cutting in the middle of text
        const paragraphs = summary.split('\n\n');
        let currentChunk = '';
        
        await message.reply("Here's the standup summary:");
        
        for (const paragraph of paragraphs) {
          if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
            // Send current chunk
            await message.channel.send(currentChunk);
            currentChunk = paragraph + '\n\n';
          } else {
            currentChunk += paragraph + '\n\n';
          }
        }
        
        // Send any remaining content
        if (currentChunk.trim().length > 0) {
          await message.channel.send(currentChunk);
        }
      }
      
    } catch (error) {
      console.error('Error getting standup summary:', error);
      await message.reply('There was an error retrieving the standup summary. Please try again.');
    }
  }
}

module.exports = StandupHandler;
