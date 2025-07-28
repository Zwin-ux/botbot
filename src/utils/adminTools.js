import { performance } from "./performance.js";
import { analytics } from "./analytics.js";
import { cache } from "./cache.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
} from "discord.js";

/**
 * Advanced Admin and Moderation Tools
 * Provides comprehensive server management, user moderation, and administrative features
 */
class AdminToolsManager {
  constructor() {
    this.moderationActions = new Map();
    this.autoModRules = new Map();
    this.userWarnings = new Map();
    this.serverSettings = new Map();
    this.auditLog = [];
    this.scheduledActions = new Map();

    this.initializeDefaultRules();
  }

  /**
   * Initialize default auto-moderation rules
   */
  initializeDefaultRules() {
    this.addAutoModRule("spam_detection", {
      type: "spam",
      enabled: true,
      threshold: 5,
      timeWindow: 10000, // 10 seconds
      action: "timeout",
      duration: 300000, // 5 minutes
      deleteMessages: true,
    });

    this.addAutoModRule("caps_filter", {
      type: "caps",
      enabled: true,
      threshold: 0.7, // 70% caps
      minLength: 10,
      action: "warn",
      deleteMessages: false,
    });

    this.addAutoModRule("link_filter", {
      type: "links",
      enabled: false,
      whitelist: ["discord.gg", "youtube.com", "github.com"],
      action: "delete",
      deleteMessages: true,
    });
  }

  /**
   * Check if user has admin permissions
   */
  hasAdminPermission(member) {
    return (
      member.permissions.has(PermissionFlagsBits.Administrator) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.ManageMessages)
    );
  }

  /**
   * Check if user has moderator permissions
   */
  hasModeratorPermission(member) {
    return (
      this.hasAdminPermission(member) ||
      member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
      member.permissions.has(PermissionFlagsBits.KickMembers)
    );
  }

  /**
   * Warn a user
   */
  async warnUser(guildId, userId, moderatorId, reason, channel = null) {
    const warningId = `warn_${Date.now()}_${userId}`;
    const warning = {
      id: warningId,
      guildId,
      userId,
      moderatorId,
      reason,
      timestamp: Date.now(),
      active: true,
    };

    // Store warning
    if (!this.userWarnings.has(userId)) {
      this.userWarnings.set(userId, []);
    }
    this.userWarnings.get(userId).push(warning);

    // Log action
    this.logModerationAction("warn", {
      targetUserId: userId,
      moderatorId,
      reason,
      warningId,
    });

    // Send notification if channel provided
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle("⚠️ User Warning")
        .setDescription(`<@${userId}> has been warned.`)
        .setColor(0xffa500)
        .addFields(
          { name: "Reason", value: reason, inline: false },
          { name: "Moderator", value: `<@${moderatorId}>`, inline: true },
          { name: "Warning ID", value: warningId, inline: true },
        )
        .setTimestamp();

      await channel.send({ embeds: [embed] });
    }

    // Check for escalation
    const userWarnings = this.userWarnings.get(userId);
    if (userWarnings.length >= 3) {
      await this.escalateUser(
        guildId,
        userId,
        moderatorId,
        "Multiple warnings",
      );
    }

    analytics.trackEvent("user_warned", {
      guildId,
      userId,
      moderatorId,
      warningCount: userWarnings.length,
    });

    return warningId;
  }

  /**
   * Timeout a user
   */
  async timeoutUser(
    guildId,
    member,
    moderatorId,
    duration,
    reason,
    channel = null,
  ) {
    try {
      await member.timeout(duration, reason);

      const actionId = `timeout_${Date.now()}_${member.id}`;
      this.moderationActions.set(actionId, {
        id: actionId,
        type: "timeout",
        guildId,
        userId: member.id,
        moderatorId,
        duration,
        reason,
        timestamp: Date.now(),
        expiresAt: Date.now() + duration,
      });

      // Log action
      this.logModerationAction("timeout", {
        targetUserId: member.id,
        moderatorId,
        duration,
        reason,
        actionId,
      });

      // Send notification
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle("⏰ User Timeout")
          .setDescription(`<@${member.id}> has been timed out.`)
          .setColor(0xff6b6b)
          .addFields(
            {
              name: "Duration",
              value: this.formatDuration(duration),
              inline: true,
            },
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: `<@${moderatorId}>`, inline: true },
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }

      analytics.trackEvent("user_timeout", {
        guildId,
        userId: member.id,
        moderatorId,
        duration,
      });

      return actionId;
    } catch (error) {
      throw new Error(`Failed to timeout user: ${error.message}`);
    }
  }

  /**
   * Kick a user
   */
  async kickUser(guildId, member, moderatorId, reason, channel = null) {
    try {
      await member.kick(reason);

      const actionId = `kick_${Date.now()}_${member.id}`;
      this.moderationActions.set(actionId, {
        id: actionId,
        type: "kick",
        guildId,
        userId: member.id,
        moderatorId,
        reason,
        timestamp: Date.now(),
      });

      // Log action
      this.logModerationAction("kick", {
        targetUserId: member.id,
        moderatorId,
        reason,
        actionId,
      });

      // Send notification
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle("👢 User Kicked")
          .setDescription(`<@${member.id}> has been kicked from the server.`)
          .setColor(0xff4757)
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: `<@${moderatorId}>`, inline: true },
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }

      analytics.trackEvent("user_kicked", {
        guildId,
        userId: member.id,
        moderatorId,
      });

      return actionId;
    } catch (error) {
      throw new Error(`Failed to kick user: ${error.message}`);
    }
  }

  /**
   * Ban a user
   */
  async banUser(
    guildId,
    member,
    moderatorId,
    reason,
    deleteMessageDays = 1,
    channel = null,
  ) {
    try {
      await member.ban({
        reason,
        deleteMessageDays,
      });

      const actionId = `ban_${Date.now()}_${member.id}`;
      this.moderationActions.set(actionId, {
        id: actionId,
        type: "ban",
        guildId,
        userId: member.id,
        moderatorId,
        reason,
        deleteMessageDays,
        timestamp: Date.now(),
      });

      // Log action
      this.logModerationAction("ban", {
        targetUserId: member.id,
        moderatorId,
        reason,
        deleteMessageDays,
        actionId,
      });

      // Send notification
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle("🔨 User Banned")
          .setDescription(`<@${member.id}> has been banned from the server.`)
          .setColor(0xff3838)
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: `<@${moderatorId}>`, inline: true },
            {
              name: "Messages Deleted",
              value: `${deleteMessageDays} day(s)`,
              inline: true,
            },
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }

      analytics.trackEvent("user_banned", {
        guildId,
        userId: member.id,
        moderatorId,
        deleteMessageDays,
      });

      return actionId;
    } catch (error) {
      throw new Error(`Failed to ban user: ${error.message}`);
    }
  }

  /**
   * Unban a user
   */
  async unbanUser(guild, userId, moderatorId, reason, channel = null) {
    try {
      await guild.members.unban(userId, reason);

      const actionId = `unban_${Date.now()}_${userId}`;
      this.moderationActions.set(actionId, {
        id: actionId,
        type: "unban",
        guildId: guild.id,
        userId,
        moderatorId,
        reason,
        timestamp: Date.now(),
      });

      // Log action
      this.logModerationAction("unban", {
        targetUserId: userId,
        moderatorId,
        reason,
        actionId,
      });

      // Send notification
      if (channel) {
        const embed = new EmbedBuilder()
          .setTitle("🔓 User Unbanned")
          .setDescription(`<@${userId}> has been unbanned.`)
          .setColor(0x2ecc71)
          .addFields(
            { name: "Reason", value: reason, inline: false },
            { name: "Moderator", value: `<@${moderatorId}>`, inline: true },
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      }

      analytics.trackEvent("user_unbanned", {
        guildId: guild.id,
        userId,
        moderatorId,
      });

      return actionId;
    } catch (error) {
      throw new Error(`Failed to unban user: ${error.message}`);
    }
  }

  /**
   * Mass delete messages
   */
  async massDeleteMessages(channel, count, moderatorId, filter = null) {
    try {
      let messages;

      if (filter) {
        // Fetch more messages to account for filtering
        const fetchedMessages = await channel.messages.fetch({
          limit: Math.min(count * 2, 100),
        });
        messages = fetchedMessages.filter(filter).first(count);
      } else {
        messages = await channel.messages.fetch({
          limit: Math.min(count, 100),
        });
      }

      const deletedMessages = await channel.bulkDelete(messages, true);

      // Log action
      this.logModerationAction("bulk_delete", {
        channelId: channel.id,
        moderatorId,
        messageCount: deletedMessages.size,
        hasFilter: !!filter,
      });

      analytics.trackEvent("messages_bulk_deleted", {
        channelId: channel.id,
        moderatorId,
        messageCount: deletedMessages.size,
      });

      return deletedMessages.size;
    } catch (error) {
      throw new Error(`Failed to delete messages: ${error.message}`);
    }
  }

  /**
   * Lock a channel
   */
  async lockChannel(
    channel,
    moderatorId,
    reason = "Channel locked by moderator",
  ) {
    try {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        SendMessages: false,
      });

      // Log action
      this.logModerationAction("channel_lock", {
        channelId: channel.id,
        moderatorId,
        reason,
      });

      const embed = new EmbedBuilder()
        .setTitle("🔒 Channel Locked")
        .setDescription(`This channel has been locked by <@${moderatorId}>`)
        .setColor(0xff6b6b)
        .addFields({ name: "Reason", value: reason })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      analytics.trackEvent("channel_locked", {
        channelId: channel.id,
        moderatorId,
      });
    } catch (error) {
      throw new Error(`Failed to lock channel: ${error.message}`);
    }
  }

  /**
   * Unlock a channel
   */
  async unlockChannel(
    channel,
    moderatorId,
    reason = "Channel unlocked by moderator",
  ) {
    try {
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone, {
        SendMessages: null,
      });

      // Log action
      this.logModerationAction("channel_unlock", {
        channelId: channel.id,
        moderatorId,
        reason,
      });

      const embed = new EmbedBuilder()
        .setTitle("🔓 Channel Unlocked")
        .setDescription(`This channel has been unlocked by <@${moderatorId}>`)
        .setColor(0x2ecc71)
        .addFields({ name: "Reason", value: reason })
        .setTimestamp();

      await channel.send({ embeds: [embed] });

      analytics.trackEvent("channel_unlocked", {
        channelId: channel.id,
        moderatorId,
      });
    } catch (error) {
      throw new Error(`Failed to unlock channel: ${error.message}`);
    }
  }

  /**
   * Create server backup
   */
  async createServerBackup(guild, moderatorId) {
    const startTime = Date.now();

    try {
      const backup = {
        id: `backup_${Date.now()}`,
        guildId: guild.id,
        guildName: guild.name,
        createdBy: moderatorId,
        timestamp: Date.now(),
        data: {
          channels: [],
          roles: [],
          settings: {},
          members: guild.memberCount,
        },
      };

      // Backup channels
      for (const channel of guild.channels.cache.values()) {
        backup.data.channels.push({
          id: channel.id,
          name: channel.name,
          type: channel.type,
          position: channel.position,
          permissions: channel.permissionOverwrites.cache.map((p) => ({
            id: p.id,
            type: p.type,
            allow: p.allow.bitfield.toString(),
            deny: p.deny.bitfield.toString(),
          })),
        });
      }

      // Backup roles
      for (const role of guild.roles.cache.values()) {
        if (role.id !== guild.id) {
          // Skip @everyone
          backup.data.roles.push({
            id: role.id,
            name: role.name,
            color: role.color,
            permissions: role.permissions.bitfield.toString(),
            position: role.position,
            mentionable: role.mentionable,
            hoist: role.hoist,
          });
        }
      }

      // Store backup (in a real implementation, this would be saved to database)
      cache.set(`backup:${backup.id}`, backup, 86400000); // 24 hours

      const duration = Date.now() - startTime;
      performance.recordMetric("server_backup_time", duration);

      // Log action
      this.logModerationAction("server_backup", {
        backupId: backup.id,
        moderatorId,
        channelCount: backup.data.channels.length,
        roleCount: backup.data.roles.length,
      });

      analytics.trackEvent("server_backup_created", {
        guildId: guild.id,
        moderatorId,
        backupId: backup.id,
        duration,
      });

      return backup.id;
    } catch (error) {
      throw new Error(`Failed to create server backup: ${error.message}`);
    }
  }

  /**
   * Get user moderation history
   */
  getUserModerationHistory(userId) {
    const warnings = this.userWarnings.get(userId) || [];
    const actions = Array.from(this.moderationActions.values()).filter(
      (action) => action.userId === userId,
    );

    return {
      warnings: warnings.filter((w) => w.active),
      actions: actions.sort((a, b) => b.timestamp - a.timestamp),
      totalWarnings: warnings.length,
      totalActions: actions.length,
    };
  }

  /**
   * Generate moderation report
   */
  generateModerationReport(guildId, timeframe = 86400000) {
    // 24 hours default
    const since = Date.now() - timeframe;
    const actions = this.auditLog.filter(
      (log) => log.guildId === guildId && log.timestamp >= since,
    );

    const report = {
      timeframe: timeframe,
      totalActions: actions.length,
      actionsByType: {},
      topModerators: {},
      topTargets: {},
      timeline: [],
    };

    // Analyze actions
    for (const action of actions) {
      // Count by type
      report.actionsByType[action.action] =
        (report.actionsByType[action.action] || 0) + 1;

      // Count by moderator
      if (action.data.moderatorId) {
        report.topModerators[action.data.moderatorId] =
          (report.topModerators[action.data.moderatorId] || 0) + 1;
      }

      // Count by target
      if (action.data.targetUserId) {
        report.topTargets[action.data.targetUserId] =
          (report.topTargets[action.data.targetUserId] || 0) + 1;
      }

      // Add to timeline
      report.timeline.push({
        timestamp: action.timestamp,
        action: action.action,
        moderator: action.data.moderatorId,
        target: action.data.targetUserId,
      });
    }

    // Sort timeline
    report.timeline.sort((a, b) => b.timestamp - a.timestamp);

    return report;
  }

  /**
   * Add auto-moderation rule
   */
  addAutoModRule(name, rule) {
    this.autoModRules.set(name, {
      ...rule,
      name,
      createdAt: Date.now(),
      triggeredCount: 0,
    });

    analytics.trackEvent("automod_rule_added", {
      name,
      type: rule.type,
    });
  }

  /**
   * Process auto-moderation
   */
  async processAutoModeration(message) {
    for (const [name, rule] of this.autoModRules.entries()) {
      if (!rule.enabled) continue;

      try {
        const violation = await this.checkAutoModRule(message, rule);
        if (violation) {
          await this.executeAutoModAction(message, rule, violation);
          rule.triggeredCount++;
        }
      } catch (error) {
        console.error(`Error in auto-mod rule ${name}:`, error);
      }
    }
  }

  /**
   * Check auto-moderation rule
   */
  async checkAutoModRule(message, rule) {
    switch (rule.type) {
      case "spam":
        return this.checkSpamRule(message, rule);
      case "caps":
        return this.checkCapsRule(message, rule);
      case "links":
        return this.checkLinksRule(message, rule);
      default:
        return null;
    }
  }

  /**
   * Check spam rule
   */
  checkSpamRule(message, rule) {
    const userId = message.author.id;
    const now = Date.now();

    // Get recent messages from this user
    const recentMessages = message.channel.messages.cache.filter(
      (m) =>
        m.author.id === userId && now - m.createdTimestamp <= rule.timeWindow,
    ).size;

    if (recentMessages >= rule.threshold) {
      return {
        type: "spam",
        count: recentMessages,
        threshold: rule.threshold,
      };
    }

    return null;
  }

  /**
   * Check caps rule
   */
  checkCapsRule(message, rule) {
    const content = message.content;
    if (content.length < rule.minLength) return null;

    const capsCount = (content.match(/[A-Z]/g) || []).length;
    const capsRatio = capsCount / content.length;

    if (capsRatio >= rule.threshold) {
      return {
        type: "caps",
        ratio: capsRatio,
        threshold: rule.threshold,
      };
    }

    return null;
  }

  /**
   * Check links rule
   */
  checkLinksRule(message, rule) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = message.content.match(urlRegex) || [];

    for (const url of urls) {
      const isWhitelisted = rule.whitelist.some((domain) =>
        url.includes(domain),
      );
      if (!isWhitelisted) {
        return {
          type: "links",
          url,
          whitelisted: false,
        };
      }
    }

    return null;
  }

  /**
   * Execute auto-moderation action
   */
  async executeAutoModAction(message, rule, violation) {
    const botMember = message.guild.members.me;

    try {
      switch (rule.action) {
        case "delete":
          if (rule.deleteMessages) {
            await message.delete();
          }
          break;

        case "warn":
          await this.warnUser(
            message.guild.id,
            message.author.id,
            botMember.id,
            `Auto-moderation: ${violation.type}`,
            message.channel,
          );
          if (rule.deleteMessages) {
            await message.delete();
          }
          break;

        case "timeout":
          const member = message.guild.members.cache.get(message.author.id);
          if (member) {
            await this.timeoutUser(
              message.guild.id,
              member,
              botMember.id,
              rule.duration,
              `Auto-moderation: ${violation.type}`,
              message.channel,
            );
          }
          if (rule.deleteMessages) {
            await message.delete();
          }
          break;
      }

      analytics.trackEvent("automod_action_executed", {
        rule: rule.name,
        action: rule.action,
        violationType: violation.type,
        userId: message.author.id,
        guildId: message.guild.id,
      });
    } catch (error) {
      console.error("Error executing auto-mod action:", error);
    }
  }

  /**
   * Escalate user (automatic action after multiple warnings)
   */
  async escalateUser(guildId, userId, moderatorId, reason) {
    // This would implement escalation logic
    // For now, just log it
    this.logModerationAction("escalation", {
      targetUserId: userId,
      moderatorId,
      reason,
    });

    analytics.trackEvent("user_escalated", {
      guildId,
      userId,
      moderatorId,
    });
  }

  /**
   * Log moderation action
   */
  logModerationAction(action, data) {
    const logEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action,
      data,
      timestamp: Date.now(),
      guildId: data.guildId || data.targetGuildId,
    };

    this.auditLog.push(logEntry);

    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }
  }

  /**
   * Format duration for display
   */
  formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Get admin statistics
   */
  getAdminStats(guildId) {
    const guildActions = this.auditLog.filter((log) => log.guildId === guildId);
    const recentActions = guildActions.filter(
      (log) => Date.now() - log.timestamp <= 86400000, // Last 24 hours
    );

    return {
      totalActions: guildActions.length,
      recentActions: recentActions.length,
      activeWarnings: Array.from(this.userWarnings.values())
        .flat()
        .filter((w) => w.active && w.guildId === guildId).length,
      autoModRules: this.autoModRules.size,
      activeTimeouts: Array.from(this.moderationActions.values()).filter(
        (a) =>
          a.type === "timeout" &&
          a.guildId === guildId &&
          a.expiresAt > Date.now(),
      ).length,
    };
  }
}

export const adminTools = new AdminToolsManager();
