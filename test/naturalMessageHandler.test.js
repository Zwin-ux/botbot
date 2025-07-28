import NaturalMessageHandler from "../src/handlers/naturalMessageHandler.js";
import { recognizeIntent } from "../src/utils/intentRecognizer.js";

// Mock the dependencies
jest.mock("../src/utils/intentRecognizer.js", () => ({
  recognizeIntent: jest.fn(),
}));

jest.mock("../src/utils/analytics.js", () => ({
  analytics: {
    trackUserSession: jest.fn(),
    trackEvent: jest.fn(),
  },
}));

jest.mock("../src/utils/cache.js", () => ({
  userCache: {
    get: jest.fn(),
    set: jest.fn(),
    has: jest.fn(),
  },
  intentCache: {
    get: jest.fn(() => null), // Always return null to bypass cache in tests
    set: jest.fn(),
  },
}));

jest.mock("../src/utils/rateLimiter.js", () => ({
  rateLimiter: {
    checkLimit: jest.fn(() => ({ allowed: true })), // Always allow in tests
  },
}));

jest.mock("../src/utils/smartHelp.js", () => ({
  smartHelp: {
    getContextualHelp: jest.fn(() => ({
      topic: "test",
      embed: { title: "Test Help" },
      followUp: [],
    })),
  },
}));

// Mock console.error to keep test output clean
console.error = jest.fn();

describe("NaturalMessageHandler", () => {
  let handler;
  let mockClient;
  let mockDb;
  let mockMessage;

  // Mock Date.now() for testing time-based functionality
  const originalDateNow = Date.now;
  let currentTime = 1000000; // Set to a reasonable timestamp

  beforeEach(() => {
    // Setup mocks
    mockClient = {
      user: {
        id: "bot123",
      },
    };

    mockDb = {};

    mockMessage = {
      author: { id: "user123", bot: false },
      content: "",
      mentions: {
        has: jest.fn().mockReturnValue(false),
        users: { has: jest.fn().mockReturnValue(false) },
      },
      reply: jest.fn().mockResolvedValue({}),
    };

    // Reset the handler for each test
    handler = new NaturalMessageHandler(mockClient, mockDb);

    // Mock Date.now()
    global.Date.now = () => currentTime;

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore Date.now()
    global.Date.now = originalDateNow;
  });

  describe("Wake Word Detection", () => {
    const testCases = [
      { input: "hey bot", shouldWake: true },
      { input: "HEY BOT", shouldWake: true },
      { input: "hey bot, how are you?", shouldWake: true },
      { input: "okay bot", shouldWake: true },
      { input: "yo bot", shouldWake: true },
      { input: "bot", shouldWake: true },
      { input: "botbot", shouldWake: true },
      { input: "hey botbot", shouldWake: true },
      { input: "hello bot", shouldWake: false }, // Not in wake words
      { input: "just chatting", shouldWake: false },
    ];

    testCases.forEach(({ input, shouldWake }) => {
      it(`${shouldWake ? "should" : "should not"} wake on "${input}"`, async () => {
        // For wake word tests, we need to provide a greeting response
        if (shouldWake) {
          // If this is a wake word test, mock a greeting response
          recognizeIntent.mockReturnValue({
            intent: "greet",
            confidence: 0.9,
            entities: {},
            response: "Hi there! I'm listening. What can I help you with?",
          });
        } else {
          // For non-wake words, return low confidence
          recognizeIntent.mockReturnValue({
            intent: "unknown",
            confidence: 0.1,
            entities: {},
            response: "",
          });
        }

        mockMessage.content = input;
        await handler.handleMessage(mockMessage);

        if (shouldWake) {
          expect(mockMessage.reply).toHaveBeenCalled();
        } else {
          expect(mockMessage.reply).not.toHaveBeenCalled();
        }
      });
    });

    it("should handle mentions as wake words", async () => {
      // Mock the intent recognizer with a proper response for the mention test
      recognizeIntent.mockReturnValue({
        intent: "greet",
        confidence: 0.9,
        entities: {},
        response: "Hi there! I'm listening. What can I help you with?",
      });

      mockMessage.content = `<@${mockClient.user.id}> hello`;
      mockMessage.mentions.users.has.mockReturnValue(true);

      await handler.handleMessage(mockMessage);

      expect(mockMessage.mentions.users.has).toHaveBeenCalledWith(
        mockClient.user.id,
      );
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe("Attentive Mode", () => {
    it("should stay attentive for 5 minutes after wake word", async () => {
      // Initial wake
      mockMessage.content = "hey bot";
      await handler.handleMessage(mockMessage);

      // Should be in attentive mode
      mockMessage.content = "what time is it?";
      mockMessage.reply.mockClear();
      recognizeIntent.mockReturnValue({
        intent: "get_time",
        confidence: 0.9,
        entities: {},
        response: "The time is 12:00 PM",
      });

      await handler.handleMessage(mockMessage);
      expect(mockMessage.reply).toHaveBeenCalledWith("The time is 12:00 PM");

      // Fast forward 4 minutes 59 seconds - still attentive
      currentTime += 4 * 60 * 1000 + 59 * 1000;
      mockMessage.reply.mockClear();
      await handler.handleMessage(mockMessage);
      expect(mockMessage.reply).toHaveBeenCalled();

      // Fast forward to 5 minutes 1 second - no longer attentive
      currentTime += 2000; // 2 more seconds
      mockMessage.reply.mockClear();
      await handler.handleMessage(mockMessage);
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    it("should process message after wake word in same message", async () => {
      mockMessage.content = "hey bot what time is it?";
      recognizeIntent.mockReturnValue({
        intent: "get_time",
        confidence: 0.9,
        entities: {},
        response: "The time is 12:00 PM",
      });

      await handler.handleMessage(mockMessage);

      // Should process the command in the same message
      expect(mockMessage.reply).toHaveBeenCalledWith("The time is 12:00 PM");

      // And should still be in attentive mode for next message
      mockMessage.content = "what about now?";
      mockMessage.reply.mockClear();
      await handler.handleMessage(mockMessage);
      expect(mockMessage.reply).toHaveBeenCalled();
    });
  });

  describe("Intent Handling", () => {
    beforeEach(() => {
      // Start in attentive mode for these tests
      mockMessage.content = "hey bot";
      return handler.handleMessage(mockMessage);
    });

    it("should handle unknown intents with fallback responses", async () => {
      // Clear previous calls from beforeEach
      mockMessage.reply.mockClear();

      mockMessage.content = "asdfghjkl";
      recognizeIntent.mockReturnValue({
        intent: "unknown",
        confidence: 0.1,
        entities: {},
        response: "",
      });

      await handler.handleMessage(mockMessage);

      // Should have received one of the fallback responses
      expect(mockMessage.reply).toHaveBeenCalled();
      const reply = mockMessage.reply.mock.calls[0][0];
      expect([
        "I'm not sure I understand. Could you rephrase that?",
        "I didn't quite catch that. Can you try saying it differently?",
        "I'm still learning! Could you try a different phrase?",
        "I'm not sure how to help with that. Try asking me something else?",
      ]).toContain(reply);
    });

    it("should handle known intents", async () => {
      mockMessage.content = "help me";
      recognizeIntent.mockReturnValue({
        intent: "help",
        confidence: 0.9,
        entities: {},
        response: "Here are some things I can help with...",
      });

      await handler.handleMessage(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalledWith(
        "Here are some things I can help with...",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should ignore messages from bots", async () => {
      mockMessage.author.bot = true;
      mockMessage.content = "hey bot";

      await handler.handleMessage(mockMessage);

      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    it("should handle empty messages gracefully", async () => {
      mockMessage.content = "   ";

      await handler.handleMessage(mockMessage);

      expect(mockMessage.reply).not.toHaveBeenCalled();
    });

    it("should handle message content after mention", async () => {
      mockMessage.mentions.users.has.mockReturnValue(true);
      mockMessage.content = "<@bot123>   what time is it?";

      recognizeIntent.mockReturnValue({
        intent: "get_time",
        confidence: 0.9,
        entities: {},
        response: "The time is 12:00 PM",
      });

      await handler.handleMessage(mockMessage);

      expect(mockMessage.reply).toHaveBeenCalledWith("The time is 12:00 PM");
    });
  });
});
