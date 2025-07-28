// Using Jest's built-in expect
const { Client, GatewayIntentBits } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");
const GameHandler = require("../src/handlers/gameHandler.js");

// Mock Discord client and message
class MockClient {
  constructor() {
    this.user = { id: "test-bot" };
  }
}

class MockMessage {
  constructor(content, author, channel, member = {}) {
    this.content = content;
    this.author = author;
    this.channel = channel;
    this.member = member;
    this.replies = [];
    this.deleted = false;
  }

  async reply(content) {
    this.replies.push(content);
    return { id: "mock-message" };
  }
}

describe.skip("GameHandler", () => {
  let client;
  let db;
  let handler;
  let testChannel;
  let testUser;
  let adminUser;

  beforeAll(async () => {
    // Set up in-memory database for testing
    db = await open({
      filename: ":memory:",
      driver: sqlite3.Database,
    });

    // Create necessary tables
    await db.exec(`
      CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channelId TEXT NOT NULL,
        gameType TEXT NOT NULL,
        state TEXT NOT NULL,
        data TEXT,
        createdAt INTEGER NOT NULL
      );
    `);
  });

  beforeEach(() => {
    client = new MockClient();
    handler = new GameHandler(client, db);

    // Reset test data
    testChannel = {
      id: "test-channel",
      send: async () => ({ id: "test-message" }),
    };
    testUser = { id: "test-user", username: "TestUser", bot: false };
    adminUser = {
      id: "admin-user",
      username: "Admin",
      bot: false,
      permissions: { has: () => true },
    };
  });

  afterEach(async () => {
    // Clean up database
    await db.run("DELETE FROM games");
  });

  afterAll(async () => {
    await db.close();
  });

  describe("Rate Limiting", () => {
    it("should rate limit game starts", async () => {
      const message = new MockMessage(
        "start emoji race",
        testUser,
        testChannel,
      );

      // First 3 starts should work (limit is 3 per minute)
      for (let i = 0; i < 3; i++) {
        await handler.handleMessage(message);
        expect(message.replies).to.have.length(i + 1);
      }

      // Fourth start should be rate limited
      await handler.handleMessage(message);
      expect(message.replies[3]).to.include("too quickly");
    });
  });

  describe("Game Commands", () => {
    it("should handle invalid game types", async () => {
      const message = new MockMessage(
        "start invalid-game",
        testUser,
        testChannel,
      );
      await handler.handleMessage(message);

      expect(message.replies[0]).to.include("Invalid game type");
    });

    it("should prevent joining non-existent games", async () => {
      const message = new MockMessage("join", testUser, testChannel);
      await handler.handleMessage(message);

      expect(message.replies[0]).to.include("no active game");
    });

    it("should only allow game starter or admin to end game", async () => {
      // Start a game
      const startMessage = new MockMessage(
        "start emoji race",
        testUser,
        testChannel,
      );
      await handler.handleMessage(startMessage);

      // Try to end as a different user
      const otherUser = { id: "other-user", username: "OtherUser", bot: false };
      const endMessage = new MockMessage("end game", otherUser, testChannel, {
        permissions: { has: () => false },
      });

      await handler.handleMessage(endMessage);
      expect(endMessage.replies[0]).to.include(
        "Only the game starter or an admin",
      );

      // Try as admin
      const adminMessage = new MockMessage("end game", adminUser, testChannel, {
        permissions: { has: () => true },
      });

      await handler.handleMessage(adminMessage);
      expect(adminMessage.replies[0]).to.equal("Game ended.");
    });
  });

  describe("Game Help", () => {
    it("should show help information", async () => {
      const message = new MockMessage("game help", testUser, testChannel);
      await handler.handleMessage(message);

      expect(message.replies[0].embeds).to.exist;
      const embed = message.replies[0].embeds[0];
      expect(embed.title).to.equal("Game Commands");
      expect(embed.fields).to.have.length(3);
    });
  });
});
