/**
 * Guild Notification Service
 * Handles sending notifications to guild members for events, tasks, and reminders
 */
class GuildNotificationService {
  constructor(client, guildManager) {
    this.client = client;
    this.guildManager = guildManager;
  }

  /**
   * Send a notification to all guild members
   * @param {number} guildId - Guild ID
   * @param {Object} embed - Discord embed object to send
   * @param {string} [channelId] - Optional channel ID to send to (if provided)
   * @returns {Promise<Object>} - Results of notification attempt
   */
  async notifyAllMembers(guildId, embed, channelId = null) {
    const results = {
      success: 0,
      failed: 0,
      channelSent: false,
      errors: [],
    };

    try {
      // Get guild info
      const guild = await this.guildManager.getGuildById(guildId);
      if (!guild) {
        throw new Error(`Guild not found: ${guildId}`);
      }

      // Get all guild members
      const members = await this.guildManager.getGuildMembers(guildId);
      if (!members || members.length === 0) {
        throw new Error(`No members found for guild: ${guildId}`);
      }

      // Add guild info to embed footer
      if (!embed.footer) {
        embed.footer = { text: `Guild: ${guild.name}` };
      } else {
        embed.footer.text = `Guild: ${guild.name} | ${embed.footer.text}`;
      }

      // If channel ID provided, try to send there first
      if (channelId) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel && channel.isTextBased()) {
            await channel.send({ embeds: [embed] });
            results.channelSent = true;
          }
        } catch (error) {
          console.error("Error sending to channel:", error);
          results.errors.push({
            type: "channel",
            id: channelId,
            error: error.message,
          });
        }
      }

      // Send DM to each member
      for (const member of members) {
        try {
          // Fetch Discord user
          const user = await this.client.users.fetch(member.userId);

          // Skip if bot
          if (user.bot) continue;

          // Send DM
          await user.send({ embeds: [embed] });
          results.success++;
        } catch (error) {
          console.error(`Error sending to user ${member.userId}:`, error);
          results.failed++;
          results.errors.push({
            type: "user",
            id: member.userId,
            error: error.message,
          });
        }
      }

      return results;
    } catch (error) {
      console.error("Error in guild notification:", error);
      throw error;
    }
  }

  /**
   * Send a reminder notification for a guild task
   * @param {Object} reminder - Reminder object
   * @returns {Promise<Object>} - Results of notification attempt
   */
  async sendReminderNotification(reminder) {
    if (!reminder.guildId) {
      throw new Error("Not a guild reminder");
    }

    // Get guild info
    const guild = await this.guildManager.getGuildById(reminder.guildId);

    // Create embed
    const embed = {
      color: 0xf39c12,
      title: `📝 Guild Task Reminder`,
      description: reminder.content,
      fields: [
        {
          name: "Guild",
          value: guild.name,
          inline: true,
        },
        {
          name: "Due",
          value: reminder.dueTime
            ? new Date(reminder.dueTime * 1000).toLocaleString()
            : "No specific time",
          inline: true,
        },
        {
          name: "Mark as Done",
          value: `Say "complete guild task ${reminder.id}"`,
        },
      ],
      footer: {
        text: "Guild reminder",
      },
    };

    // Send notification
    return this.notifyAllMembers(reminder.guildId, embed, reminder.channelId);
  }

  /**
   * Send a welcome notification to a new guild member
   * @param {number} guildId - Guild ID
   * @param {string} userId - User ID of new member
   * @returns {Promise<boolean>} - Success status
   */
  async sendWelcomeNotification(guildId, userId) {
    try {
      // Get guild info
      const guild = await this.guildManager.getGuildById(guildId);
      if (!guild) return false;

      // Get guild members
      const members = await this.guildManager.getGuildMembers(guildId);
      const memberCount = members.length;

      // Create embed
      const embed = {
        color: 0x2ecc71,
        title: `Welcome to ${guild.name}!`,
        description: `<@${userId}> has joined the guild!`,
        fields: [
          {
            name: "Members",
            value: `${memberCount} ${memberCount === 1 ? "member" : "members"} in total`,
            inline: true,
          },
          {
            name: "Get Started",
            value:
              'Say "show guild tasks" to see active tasks\nSay "show guild members" to see who\'s in the guild',
          },
        ],
        footer: {
          text: "Guild notification",
        },
      };

      // Send to all guild members except the new one
      for (const member of members) {
        if (member.userId === userId) continue;

        try {
          const user = await this.client.users.fetch(member.userId);
          if (user.bot) continue;

          await user.send({ embeds: [embed] });
        } catch (error) {
          console.error("Error sending welcome notification:", error);
        }
      }

      return true;
    } catch (error) {
      console.error("Error sending welcome notification:", error);
      return false;
    }
  }

  /**
   * Send a notification about a new invite to a guild
   * @param {Object} invite - Invite object
   * @returns {Promise<boolean>} - Success status
   */
  async sendInviteNotification(invite) {
    try {
      // Get guild info
      const guild = await this.guildManager.getGuildById(invite.guildId);
      if (!guild) return false;

      // Get inviter user
      let inviterName = "A guild member";
      try {
        const inviter = await this.client.users.fetch(invite.inviterId);
        inviterName = inviter.username;
      } catch (error) {
        console.error("Error fetching inviter:", error);
      }

      // Create embed
      const embed = {
        color: 0x3498db,
        title: `Guild Invitation: ${guild.name}`,
        description: `${inviterName} has invited you to join their guild!`,
        fields: [
          {
            name: "Guild",
            value: guild.name,
            inline: true,
          },
          {
            name: "How to Accept",
            value: `Say "accept guild invite from ${guild.name}" to join!`,
            inline: false,
          },
        ],
        footer: {
          text: "Guild invitation",
        },
      };

      if (guild.description) {
        embed.fields.push({
          name: "Description",
          value: guild.description,
          inline: false,
        });
      }

      // Send to invitee
      const invitee = await this.client.users.fetch(invite.inviteeId);
      await invitee.send({ embeds: [embed] });

      return true;
    } catch (error) {
      console.error("Error sending invite notification:", error);
      return false;
    }
  }

  /**
   * Process due guild reminders
   * @returns {Promise<Array>} - Processed reminders
   */
  async processDueGuildReminders() {
    try {
      // Get current time
      const now = Math.floor(Date.now() / 1000);

      // Get all due guild reminders
      const dueReminders = await this.guildManager.getGuildReminders();

      // Filter for due reminders
      const processingReminders = dueReminders.filter(
        (r) => r.dueTime && r.dueTime <= now && r.status === "pending",
      );

      // Process each reminder
      const processed = [];
      for (const reminder of processingReminders) {
        try {
          // Send notification
          await this.sendReminderNotification(reminder);
          processed.push(reminder);
        } catch (error) {
          console.error("Error processing guild reminder:", error);
        }
      }

      return processed;
    } catch (error) {
      console.error("Error processing guild reminders:", error);
      return [];
    }
  }
}

export default GuildNotificationService;
