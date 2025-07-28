import { jest } from "@jest/globals";
import { advancedHandler } from "../src/handlers/advancedHandler.js";
import { integrationService } from "../src/services/integrationService.js";
import { webhookService } from "../src/services/webhookService.js";
import { advancedGames } from "../src/features/games/advancedGames.js";
import { adminTools } from "../src/utils/adminTools.js";
import { aiFeatures } from "../src/utils/aiFeatures.js";
import { dashboardAnalytics } from "../src/utils/dashboardAnalytics.js";
import { alerting } from "../src/utils/alerting.js";

// Mock Discord.js
const mockMessage = {
  author: { id: "user123", username: "testuser", bot: false },
  guild: { id: "guild123", members: { cache: new Map() } },
  channel: { id: "channel123", send: jest.fn(), type: 0 },
  content: "",
  reply: jest.fn(),
  id: "message123",
};

const mockInteraction = {
  customId: "test_button",
  reply: jest.fn(),
  user: { id: "user123", username: "testuser" },
  guild: { id: "guild123" },
  isButton: () => true,
  replied: false,
  deferred: false,
};

const mockMember = {
  id: "user123",
  permissions: {
    has: jest.fn(() => true),
  },
  timeout: jest.fn(),
  kick: jest.fn(),
  ban: jest.fn(),
};

describe("Advanced Features Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMessage.reply.mockResolvedValue({ id: "reply123" });
    mockInteraction.reply.mockResolvedValue();
  });

  describe("AI Features", () => {
    test("should analyze sentiment correctly", async () => {
      const result = await aiFeatures.analyzeSentiment(
        "I love this bot!",
        "user123",
      );

      expect(result).toHaveProperty("sentiment");
      expect(result).toHaveProperty("confidence");
      expect(result).toHaveProperty("advanced");
      expect(result.sentiment).toBe("positive");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("should moderate content appropriately", async () => {
      const result = await aiFeatures.moderateContent(
        "This is spam spam spam spam spam",
        "user123",
        "channel123",
      );

      expect(result).toHaveProperty("flagged");
      expect(result).toHaveProperty("flags");
      expect(result).toHaveProperty("severity");
      expect(result.flagged).toBe(true);
      expect(result.flags).toContain("spam");
    });

    test("should generate smart suggestions", async () => {
      const result = await aiFeatures.generateSmartSuggestions(
        "How do I start a game?",
        "user123",
        "channel123",
        { sentiment: { sentiment: "neutral" } },
      );

      expect(result).toHaveProperty("suggestions");
      expect(result).toHaveProperty("intent");
      expect(result.suggestions).toBeInstanceOf(Array);
      expect(result.intent.type).toBe("question");
    });
  });

  describe("Admin Tools", () => {
    test("should check admin permissions", () => {
      const hasPermission = adminTools.hasAdminPermission(mockMember);
      expect(hasPermission).toBe(true);
    });

    test("should warn user successfully", async () => {
      const warningId = await adminTools.warnUser(
        "guild123",
        "user123",
        "moderator123",
        "Test warning",
      );

      expect(warningId).toMatch(/^warn_/);

      const history = adminTools.getUserModerationHistory("user123");
      expect(history.warnings).toHaveLength(1);
      expect(history.warnings[0].reason).toBe("Test warning");
    });

    test("should timeout user successfully", async () => {
      const actionId = await adminTools.timeoutUser(
        "guild123",
        mockMember,
        "moderator123",
        300000,
        "Test timeout",
      );

      expect(actionId).toMatch(/^timeout_/);
      expect(mockMember.timeout).toHaveBeenCalledWith(300000, "Test timeout");
    });

    test("should process auto-moderation", async () => {
      const testMessage = {
        ...mockMessage,
        content: "SPAM SPAM SPAM SPAM SPAM",
        guild: {
          ...mockMessage.guild,
          members: {
            me: { id: "bot123" },
            cache: new Map([["user123", mockMember]]),
          },
        },
        delete: jest.fn(),
      };

      await adminTools.processAutoModeration(testMessage);

      // Should have triggered spam detection
      expect(testMessage.delete).toHaveBeenCalled();
    });
  });

  describe("Advanced Games", () => {
    test("should start battle royale game", async () => {
      const gameId = await advancedGames.startBattleRoyale(
        mockMessage.channel,
        [mockMessage.author],
      );

      expect(gameId).toMatch(/^br_/);
      expect(mockMessage.channel.send).toHaveBeenCalled();

      const stats = advancedGames.getGameStats(gameId);
      expect(stats).toHaveProperty("type", "battle_royale");
      expect(stats).toHaveProperty("participants", 1);
    });

    test("should start trivia tournament", async () => {
      const tournamentId = await advancedGames.startTriviaTournament(
        mockMessage.channel,
        "science",
      );

      expect(tournamentId).toMatch(/^trivia_/);
      expect(mockMessage.channel.send).toHaveBeenCalled();

      const stats = advancedGames.getGameStats(tournamentId);
      expect(stats).toHaveProperty("type", "trivia");
    });

    test("should start AI chess game", async () => {
      const gameId = await advancedGames.startAIChess(
        mockMessage.channel,
        mockMessage.author,
        "easy",
      );

      expect(gameId).toMatch(/^chess_/);
      expect(mockMessage.channel.send).toHaveBeenCalled();

      const stats = advancedGames.getGameStats(gameId);
      expect(stats).toHaveProperty("type", "ai_chess");
    });

    test("should start word chain game", async () => {
      const gameId = await advancedGames.startWordChain(mockMessage.channel);

      expect(gameId).toMatch(/^wordchain_/);
      expect(mockMessage.channel.send).toHaveBeenCalled();

      const stats = advancedGames.getGameStats(gameId);
      expect(stats).toHaveProperty("type", "word_chain");
    });

    test("should start story builder game", async () => {
      const gameId = await advancedGames.startStoryBuilder(
        mockMessage.channel,
        "fantasy",
      );

      expect(gameId).toMatch(/^story_/);
      expect(mockMessage.channel.send).toHaveBeenCalled();

      const stats = advancedGames.getGameStats(gameId);
      expect(stats).toHaveProperty("type", "story_builder");
    });
  });

  describe("Integration Service", () => {
    test("should register integration successfully", async () => {
      const integrationId = await integrationService.registerIntegration(
        "guild123",
        "slack",
        { token: "test-token" },
      );

      expect(integrationId).toMatch(/^guild123_slack$/);
    });

    test("should execute integration action", async () => {
      const integrationId = await integrationService.registerIntegration(
        "guild123",
        "slack",
        { token: "test-token" },
      );

      // Mock the API client
      const mockClient = {
        executeAction: jest.fn().mockResolvedValue({ success: true }),
      };
      integrationService.apiClients.set(integrationId, mockClient);

      const result = await integrationService.executeAction(
        integrationId,
        "send_message",
        { channel: "general", text: "Hello!" },
      );

      expect(result).toEqual({ success: true });
      expect(mockClient.executeAction).toHaveBeenCalledWith("send_message", {
        channel: "general",
        text: "Hello!",
      });
    });
  });

  describe("Webhook Service", () => {
    test("should register webhook successfully", async () => {
      const webhookId = await webhookService.registerWebhook(
        "guild123",
        "github",
        { secret: "test-secret" },
      );

      expect(webhookId).toMatch(/^[0-9a-f-]{36}$/); // UUID format
    });

    test("should process GitHub webhook", async () => {
      const webhookId = await webhookService.registerWebhook(
        "guild123",
        "github",
        { secret: "test-secret" },
      );

      const payload = {
        action: "opened",
        pull_request: {
          title: "Test PR",
          body: "Test description",
          html_url: "https://github.com/test/repo/pull/1",
          user: {
            login: "testuser",
            avatar_url: "https://github.com/testuser.png",
          },
          head: { ref: "feature-branch" },
        },
        repository: { name: "test-repo" },
      };

      const result = await webhookService.processWebhook(webhookId, payload);

      expect(result).toHaveProperty("messages");
      expect(result).toHaveProperty("processed", true);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].embeds[0].title).toBe("🔀 New Pull Request");
    });
  });

  describe("Dashboard Analytics", () => {
    test("should generate dashboard data", async () => {
      const data =
        await dashboardAnalytics.generateDashboardData("system_overview");

      expect(data).toBeInstanceOf(Map);
      expect(data.has("system_health")).toBe(true);
      expect(data.has("performance_metrics")).toBe(true);
      expect(data.has("memory_usage")).toBe(true);
    });

    test("should generate dashboard embed", async () => {
      const embed =
        await dashboardAnalytics.generateDashboardEmbed("system_overview");

      expect(embed).toHaveProperty("data");
      expect(embed.data.title).toBe("🖥️ System Overview");
      expect(embed.data.description).toBe(
        "Real-time system health and performance metrics",
      );
    });

    test("should get dashboard list", () => {
      const dashboards = dashboardAnalytics.getDashboardList();

      expect(dashboards).toBeInstanceOf(Array);
      expect(dashboards.length).toBeGreaterThan(0);
      expect(dashboards[0]).toHaveProperty("id");
      expect(dashboards[0]).toHaveProperty("title");
    });
  });

  describe("Alerting System", () => {
    test("should add alert rule", () => {
      alerting.addAlertRule("test_rule", {
        condition: (metrics) => metrics.testValue > 100,
        severity: "warning",
        message: "Test alert triggered",
        cooldown: 60000,
      });

      expect(alerting.alertRules.has("test_rule")).toBe(true);
    });

    test("should get health status", () => {
      const status = alerting.getHealthStatus();

      expect(status).toHaveProperty("overall");
      expect(status).toHaveProperty("healthChecks");
      expect(status).toHaveProperty("activeAlerts");
      expect(status).toHaveProperty("lastUpdated");
    });

    test("should get alert statistics", () => {
      const stats = alerting.getAlertStats();

      expect(stats).toHaveProperty("totalAlerts");
      expect(stats).toHaveProperty("activeAlerts");
      expect(stats).toHaveProperty("alertRules");
      expect(stats).toHaveProperty("topAlertRules");
    });
  });

  describe("Advanced Handler Integration", () => {
    test("should handle admin command", async () => {
      mockMessage.content = "admin stats";
      mockMessage.guild.members.cache.set("user123", mockMember);

      await advancedHandler.handleMessage(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test("should handle AI command", async () => {
      mockMessage.content = "ai sentiment This is a great day!";

      await advancedHandler.handleMessage(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test("should handle dashboard command", async () => {
      mockMessage.content = "dashboard system_overview";

      await advancedHandler.handleMessage(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test("should handle natural language game request", async () => {
      mockMessage.content = "start a game";

      await advancedHandler.handleMessage(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test("should handle button interaction", async () => {
      mockInteraction.customId = "join_br_12345";

      await advancedHandler.handleButtonInteraction(mockInteraction);

      expect(mockInteraction.reply).toHaveBeenCalled();
    });
  });

  describe("Performance and Analytics", () => {
    test("should track analytics events", () => {
      const initialMetrics = aiFeatures.getAIStats();
      expect(initialMetrics).toHaveProperty("sentimentAnalyses");
      expect(initialMetrics).toHaveProperty("moderationChecks");
      expect(initialMetrics).toHaveProperty("userProfiles");
    });

    test("should handle concurrent operations", async () => {
      const promises = [];

      // Test concurrent sentiment analysis
      for (let i = 0; i < 10; i++) {
        promises.push(
          aiFeatures.analyzeSentiment(`Test message ${i}`, `user${i}`),
        );
      }

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      results.forEach((result) => {
        expect(result).toHaveProperty("sentiment");
        expect(result).toHaveProperty("confidence");
      });
    });

    test("should handle error scenarios gracefully", async () => {
      // Test with invalid integration
      try {
        await integrationService.executeAction("invalid-id", "test", {});
      } catch (error) {
        expect(error.message).toContain("Integration not found");
      }

      // Test with invalid webhook
      try {
        await webhookService.processWebhook("invalid-id", {});
      } catch (error) {
        expect(error.message).toContain("Webhook not found");
      }
    });
  });

  describe("System Integration", () => {
    test("should integrate all systems properly", async () => {
      // Test that all major systems are initialized
      expect(advancedHandler).toBeDefined();
      expect(integrationService).toBeDefined();
      expect(webhookService).toBeDefined();
      expect(advancedGames).toBeDefined();
      expect(adminTools).toBeDefined();
      expect(aiFeatures).toBeDefined();
      expect(dashboardAnalytics).toBeDefined();
      expect(alerting).toBeDefined();
    });

    test("should handle complex workflow", async () => {
      // Simulate a complex workflow involving multiple systems

      // 1. User sends message
      mockMessage.content = "I need help with moderation";

      // 2. AI analyzes sentiment
      const sentiment = await aiFeatures.analyzeSentiment(
        mockMessage.content,
        mockMessage.author.id,
      );
      expect(sentiment.sentiment).toBe("neutral");

      // 3. Generate suggestions
      const suggestions = await aiFeatures.generateSmartSuggestions(
        mockMessage.content,
        mockMessage.author.id,
        mockMessage.channel.id,
        { sentiment },
      );
      expect(suggestions.suggestions.length).toBeGreaterThan(0);

      // 4. Handle the message through advanced handler
      await advancedHandler.handleMessage(mockMessage);

      // 5. Check that appropriate response was generated
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });
});

describe("Performance Benchmarks", () => {
  test("sentiment analysis should complete within reasonable time", async () => {
    const start = Date.now();
    await aiFeatures.analyzeSentiment(
      "This is a test message for performance testing",
      "user123",
    );
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
  });

  test("dashboard generation should complete within reasonable time", async () => {
    const start = Date.now();
    await dashboardAnalytics.generateDashboardData("system_overview");
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
  });

  test("game creation should be fast", async () => {
    const start = Date.now();
    await advancedGames.startWordChain(mockMessage.channel);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(500); // Should complete within 500ms
  });
});

describe("Memory and Resource Management", () => {
  test("should not leak memory with repeated operations", async () => {
    const initialMemory = process.memoryUsage().heapUsed;

    // Perform many operations
    for (let i = 0; i < 100; i++) {
      await aiFeatures.analyzeSentiment(`Test message ${i}`, `user${i}`);
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  test("should clean up game resources", async () => {
    const gameId = await advancedGames.startWordChain(mockMessage.channel);

    // End the game
    await advancedGames.endGame(gameId, "test");

    // Game should be cleaned up
    const stats = advancedGames.getGameStats(gameId);
    expect(stats).toBeNull();
  });
});
