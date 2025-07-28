/**
 * Intelligent help system for BotBot
 * Provides contextual, adaptive help based on user behavior and context
 */

import { EmbedBuilder } from "discord.js";
import { analytics } from "./analytics.js";
import { userCache } from "./cache.js";

class SmartHelpSystem {
  constructor() {
    this.helpTopics = new Map();
    this.userProfiles = new Map();
    this.contextualTips = new Map();
    this.initializeHelpTopics();
  }

  /**
   * Initialize help topics and content
   */
  initializeHelpTopics() {
    // Basic help topics
    this.helpTopics.set("getting-started", {
      title: "🚀 Getting Started with BotBot",
      description:
        "Welcome! I'm BotBot, your friendly team productivity assistant.",
      content: [
        "**Natural Conversation**: Just talk to me naturally - no complex commands needed!",
        '**Wake Words**: Say "hey bot", mention me, or just say "bot" to get my attention',
        '**Reminders**: "remind me to finish the report tomorrow at 3pm"',
        "**Team Features**: I can help with standups, retrospectives, and team games",
        "**Smart Responses**: I learn from context and provide relevant help",
      ],
      examples: [
        "hey bot, remind me to call the client in 2 hours",
        "bot, what can you help me with?",
        "start a team standup",
        "let's play a game",
      ],
      relatedTopics: ["reminders", "games", "team-features"],
    });

    this.helpTopics.set("reminders", {
      title: "⏰ Smart Reminders",
      description: "I can help you remember important tasks and deadlines.",
      content: [
        "**Natural Language**: Tell me when you want to be reminded in plain English",
        '**Flexible Timing**: "in 30 minutes", "tomorrow at 9am", "next Friday"',
        "**Interactive**: Use buttons to mark done, snooze, or delete reminders",
        "**Categories**: Organize reminders by project or priority",
        "**Recurring**: Set up daily, weekly, or custom recurring reminders",
      ],
      examples: [
        "remind me to submit the proposal by Friday",
        "todo: review the code changes",
        "don't let me forget the meeting at 2pm",
        "set a reminder for the deadline next week",
      ],
      relatedTopics: ["getting-started", "team-features"],
    });

    this.helpTopics.set("games", {
      title: "🎮 Interactive Team Games",
      description: "Fun games to build team spirit and break the ice.",
      content: [
        "**Emoji Race**: Be the first to react with the correct emoji sequence",
        "**Story Builder**: Collaborate to create hilarious stories together",
        "**Who Said It**: Guess who said famous quotes or team quotes",
        "**Fair Play**: Built-in cooldowns and rate limiting for balanced gameplay",
        "**Team Building**: Perfect for remote teams and ice breakers",
      ],
      examples: [
        "start emoji race",
        "let's play story builder",
        "begin who said it game",
        "show me available games",
      ],
      relatedTopics: ["getting-started", "team-features"],
    });

    this.helpTopics.set("team-features", {
      title: "👥 Team Productivity Tools",
      description:
        "Powerful features to enhance team collaboration and productivity.",
      content: [
        "**Daily Standups**: Automated standup prompts and summary generation",
        "**Retrospectives**: Structured retro sessions with anonymous feedback",
        "**Team Reminders**: Share reminders and tasks across the team",
        "**Progress Tracking**: Monitor team goals and milestones",
        "**Analytics**: Understand team productivity patterns",
      ],
      examples: [
        "setup standup in #team-channel at 9am",
        "schedule retro weekly on Fridays",
        "show team productivity stats",
        "create a team reminder for the deadline",
      ],
      relatedTopics: ["getting-started", "reminders"],
    });

    this.helpTopics.set("advanced", {
      title: "🔧 Advanced Features",
      description: "Power user features and customization options.",
      content: [
        "**Multi-language**: Support for English, French, Japanese, and Spanish",
        "**Custom Categories**: Create and manage custom reminder categories",
        "**Analytics Dashboard**: Detailed usage and performance metrics",
        "**Rate Limiting**: Smart throttling to ensure fair usage",
        "**Performance Monitoring**: Real-time performance insights",
      ],
      examples: [
        "switch to French language",
        'create category "urgent" with 🚨 emoji',
        "show analytics report",
        "display performance stats",
      ],
      relatedTopics: ["getting-started", "team-features"],
    });
  }

  /**
   * Get contextual help based on user's situation
   * @param {Object} context - Context information
   * @returns {Object} Help response
   */
  getContextualHelp(context = {}) {
    const { userId, channelType, recentCommands, errorCount, isNewUser } =
      context;

    // Track user interaction
    if (userId) {
      analytics.trackEvent("help_requested", { userId, channelType });
      this.updateUserProfile(userId, context);
    }

    // Determine best help topic based on context
    let recommendedTopic = this.determineRecommendedTopic(context);

    // Get the help content
    const helpContent = this.helpTopics.get(recommendedTopic);
    if (!helpContent) {
      recommendedTopic = "getting-started";
    }

    return {
      topic: recommendedTopic,
      embed: this.createHelpEmbed(recommendedTopic, context),
      followUp: this.getFollowUpSuggestions(recommendedTopic, context),
    };
  }

  /**
   * Determine the most relevant help topic
   * @param {Object} context - Context information
   * @returns {string} Recommended topic
   */
  determineRecommendedTopic(context) {
    const { isNewUser, recentCommands, errorCount, channelType } = context;

    // New users get getting started
    if (isNewUser) {
      return "getting-started";
    }

    // Users with errors get basic help
    if (errorCount > 2) {
      return "getting-started";
    }

    // Analyze recent commands
    if (recentCommands) {
      if (
        recentCommands.includes("remind") ||
        recentCommands.includes("todo")
      ) {
        return "reminders";
      }
      if (recentCommands.includes("game") || recentCommands.includes("play")) {
        return "games";
      }
      if (
        recentCommands.includes("standup") ||
        recentCommands.includes("retro")
      ) {
        return "team-features";
      }
    }

    // DM users might want personal features
    if (channelType === "DM") {
      return "reminders";
    }

    // Default to getting started
    return "getting-started";
  }

  /**
   * Create help embed
   * @param {string} topic - Help topic
   * @param {Object} context - Context information
   * @returns {EmbedBuilder} Discord embed
   */
  createHelpEmbed(topic, context) {
    const helpContent =
      this.helpTopics.get(topic) || this.helpTopics.get("getting-started");

    const embed = new EmbedBuilder()
      .setTitle(helpContent.title)
      .setDescription(helpContent.description)
      .setColor("#0099ff")
      .setTimestamp();

    // Add main content
    if (helpContent.content) {
      embed.addFields({
        name: "✨ Features",
        value: helpContent.content.join("\n"),
        inline: false,
      });
    }

    // Add examples
    if (helpContent.examples) {
      embed.addFields({
        name: "💡 Examples",
        value: helpContent.examples.map((ex) => `\`${ex}\``).join("\n"),
        inline: false,
      });
    }

    // Add personalized tips
    const personalizedTip = this.getPersonalizedTip(context);
    if (personalizedTip) {
      embed.addFields({
        name: "🎯 Tip for You",
        value: personalizedTip,
        inline: false,
      });
    }

    // Add related topics
    if (helpContent.relatedTopics) {
      embed.addFields({
        name: "🔗 Related Topics",
        value: helpContent.relatedTopics.map((t) => `\`${t}\``).join(" • "),
        inline: false,
      });
    }

    return embed;
  }

  /**
   * Get personalized tip based on user profile
   * @param {Object} context - Context information
   * @returns {string|null} Personalized tip
   */
  getPersonalizedTip(context) {
    const { userId, recentCommands, errorCount } = context;

    if (!userId) return null;

    const profile = this.userProfiles.get(userId);
    if (!profile) return null;

    // Tip based on usage patterns
    if (profile.commandCount > 10 && !profile.hasUsedAdvanced) {
      return '💡 You\'re getting the hang of it! Try saying "show advanced features" to unlock more powerful tools.';
    }

    if (profile.reminderCount > 5 && !profile.hasUsedCategories) {
      return '📂 Pro tip: You can organize your reminders with categories! Try "create category work with 💼 emoji".';
    }

    if (profile.gameCount === 0 && profile.commandCount > 3) {
      return '🎮 Take a break! Try starting a team game with "start emoji race" - it\'s fun and builds team spirit.';
    }

    if (errorCount > 1) {
      return '🤔 Having trouble? Try speaking more naturally - I understand phrases like "remind me to..." better than commands.';
    }

    return null;
  }

  /**
   * Get follow-up suggestions
   * @param {string} topic - Current topic
   * @param {Object} context - Context information
   * @returns {Array} Follow-up suggestions
   */
  getFollowUpSuggestions(topic, context) {
    const suggestions = [];

    if (topic === "getting-started") {
      suggestions.push(
        'Try: "hey bot, remind me to check emails in 1 hour"',
        'Ask: "what games can we play?"',
        'Say: "help with team features"',
      );
    } else if (topic === "reminders") {
      suggestions.push(
        'Try: "remind me to call John tomorrow at 2pm"',
        'Ask: "show my reminders"',
        'Say: "create category urgent"',
      );
    } else if (topic === "games") {
      suggestions.push(
        'Try: "start emoji race"',
        'Ask: "what\'s the most popular game?"',
        'Say: "show game statistics"',
      );
    }

    return suggestions;
  }

  /**
   * Update user profile for personalization
   * @param {string} userId - User ID
   * @param {Object} context - Context information
   */
  updateUserProfile(userId, context) {
    let profile = this.userProfiles.get(userId) || {
      firstSeen: Date.now(),
      commandCount: 0,
      reminderCount: 0,
      gameCount: 0,
      helpRequests: 0,
      hasUsedAdvanced: false,
      hasUsedCategories: false,
      preferredLanguage: "en",
    };

    profile.helpRequests++;
    profile.lastSeen = Date.now();

    // Update based on recent commands
    if (context.recentCommands) {
      profile.commandCount += context.recentCommands.length;

      if (context.recentCommands.some((cmd) => cmd.includes("remind"))) {
        profile.reminderCount++;
      }

      if (context.recentCommands.some((cmd) => cmd.includes("game"))) {
        profile.gameCount++;
      }

      if (context.recentCommands.some((cmd) => cmd.includes("advanced"))) {
        profile.hasUsedAdvanced = true;
      }

      if (context.recentCommands.some((cmd) => cmd.includes("category"))) {
        profile.hasUsedCategories = true;
      }
    }

    this.userProfiles.set(userId, profile);

    // Cache for quick access
    userCache.set(`profile:${userId}`, profile, 30 * 60 * 1000); // 30 minutes
  }

  /**
   * Get help topic by name
   * @param {string} topicName - Topic name
   * @returns {Object|null} Help topic
   */
  getHelpTopic(topicName) {
    return this.helpTopics.get(topicName) || null;
  }

  /**
   * Search help topics
   * @param {string} query - Search query
   * @returns {Array} Matching topics
   */
  searchHelp(query) {
    const results = [];
    const searchTerm = query.toLowerCase();

    for (const [key, topic] of this.helpTopics) {
      const score = this.calculateRelevanceScore(topic, searchTerm);
      if (score > 0) {
        results.push({ key, topic, score });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate relevance score for search
   * @param {Object} topic - Help topic
   * @param {string} searchTerm - Search term
   * @returns {number} Relevance score
   */
  calculateRelevanceScore(topic, searchTerm) {
    let score = 0;

    // Title match (highest weight)
    if (topic.title.toLowerCase().includes(searchTerm)) {
      score += 10;
    }

    // Description match
    if (topic.description.toLowerCase().includes(searchTerm)) {
      score += 5;
    }

    // Content match
    if (topic.content) {
      for (const content of topic.content) {
        if (content.toLowerCase().includes(searchTerm)) {
          score += 2;
        }
      }
    }

    // Examples match
    if (topic.examples) {
      for (const example of topic.examples) {
        if (example.toLowerCase().includes(searchTerm)) {
          score += 3;
        }
      }
    }

    return score;
  }

  /**
   * Get usage statistics
   * @returns {Object} Help system statistics
   */
  getStats() {
    return {
      totalTopics: this.helpTopics.size,
      totalUsers: this.userProfiles.size,
      totalHelpRequests: Array.from(this.userProfiles.values()).reduce(
        (sum, profile) => sum + profile.helpRequests,
        0,
      ),
      averageHelpRequests:
        this.userProfiles.size > 0
          ? (
              Array.from(this.userProfiles.values()).reduce(
                (sum, profile) => sum + profile.helpRequests,
                0,
              ) / this.userProfiles.size
            ).toFixed(2)
          : 0,
    };
  }
}

// Global instance
const smartHelp = new SmartHelpSystem();

export { SmartHelpSystem, smartHelp };
