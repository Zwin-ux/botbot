
import { analytics } from "../utils/analytics.js";
import { cache } from "../utils/cache.js";
import { alerting } from "../utils/alerting.js";
import { adminTools } from "../utils/adminTools.js";
import { aiFeatures } from "../utils/aiFeatures.js";
import { dashboardAnalytics } from "../utils/dashboardAnalytics.js";
import { integrationService } from "../services/integrationService.js";
import { webhookService } from "../services/webhookService.js";
import { advancedGames } from "../features/games/advancedGames.js";
import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

/**
 * Advanced Handler for all new enterprise features
 * Integrates AI, analytics, admin tools, games, and integrations
 */
class AdvancedHandler {
  constructor() {
    this.commandHandlers = new Map();
    this.buttonHandlers = new Map();
    this.modalHandlers = new Map();

    this.initializeHandlers();
  }

  /**
   * Initialize all command and interaction handlers
   */
  initializeHandlers() {
    // Admin commands
    this.commandHandlers.set("admin", this.handleAdminCommand.bind(this));
    this.commandHandlers.set(
      "moderation",
      this.handleModerationCommand.bind(this),
    );
    this.commandHandlers.set(
      "analytics",
      this.handleAnalyticsCommand.bind(this),
    );
    this.commandHandlers.set(
      "dashboard",
      this.handleDashboardCommand.bind(this),
    );

    // AI commands
    this.commandHandlers.set("ai", this.handleAICommand.bind(this));

    // Integration commands (placeholder for future implementation)
    // this.commandHandlers.set('integration', this.handleIntegrationCommand.bind(this));
    // this.commandHandlers.set('webhook', this.handleWebhookCommand.bind(this));

    // Advanced game commands
    this.commandHandlers.set(
      "battle-royale",
      this.handleBattleRoyaleCommand.bind(this),
    );
    this.commandHandlers.set(
      "trivia-tournament",
      this.handleTriviaTournamentCommand.bind(this),
    );
    this.commandHandlers.set("ai-chess", this.handleAIChessCommand.bind(this));
    this.commandHandlers.set(
      "word-chain",
      this.handleWordChainCommand.bind(this),
    );
    this.commandHandlers.set(
      "story-builder",
      this.handleStoryBuilderCommand.bind(this),
    );

    // System commands
    this.commandHandlers.set("health", this.handleHealthCommand.bind(this));
    this.commandHandlers.set(
      "performance",
      this.handlePerformanceCommand.bind(this),
    );

    // Button handlers
    this.initializeButtonHandlers();
  }

  /**
   * Initialize button interaction handlers
   */
  initializeButtonHandlers() {
    // Game buttons
    this.buttonHandlers.set(
      /^join_br_/,
      this.handleJoinBattleRoyale.bind(this),
    );
    this.buttonHandlers.set(
      /^start_br_/,
      this.handleStartBattleRoyale.bind(this),
    );
    // this.buttonHandlers.set(/^join_trivia_/, this.handleJoinTrivia.bind(this));
    // this.buttonHandlers.set(/^start_trivia_/, this.handleStartTrivia.bind(this));
    // this.buttonHandlers.set(/^chess_/, this.handleChessButton.bind(this));
    // this.buttonHandlers.set(/^join_story_/, this.handleJoinStory.bind(this));
    // this.buttonHandlers.set(/^add_sentence_/, this.handleAddSentence.bind(this));

    // Admin buttons (placeholder for future implementation)
    // this.buttonHandlers.set(/^admin_/, this.handleAdminButton.bind(this));
    // this.buttonHandlers.set(/^alert_/, this.handleAlertButton.bind(this));

    // Dashboard buttons (placeholder for future implementation)
    // this.buttonHandlers.set(/^dashboard_/, this.handleDashboardButton.bind(this));
  }

  /**
   * Handle incoming messages
   */
  async handleMessage(message) {
    if (message.author.bot) return;

    const startTime = Date.now();

    try {
      // AI-powered content analysis
      await this.performAIAnalysis(message);

      // Auto-moderation
      if (message.guild) {
        await this.performAutoModeration(message);
      }

      // Check for commands
      const content = message.content.toLowerCase().trim();

      // Handle natural language commands
      if (await this.handleNaturalLanguageCommand(message, content)) {
        return;
      }

      // Handle explicit commands
      for (const [command, handler] of this.commandHandlers.entries()) {
        if (content.startsWith(command) || content.includes(command)) {
          await handler(message, content);
          break;
        }
      }

      const duration = Date.now() - startTime;
      if (performance && performance.recordMetric) {
        performance.recordMetric("advanced_message_processing_time", duration);
      }
    } catch (error) {
      console.error("Error in advanced message handler:", error);
      analytics.trackEvent("advanced_handler_error", {
        error: error.message,
        messageId: message.id,
        guildId: message.guild?.id,
      });
    }
  }

  /**
   * Perform AI analysis on message
   */
  async performAIAnalysis(message) {
    try {
      // Sentiment analysis
      const sentiment = await aiFeatures.analyzeSentiment(
        message.content,
        message.author.id,
      );

      // Generate smart suggestions if needed
      if (sentiment.sentiment === "negative" || message.content.includes("?")) {
        const suggestions = await aiFeatures.generateSmartSuggestions(
          message.content,
          message.author.id,
          message.channel.id,
          { sentiment },
        );

        // Store suggestions for potential use
        cache.set(`suggestions:${message.id}`, suggestions, 300); // 5 minutes
      }
    } catch (error) {
      console.error("AI analysis error:", error);
    }
  }

  /**
   * Perform auto-moderation
   */
  async performAutoModeration(message) {
    try {
      await adminTools.processAutoModeration(message);
    } catch (error) {
      console.error("Auto-moderation error:", error);
    }
  }

  /**
   * Handle natural language commands
   */
  async handleNaturalLanguageCommand(message, content) {
    // Check for natural language patterns
    if (content.includes("show me") && content.includes("dashboard")) {
      await this.handleDashboardCommand(message, "dashboard system_overview");
      return true;
    }

    if (content.includes("start") && content.includes("game")) {
      const embed = new EmbedBuilder()
        .setTitle("🎮 Available Games")
        .setDescription("Choose a game to start:")
        .setColor(0x9b59b6)
        .addFields(
          {
            name: "⚔️ Battle Royale",
            value: "Multiplayer survival game",
            inline: true,
          },
          {
            name: "🧠 Trivia Tournament",
            value: "Knowledge competition",
            inline: true,
          },
          { name: "♟️ AI Chess", value: "Play chess against AI", inline: true },
          {
            name: "🔗 Word Chain",
            value: "Word association game",
            inline: true,
          },
          {
            name: "📚 Story Builder",
            value: "Collaborative storytelling",
            inline: true,
          },
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("start_battle_royale")
          .setLabel("Battle Royale")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("⚔️"),
        new ButtonBuilder()
          .setCustomId("start_trivia")
          .setLabel("Trivia")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🧠"),
        new ButtonBuilder()
          .setCustomId("start_chess")
          .setLabel("Chess")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("♟️"),
      );

      await message.reply({ embeds: [embed], components: [row] });
      return true;
    }

    return false;
  }

  /**
   * Handle button interactions
   */
  async handleButtonInteraction(interaction) {
    const customId = interaction.customId;

    for (const [pattern, handler] of this.buttonHandlers.entries()) {
      if (
        pattern instanceof RegExp
          ? pattern.test(customId)
          : customId.startsWith(pattern)
      ) {
        try {
          await handler(interaction);
          return;
        } catch (error) {
          console.error(`Button handler error for ${customId}:`, error);
          await interaction.reply({
            content: "❌ An error occurred while processing your request.",
            ephemeral: true,
          });
        }
      }
    }
  }

  /**
   * Handle admin commands
   */
  async handleAdminCommand(message, content) {
    const member = message.guild?.members.cache.get(message.author.id);
    if (!member || !adminTools.hasAdminPermission(member)) {
      await message.reply(
        "❌ You need administrator permissions to use this command.",
      );
      return;
    }

    const args = content.split(" ").slice(1);
    const subcommand = args[0];

    switch (subcommand) {
      case "stats":
        await this.showAdminStats(message);
        break;
      case "backup":
        await this.createServerBackup(message);
        break;
      case "health":
        await this.showSystemHealth(message);
        break;
      default:
        await this.showAdminHelp(message);
    }
  }

  /**
   * Handle moderation commands
   */
  async handleModerationCommand(message, content) {
    const member = message.guild?.members.cache.get(message.author.id);
    if (!member || !adminTools.hasModeratorPermission(member)) {
      await message.reply(
        "❌ You need moderator permissions to use this command.",
      );
      return;
    }

    const args = content.split(" ").slice(1);
    const action = args[0];
    const targetId = args[1];

    if (!targetId) {
      await message.reply("❌ Please specify a user ID or mention.");
      return;
    }

    const targetMember = message.guild.members.cache.get(
      targetId.replace(/[<@!>]/g, ""),
    );
    if (!targetMember) {
      await message.reply("❌ User not found.");
      return;
    }

    const reason = args.slice(2).join(" ") || "No reason provided";

    try {
      switch (action) {
        case "warn":
          await adminTools.warnUser(
            message.guild.id,
            targetMember.id,
            message.author.id,
            reason,
            message.channel,
          );
          break;
        case "timeout":
          const duration = 300000; // 5 minutes default
          await adminTools.timeoutUser(
            message.guild.id,
            targetMember,
            message.author.id,
            duration,
            reason,
            message.channel,
          );
          break;
        case "kick":
          await adminTools.kickUser(
            message.guild.id,
            targetMember,
            message.author.id,
            reason,
            message.channel,
          );
          break;
        case "ban":
          await adminTools.banUser(
            message.guild.id,
            targetMember,
            message.author.id,
            reason,
            1,
            message.channel,
          );
          break;
        default:
          await message.reply(
            "❌ Invalid moderation action. Use: warn, timeout, kick, or ban",
          );
      }
    } catch (error) {
      await message.reply(`❌ Moderation action failed: ${error.message}`);
    }
  }

  /**
   * Handle analytics commands
   */
  async handleAnalyticsCommand(message, content) {
    const args = content.split(" ").slice(1);
    const type = args[0] || "overview";

    try {
      const analyticsData = analytics.getMetrics();

      const embed = new EmbedBuilder()
        .setTitle("📊 Analytics Overview")
        .setColor(0x3498db)
        .addFields(
          {
            name: "Active Users",
            value: (analyticsData.activeUsers || 0).toString(),
            inline: true,
          },
          {
            name: "Total Commands",
            value: (analyticsData.totalCommands || 0).toString(),
            inline: true,
          },
          {
            name: "Success Rate",
            value: `${Math.round((analyticsData.successRate || 0) * 100)}%`,
            inline: true,
          },
          {
            name: "Avg Response Time",
            value: `${Math.round(analyticsData.avgResponseTime || 0)}ms`,
            inline: true,
          },
          {
            name: "Cache Hit Rate",
            value: `${Math.round((cache.getStats().hitRate || 0) * 100)}%`,
            inline: true,
          },
          {
            name: "Uptime",
            value: `${Math.round(process.uptime() / 3600)}h`,
            inline: true,
          },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply("❌ Failed to retrieve analytics data.");
    }
  }

  /**
   * Handle dashboard commands
   */
  async handleDashboardCommand(message, content) {
    const args = content.split(" ").slice(1);
    const dashboardId = args[0] || "system_overview";

    try {
      const embed =
        await dashboardAnalytics.generateDashboardEmbed(dashboardId);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`dashboard_refresh_${dashboardId}`)
          .setLabel("Refresh")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🔄"),
        new ButtonBuilder()
          .setCustomId("dashboard_list")
          .setLabel("All Dashboards")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📊"),
      );

      await message.reply({ embeds: [embed], components: [row] });
    } catch (error) {
      await message.reply(`❌ Failed to load dashboard: ${error.message}`);
    }
  }

  /**
   * Handle AI commands
   */
  async handleAICommand(message, content) {
    const args = content.split(" ").slice(1);
    const action = args[0];
    const text = args.slice(1).join(" ");

    if (!text) {
      await message.reply("❌ Please provide text to analyze.");
      return;
    }

    try {
      switch (action) {
        case "sentiment":
          const sentiment = await aiFeatures.analyzeSentiment(
            text,
            message.author.id,
          );
          const embed = new EmbedBuilder()
            .setTitle("🤖 Sentiment Analysis")
            .setColor(
              sentiment.sentiment === "positive"
                ? 0x2ecc71
                : sentiment.sentiment === "negative"
                  ? 0xe74c3c
                  : 0x95a5a6,
            )
            .addFields(
              { name: "Sentiment", value: sentiment.sentiment, inline: true },
              {
                name: "Confidence",
                value: `${Math.round(sentiment.confidence * 100)}%`,
                inline: true,
              },
              {
                name: "Emotion",
                value: sentiment.advanced.emotion,
                inline: true,
              },
            );
          await message.reply({ embeds: [embed] });
          break;

        case "moderate":
          const moderation = await aiFeatures.moderateContent(
            text,
            message.author.id,
            message.channel.id,
          );
          const moderationEmbed = new EmbedBuilder()
            .setTitle("🛡️ Content Moderation")
            .setColor(moderation.flagged ? 0xe74c3c : 0x2ecc71)
            .addFields(
              {
                name: "Status",
                value: moderation.flagged ? "Flagged" : "Clean",
                inline: true,
              },
              { name: "Severity", value: moderation.severity, inline: true },
              {
                name: "Confidence",
                value: `${Math.round(moderation.confidence * 100)}%`,
                inline: true,
              },
            );

          if (moderation.flagged) {
            moderationEmbed.addFields({
              name: "Issues Found",
              value: moderation.reasons.join("\n") || "None specified",
            });
          }

          await message.reply({ embeds: [moderationEmbed] });
          break;

        default:
          await message.reply("❌ Invalid AI action. Use: sentiment, moderate");
      }
    } catch (error) {
      await message.reply(`❌ AI analysis failed: ${error.message}`);
    }
  }

  /**
   * Handle battle royale game
   */
  async handleBattleRoyaleCommand(message, content) {
    try {
      const gameId = await advancedGames.startBattleRoyale(message.channel, [
        message.author,
      ]);
      analytics.trackEvent("battle_royale_started", {
        gameId,
        initiator: message.author.id,
        channelId: message.channel.id,
      });
    } catch (error) {
      await message.reply(`❌ Failed to start Battle Royale: ${error.message}`);
    }
  }

  /**
   * Handle trivia tournament
   */
  async handleTriviaTournamentCommand(message, content) {
    const args = content.split(" ").slice(1);
    const category = args[0] || "general";

    try {
      const tournamentId = await advancedGames.startTriviaTournament(
        message.channel,
        category,
      );
      analytics.trackEvent("trivia_tournament_started", {
        tournamentId,
        category,
        initiator: message.author.id,
        channelId: message.channel.id,
      });
    } catch (error) {
      await message.reply(
        `❌ Failed to start Trivia Tournament: ${error.message}`,
      );
    }
  }

  /**
   * Handle AI chess game
   */
  async handleAIChessCommand(message, content) {
    const args = content.split(" ").slice(1);
    const difficulty = args[0] || "medium";

    try {
      const gameId = await advancedGames.startAIChess(
        message.channel,
        message.author,
        difficulty,
      );
      analytics.trackEvent("ai_chess_started", {
        gameId,
        difficulty,
        player: message.author.id,
        channelId: message.channel.id,
      });
    } catch (error) {
      await message.reply(`❌ Failed to start AI Chess: ${error.message}`);
    }
  }

  /**
   * Handle word chain game
   */
  async handleWordChainCommand(message, content) {
    try {
      const gameId = await advancedGames.startWordChain(message.channel);
      analytics.trackEvent("word_chain_started", {
        gameId,
        initiator: message.author.id,
        channelId: message.channel.id,
      });
    } catch (error) {
      await message.reply(`❌ Failed to start Word Chain: ${error.message}`);
    }
  }

  /**
   * Handle story builder game
   */
  async handleStoryBuilderCommand(message, content) {
    const args = content.split(" ").slice(1);
    const theme = args[0] || "adventure";

    try {
      const gameId = await advancedGames.startStoryBuilder(
        message.channel,
        theme,
      );
      analytics.trackEvent("story_builder_started", {
        gameId,
        theme,
        initiator: message.author.id,
        channelId: message.channel.id,
      });
    } catch (error) {
      await message.reply(`❌ Failed to start Story Builder: ${error.message}`);
    }
  }

  /**
   * Handle health command
   */
  async handleHealthCommand(message, content) {
    try {
      const healthStatus = alerting.getHealthStatus();

      const embed = new EmbedBuilder()
        .setTitle("🏥 System Health")
        .setColor(healthStatus.overall ? 0x2ecc71 : 0xe74c3c)
        .addFields(
          {
            name: "Overall Status",
            value: healthStatus.overall ? "✅ Healthy" : "❌ Issues Detected",
            inline: true,
          },
          {
            name: "Active Alerts",
            value: healthStatus.activeAlerts.toString(),
            inline: true,
          },
          {
            name: "Health Checks",
            value: `${healthStatus.healthChecks.filter((hc) => hc.isHealthy).length}/${healthStatus.healthChecks.length}`,
            inline: true,
          },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply("❌ Failed to retrieve health status.");
    }
  }

  /**
   * Handle performance command
   */
  async handlePerformanceCommand(message, content) {
    try {
      const metrics = performance.getMetrics();
      const memUsage = process.memoryUsage();

      const embed = new EmbedBuilder()
        .setTitle("⚡ Performance Metrics")
        .setColor(0x3498db)
        .addFields(
          {
            name: "Avg Response Time",
            value: `${Math.round(metrics.avgResponseTime || 0)}ms`,
            inline: true,
          },
          {
            name: "Memory Usage",
            value: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            inline: true,
          },
          {
            name: "Uptime",
            value: `${Math.round(process.uptime() / 3600)}h`,
            inline: true,
          },
          {
            name: "Request Count",
            value: (metrics.requestCount || 0).toString(),
            inline: true,
          },
          {
            name: "Error Rate",
            value: `${Math.round((metrics.errorRate || 0) * 100)}%`,
            inline: true,
          },
          {
            name: "Cache Hit Rate",
            value: `${Math.round((cache.getStats().hitRate || 0) * 100)}%`,
            inline: true,
          },
        )
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      await message.reply("❌ Failed to retrieve performance metrics.");
    }
  }

  /**
   * Handle join battle royale button
   */
  async handleJoinBattleRoyale(interaction) {
    const gameId = interaction.customId.split("_")[2];
    // Implementation would join the user to the battle royale
    await interaction.reply({
      content: "⚔️ You joined the Battle Royale!",
      ephemeral: true,
    });
  }

  /**
   * Handle start battle royale button
   */
  async handleStartBattleRoyale(interaction) {
    const gameId = interaction.customId.split("_")[2];
    // Implementation would start the battle royale
    await interaction.reply({
      content: "🚀 Battle Royale starting!",
      ephemeral: true,
    });
  }

  /**
   * Show admin statistics
   */
  async showAdminStats(message) {
    const stats = adminTools.getAdminStats(message.guild.id);

    const embed = new EmbedBuilder()
      .setTitle("👑 Admin Statistics")
      .setColor(0xe74c3c)
      .addFields(
        {
          name: "Total Actions",
          value: stats.totalActions.toString(),
          inline: true,
        },
        {
          name: "Recent Actions",
          value: stats.recentActions.toString(),
          inline: true,
        },
        {
          name: "Active Warnings",
          value: stats.activeWarnings.toString(),
          inline: true,
        },
        {
          name: "Auto-Mod Rules",
          value: stats.autoModRules.toString(),
          inline: true,
        },
        {
          name: "Active Timeouts",
          value: stats.activeTimeouts.toString(),
          inline: true,
        },
      )
      .setTimestamp();

    await message.reply({ embeds: [embed] });
  }

  /**
   * Create server backup
   */
  async createServerBackup(message) {
    try {
      const backupId = await adminTools.createServerBackup(
        message.guild,
        message.author.id,
      );
      await message.reply(
        `✅ Server backup created successfully! Backup ID: \`${backupId}\``,
      );
    } catch (error) {
      await message.reply(`❌ Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Show system health
   */
  async showSystemHealth(message) {
    const healthStatus = alerting.getHealthStatus();

    const embed = new EmbedBuilder()
      .setTitle("🏥 System Health Status")
      .setColor(healthStatus.overall ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        healthStatus.overall
          ? "All systems operational"
          : "System issues detected",
      )
      .addFields(
        {
          name: "Overall Status",
          value: healthStatus.overall ? "✅ Healthy" : "❌ Unhealthy",
          inline: true,
        },
        {
          name: "Active Alerts",
          value: healthStatus.activeAlerts.toString(),
          inline: true,
        },
        {
          name: "Last Updated",
          value: healthStatus.lastUpdated.toISOString(),
          inline: true,
        },
      );

    // Add health check details
    for (const healthCheck of healthStatus.healthChecks.slice(0, 5)) {
      embed.addFields({
        name: healthCheck.name,
        value: healthCheck.isHealthy
          ? "✅ Healthy"
          : `❌ ${healthCheck.consecutiveFailures} failures`,
        inline: true,
      });
    }

    await message.reply({ embeds: [embed] });
  }

  /**
   * Show admin help
   */
  async showAdminHelp(message) {
    const embed = new EmbedBuilder()
      .setTitle("👑 Admin Commands")
      .setColor(0x3498db)
      .addFields(
        { name: "admin stats", value: "Show admin statistics", inline: false },
        { name: "admin backup", value: "Create server backup", inline: false },
        { name: "admin health", value: "Show system health", inline: false },
        {
          name: "moderation warn @user reason",
          value: "Warn a user",
          inline: false,
        },
        {
          name: "moderation timeout @user reason",
          value: "Timeout a user",
          inline: false,
        },
        {
          name: "moderation kick @user reason",
          value: "Kick a user",
          inline: false,
        },
        {
          name: "moderation ban @user reason",
          value: "Ban a user",
          inline: false,
        },
      );

    await message.reply({ embeds: [embed] });
  }
}

export const advancedHandler = new AdvancedHandler();
