/**
 * Natural Language Processing Test Suite
 * Tests the bot's ability to understand and respond to natural conversation
 */

import { recognizeIntent } from '../src/utils/intentRecognizer.js';
import EnhancedParser from '../src/enhancedParser.js';
import NaturalMessageHandler from '../src/handlers/naturalMessageHandler.js';

describe('Natural Language Processing', () => {
  let parser;
  let mockClient;
  let mockDb;
  let naturalHandler;

  beforeEach(() => {
    parser = new EnhancedParser();
    
    mockClient = {
      user: { id: 'bot123', username: 'BotBot' },
    };
    
    mockDb = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
    };
    
    naturalHandler = new NaturalMessageHandler(mockClient, mockDb);
  });

  describe('Intent Recognition', () => {
    test('should recognize greeting intents', () => {
      const testCases = [
        'hello',
        'hi there',
        'hey bot',
        'good morning',
        'howdy',
      ];

      testCases.forEach(message => {
        const result = recognizeIntent(message);
        expect(result.intent).toBe('greet');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.response).toContain('Hello');
      });
    });

    test('should recognize reminder intents', () => {
      const testCases = [
        'remind me to call mom',
        'set a reminder for the meeting',
        'don\'t forget to buy groceries',
        'remember to submit the report',
        'reminder for lunch at 12pm',
      ];

      testCases.forEach(message => {
        const result = recognizeIntent(message);
        expect(result.intent).toBe('set_reminder');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.response).toContain('remind');
      });
    });

    test('should recognize help intents', () => {
      const testCases = [
        'help',
        'what can you do',
        'how does this work',
        'i\'m stuck',
        'what should I do',
      ];

      testCases.forEach(message => {
        const result = recognizeIntent(message);
        expect(result.intent).toBe('help');
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.response).toContain('help');
      });
    });

    test('should recognize blocked/stuck intents', () => {
      const testCases = [
        'i\'m stuck on this problem',
        'i need help with this',
        'can someone help me',
        'i\'m blocked',
        'help me please',
      ];

      testCases.forEach(message => {
        const result = recognizeIntent(message);
        expect(result.intent).toBe('blocked');
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    test('should handle unknown intents gracefully', () => {
      const result = recognizeIntent('xyzabc random nonsense');
      expect(result.intent).toBe('unknown');
      expect(result.confidence).toBe(0);
    });

    test('should work with different languages', () => {
      // Test Spanish
      const spanishResult = recognizeIntent('hola', 'es');
      expect(spanishResult.intent).toBe('greet');
      expect(spanishResult.confidence).toBeGreaterThan(0);

      // Test French  
      const frenchResult = recognizeIntent('bonjour', 'fr');
      expect(frenchResult.intent).toBe('greet');
      expect(frenchResult.confidence).toBeGreaterThan(0);
    });
  });

  describe('Time Parsing', () => {
    test('should parse relative time expressions', () => {
      const testCases = [
        { input: 'in 5 minutes', expected: 5 },
        { input: 'in 2 hours', expected: 120 },
        { input: 'in 1 day', expected: 1440 },
        { input: 'tomorrow', expected: 1440 },
        { input: 'next week', expected: 10080 },
      ];

      testCases.forEach(({ input }) => {
        const result = parser.parseTime(input);
        expect(result).toBeTruthy();
        expect(result instanceof Date).toBe(true);
      });
    });

    test('should parse absolute time expressions', () => {
      const testCases = [
        'at 3pm',
        'at 15:30',
        'at 9:00 AM',
        'today at 5pm',
        'tomorrow at noon',
      ];

      testCases.forEach(input => {
        const result = parser.parseTime(input);
        expect(result).toBeTruthy();
        expect(result instanceof Date).toBe(true);
      });
    });

    test('should handle invalid time expressions', () => {
      const invalidCases = [
        'not a time',
        'random text',
        'at 25:00',
        'in -5 minutes',
      ];

      invalidCases.forEach(input => {
        const result = parser.parseTime(input);
        expect(result).toBeNull();
      });
    });
  });

  describe('Wake Word Detection', () => {
    test('should detect wake words', () => {
      const mockMessage = {
        content: '',
        mentions: { users: new Map() },
        author: { id: 'user123' },
      };

      const wakeWords = [
        'hey bot',
        'okay bot',
        'yo bot',
        'bot',
        'botbot',
        'hey botbot',
      ];

      wakeWords.forEach(wakeWord => {
        mockMessage.content = wakeWord + ' can you help me?';
        const result = naturalHandler.isBotAddressed(mockMessage);
        expect(result).toBe(true);
      });
    });

    test('should detect bot mentions', () => {
      const mockMessage = {
        content: 'can you help me?',
        mentions: { 
          users: new Map([['bot123', { id: 'bot123' }]]), 
        },
        author: { id: 'user123' },
      };

      const result = naturalHandler.isBotAddressed(mockMessage);
      expect(result).toBe(true);
    });

    test('should not trigger on unrelated messages', () => {
      const mockMessage = {
        content: 'just having a normal conversation',
        mentions: { users: new Map() },
        author: { id: 'user123' },
      };

      const result = naturalHandler.isBotAddressed(mockMessage);
      expect(result).toBe(false);
    });
  });

  describe('Conversation Context', () => {
    test('should maintain conversation state', () => {
      const userId = 'user123';
      
      // Simulate entering attentive mode
      naturalHandler.attentiveUsers.set(userId, Date.now());
      
      expect(naturalHandler.isInAttentiveMode(userId)).toBe(true);
    });

    test('should handle attentive mode timeout', () => {
      const userId = 'user123';
      
      // Set attentive mode in the past (expired)
      naturalHandler.attentiveUsers.set(userId, Date.now() - 10 * 60 * 1000);
      
      expect(naturalHandler.isInAttentiveMode(userId)).toBe(false);
    });
  });

  describe('Natural Language Flow', () => {
    test('should handle complete reminder creation flow', async () => {
      const mockMessage = {
        content: 'hey bot, remind me to call mom in 2 hours',
        author: { id: 'user123', username: 'testuser' },
        channel: { 
          id: 'channel123',
          send: jest.fn().mockResolvedValue({ id: 'reply123' }),
        },
        guild: { id: 'guild123' },
        reply: jest.fn().mockResolvedValue({ id: 'reply123' }),
      };

      // Mock database operations
      mockDb.run.mockImplementation((sql, params, callback) => {
        if (callback) callback(null);
      });

      await naturalHandler.handleMessage(mockMessage);

      // Verify the bot responded appropriately
      expect(mockMessage.reply).toHaveBeenCalled();
    });

    test('should handle help requests naturally', async () => {
      const mockMessage = {
        content: 'hey bot, what can you do?',
        author: { id: 'user123', username: 'testuser' },
        channel: { 
          id: 'channel123',
          send: jest.fn().mockResolvedValue({ id: 'reply123' }),
        },
        guild: { id: 'guild123' },
        reply: jest.fn().mockResolvedValue({ id: 'reply123' }),
      };

      await naturalHandler.handleMessage(mockMessage);

      // Verify the bot provided help information
      expect(mockMessage.reply).toHaveBeenCalled();
      const replyCall = mockMessage.reply.mock.calls[0][0];
      expect(replyCall).toMatch(/help|can|do/i);
    });
  });
});
