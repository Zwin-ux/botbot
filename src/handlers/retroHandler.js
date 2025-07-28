/**
 * Handler for retrospective-related commands
 */
const { EmbedBuilder } = require("discord.js");

class RetroHandler {
  constructor(client, retroManager) {
    this.client = client;
    this.retroManager = retroManager;
    this.commands = {
      setup: this.setupRetro.bind(this),
      list: this.listRetros.bind(this),
      start: this.startRetro.bind(this),
      cancel: this.cancelRetro.bind(this),
      summary: this.getRetroSummary.bind(this),
    };
  }

  /**
   * Process retro commands
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async processRetroCommand(message, args) {
    if (!args.length) {
      return this.showRetroHelp(message);
    }

    const subCommand = args[0].toLowerCase();
    const handler = this.commands[subCommand];

    if (handler) {
      await handler(message, args.slice(1));
    } else {
      await this.showRetroHelp(message);
    }
  }

  /**
   * Show help for retro commands
   * @param {Message} message - Discord message
   */
  async showRetroHelp(message) {
    const embed = new EmbedBuilder()
      .setColor("#9B59B6")
      .setTitle("Retrospective Commands Help")
      .setDescription("Manage team retrospectives to reflect on your work")
      .addFields(
        {
          name: "!retro setup <frequency> <channel> <day> <time>",
          value: "Set up a recurring retrospective (weekly, biweekly, monthly)",
        },
        { name: "!retro list", value: "List all active retrospectives" },
        {
          name: "!retro start",
          value: "Start a new retrospective session manually",
        },
        { name: "!retro cancel <id>", value: "Cancel an active retrospective" },
        {
          name: "!retro summary <id>",
          value: "Get the summary of a completed retrospective",
        },
      )
      .setFooter({
        text: "Example: !retro setup weekly #team-channel friday 15:00",
      });

    await message.reply({ embeds: [embed] });
  }

  /**
   * Set up a new retrospective
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async setupRetro(message, args) {
    if (args.length < 3) {
      return message.reply(
        "Usage: !retro setup <frequency> <channel> <day> <time> [timezone]",
      );
    }

    const frequency = args[0].toLowerCase(); // weekly, biweekly, monthly

    // Parse channel
    let channel;
    if (args[1].startsWith("<#") && args[1].endsWith(">")) {
      const channelId = args[1].slice(2, -1);
      channel = message.guild.channels.cache.get(channelId);
    } else {
      channel = message.guild.channels.cache.find(
        (ch) => ch.name === args[1].replace("#", ""),
      );
    }

    if (!channel) {
      return message.reply(`Unable to find channel ${args[1]}`);
    }

    // Parse day and time
    const day = args[2]; // Monday, 1st, etc.
    const time = args[3] || "15:00"; // Default to 3 PM
    const timezone = args[4] || "UTC"; // Default to UTC

    try {
      const config = await this.retroManager.createRetroConfig({
        guildId: message.guild.id,
        channelId: channel.id,
        frequency,
        scheduledDay: day,
        scheduledTime: time,
        timezone,
        createdBy: message.author.id,
      });

      this.retroManager.scheduleRetrospective(config);

      const embed = new EmbedBuilder()
        .setColor("#9B59B6")
        .setTitle("Retrospective Scheduled")
        .setDescription(`A ${frequency} retrospective has been scheduled!`)
        .addFields(
          { name: "Channel", value: channel.toString() },
          { name: "Schedule", value: `${day} at ${time} ${timezone}` },
          { name: "Next Session", value: "Will be automatically scheduled" },
        );

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error setting up retrospective:", error);
      await message.reply(
        "There was an error setting up the retrospective. Please try again.",
      );
    }
  }

  /**
   * List all active retrospectives
   * @param {Message} message - Discord message
   */
  async listRetros(message) {
    try {
      const retros = await new Promise((resolve, reject) => {
        this.retroManager.db.all(
          "SELECT * FROM retro_configs WHERE guildId = ? AND active = 1",
          [message.guild.id],
          (err, rows) => {
            if (err) return reject(err);
            resolve(rows || []);
          },
        );
      });

      if (!retros.length) {
        return message.reply("No active retrospectives found.");
      }

      const embed = new EmbedBuilder()
        .setColor("#9B59B6")
        .setTitle("Active Retrospectives")
        .setDescription(
          `${retros.length} active retrospective(s) for this server:`,
        );

      for (const retro of retros) {
        const channel = message.guild.channels.cache.get(retro.channelId);
        const channelName = channel ? channel.toString() : "Unknown channel";

        embed.addFields({
          name: `Retro #${retro.id}`,
          value: `**Frequency:** ${retro.frequency}\n**Channel:** ${channelName}\n**Schedule:** ${retro.scheduledDay} at ${retro.scheduledTime} ${retro.timezone}`,
        });
      }

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error("Error listing retrospectives:", error);
      await message.reply(
        "There was an error retrieving the retrospectives. Please try again.",
      );
    }
  }

  /**
   * Start a new retrospective session manually
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async startRetro(message, args) {
    try {
      let configId;

      if (args.length) {
        configId = parseInt(args[0]);
      } else {
        // Find the first active retro for this guild
        const config = await new Promise((resolve, reject) => {
          this.retroManager.db.get(
            "SELECT id FROM retro_configs WHERE guildId = ? AND active = 1 LIMIT 1",
            [message.guild.id],
            (err, row) => {
              if (err) return reject(err);
              resolve(row);
            },
          );
        });

        if (!config) {
          // Friendly suggestion with setup button
          const { getSetupSuggestion } = require("../features/setupSuggest");
          const { embed, row } = getSetupSuggestion("retro");
          return message.reply({ embeds: [embed], components: [row] });
        }

        configId = config.id;
      }

      await this.retroManager.startRetroSession(configId);
      await message.reply(
        "Retrospective session started! Check the configured channel for the prompt.",
      );
    } catch (error) {
      console.error("Error starting retrospective:", error);
      await message.reply(
        "There was an error starting the retrospective. Please try again.",
      );
    }
  }

  /**
   * Cancel an active retrospective session
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async cancelRetro(message, args) {
    if (!args.length) {
      return message.reply(
        "Please specify the retrospective session ID to cancel.",
      );
    }

    const sessionId = parseInt(args[0]);

    try {
      const session = await this.retroManager.getRetroSession(sessionId);

      if (!session) {
        return message.reply(`Retrospective session #${sessionId} not found.`);
      }

      // Check if user is admin or the creator of the retro
      const config = await this.retroManager.getRetroConfig(session.configId);

      if (
        message.author.id !== config.createdBy &&
        !message.member.permissions.has("ADMINISTRATOR")
      ) {
        return message.reply(
          "You don't have permission to cancel this retrospective.",
        );
      }

      // Cancel the retro
      await new Promise((resolve, reject) => {
        this.retroManager.db.run(
          "UPDATE retro_sessions SET status = \"cancelled\", completedAt = cast(strftime('%s', 'now') as int) WHERE id = ?",
          [sessionId],
          function (err) {
            if (err) return reject(err);
            resolve(this.changes > 0);
          },
        );
      });

      await message.reply(
        `Retrospective session #${sessionId} has been cancelled.`,
      );
    } catch (error) {
      console.error("Error cancelling retrospective:", error);
      await message.reply(
        "There was an error cancelling the retrospective. Please try again.",
      );
    }
  }

  /**
   * Get a summary of a completed retrospective
   * @param {Message} message - Discord message
   * @param {Array} args - Command arguments
   */
  async getRetroSummary(message, args) {
    if (!args.length) {
      return message.reply(
        "Please specify the retrospective session ID to get the summary for.",
      );
    }

    const sessionId = parseInt(args[0]);

    try {
      const summary = await this.retroManager.generateRetroSummary(sessionId);

      // Split summary if needed (Discord has a 2000 character limit)
      const maxChunkSize = 1900; // Leave some room for formatting

      if (summary.length <= maxChunkSize) {
        await message.reply(summary);
      } else {
        // Split by paragraphs to avoid cutting in the middle of text
        const paragraphs = summary.split("\n\n");
        let currentChunk = "";

        await message.reply("Here's the retrospective summary:");

        for (const paragraph of paragraphs) {
          if (currentChunk.length + paragraph.length + 2 > maxChunkSize) {
            // Send current chunk
            await message.channel.send(currentChunk);
            currentChunk = paragraph + "\n\n";
          } else {
            currentChunk += paragraph + "\n\n";
          }
        }

        // Send any remaining content
        if (currentChunk.trim().length > 0) {
          await message.channel.send(currentChunk);
        }
      }
    } catch (error) {
      console.error("Error getting retrospective summary:", error);
      await message.reply(
        "There was an error retrieving the retrospective summary. Please try again.",
      );
    }
  }
}

module.exports = RetroHandler;
