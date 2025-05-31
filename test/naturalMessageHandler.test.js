import NaturalMessageHandler from '../src/handlers/naturalMessageHandler.js';
import { recognizeIntent } from '../src/utils/intentRecognizer.js';
import IntentService from '../src/services/intentService.js'; // Added

// Mock the dependencies
jest.mock('../src/utils/intentRecognizer.js', () => ({ // Added .js
  recognizeIntent: jest.fn()
}));
jest.mock('../src/services/intentService.js'); // Added IntentService mock

// Mock console.error to keep test output clean
console.error = jest.fn();

describe('NaturalMessageHandler', () => {
  let handler;
  let mockClient;
  let mockDb;
  let mockMessage;
  let mockIntentService; // Added
  
  // Mock Date.now() for testing time-based functionality
  const originalDateNow = Date.now;
  let currentTime = Date.now(); // Initialize with current time for safety
  
  beforeEach(() => {
    // Setup mocks
    mockClient = {
      user: {
        id: 'bot123'
      }
    };
    
    mockDb = {}; // Mock DB as needed by NaturalMessageHandler
    
    mockIntentService = new IntentService(); // Instantiate the mock

    mockMessage = {
      author: { id: 'user123', bot: false },
      content: '',
      mentions: {
        has: jest.fn().mockReturnValue(false),
        users: { has: jest.fn().mockReturnValue(false) } // Added for isBotAddressed
      },
      reply: jest.fn().mockResolvedValue({}),
      channel: { send: jest.fn().mockResolvedValue({}) } // Added for potential fallback messages
    };
    
    // Reset the handler for each test
    handler = new NaturalMessageHandler(mockClient, mockDb, mockIntentService); // Updated instantiation
    
    // Mock Date.now()
    currentTime = Date.now(); // Reset current time for each test
    global.Date.now = jest.fn(() => currentTime);
    
    // Reset all mocks
    jest.clearAllMocks();
    // Default mock for recognizeIntent if not specified by a test
    recognizeIntent.mockReturnValue({
        intent: 'unknown',
        confidence: 0.1,
        entities: {},
        response: ''
    });
    // Default mock for IntentService.processIntent
    mockIntentService.processIntent.mockResolvedValue(false);
  });
  
  afterEach(() => {
    // Restore Date.now()
    global.Date.now = originalDateNow;
  });
  
  describe('Wake Word Detection', () => {
    const testCases = [
      { input: 'hey bot', shouldWake: true },
      { input: 'HEY BOT', shouldWake: true },
      { input: 'hey bot, how are you?', shouldWake: true },
      { input: 'okay bot', shouldWake: true },
      { input: 'yo bot', shouldWake: true },
      { input: 'bot', shouldWake: true },
      { input: 'botbot', shouldWake: true },
      { input: 'hey botbot', shouldWake: true },
      { input: 'hello bot', shouldWake: false },
      { input: 'just chatting', shouldWake: false },
    ];
    
    testCases.forEach(({ input, shouldWake }) => {
      it(`${shouldWake ? 'should' : 'should not'} wake on "${input}"`, async () => {
        if (shouldWake) {
          // If it's a wake word, NaturalMessageHandler might try to reply if content is empty after wake word
          // or pass to intent recognizer.
          // For "hey bot", content becomes empty, so it replies with a greeting.
          if (input.trim().toLowerCase() === 'hey bot' || input.trim().toLowerCase() === 'bot' || input.trim().toLowerCase() === 'botbot') {
             // No specific intent needed, it's handled by empty content after wake word
          } else {
            // For "hey bot, how are you?", content becomes "how are you?"
            recognizeIntent.mockReturnValue({
                intent: 'get_status', confidence: 0.9, entities: {}, response: "I'm doing great!"
            });
            mockIntentService.processIntent.mockResolvedValue(true); // Assume service handles it
          }
        }
        // If not a wake word, recognizeIntent default mock (unknown, low confidence) is fine.
        
        mockMessage.content = input;
        await handler.handleMessage(mockMessage);
        
        if (shouldWake) {
          expect(mockMessage.reply).toHaveBeenCalled();
        } else {
          expect(mockMessage.reply).not.toHaveBeenCalled();
        }
      });
    });
    
    it('should handle mentions as wake words', async () => {
      recognizeIntent.mockReturnValue({
        intent: 'greet', confidence: 0.9, entities: {}, response: "Hi there! I'm listening."
      });
      mockIntentService.processIntent.mockResolvedValue(true); // Simulate IntentService handling it
      
      mockMessage.content = `<@${mockClient.user.id}> hello`;
      mockMessage.mentions.users.has.mockReturnValue(true); // Updated to use users.has
      
      await handler.handleMessage(mockMessage);
      
      expect(mockMessage.mentions.users.has).toHaveBeenCalledWith(mockClient.user.id); // Check with ID
      expect(mockMessage.reply).toHaveBeenCalledWith("Hi there! I'm listening.");
    });
  });
  
  describe('Attentive Mode', () => {
    it('should stay attentive for 5 minutes after wake word', async () => {
      // Initial wake
      mockMessage.content = 'hey bot'; // This will cause an immediate reply due to empty content after wake word
      await handler.handleMessage(mockMessage);
      expect(mockMessage.reply).toHaveBeenCalledWith("Hi there! I'm listening. What can I help you with?");
      mockMessage.reply.mockClear(); // Clear for next assertions

      // Should be in attentive mode
      mockMessage.content = 'what time is it?';
      recognizeIntent.mockReturnValue({
        intent: 'get_time', confidence: 0.9, entities: {}, response: 'The time is 12:00 PM'
      });
      mockIntentService.processIntent.mockResolvedValue(true); // Service handles it
      
      await handler.handleMessage(mockMessage);
      expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, mockMessage, expect.any(Object));
      expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM'); // Assuming IntentService makes it reply
      
      // Fast forward 4 minutes 59 seconds - still attentive
      currentTime += (4 * 60 * 1000) + (59 * 1000);
      mockMessage.reply.mockClear();
      mockIntentService.processIntent.mockClear();
      await handler.handleMessage(mockMessage); // Content is still 'what time is it?'
      expect(mockIntentService.processIntent).toHaveBeenCalled();
      expect(mockMessage.reply).toHaveBeenCalled();
      
      // Fast forward to 5 minutes 1 second - no longer attentive
      currentTime += 2000; // 2 more seconds
      mockMessage.reply.mockClear();
      mockIntentService.processIntent.mockClear();
      recognizeIntent.mockClear(); // Clear this too as it shouldn't be called if not attentive
      await handler.handleMessage(mockMessage);
      expect(recognizeIntent).not.toHaveBeenCalled(); // Should not even try to recognize if not attentive
      expect(mockIntentService.processIntent).not.toHaveBeenCalled();
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });
  });
  
  describe('Intent Handling by NaturalMessageHandler (when IntentService does not handle)', () => {
    beforeEach(async () => {
      // Ensure attentive mode by simulating a wake word
      mockMessage.content = 'hey bot'; // This leads to a direct reply
      await handler.handleMessage(mockMessage);
      mockMessage.reply.mockClear(); // Clear the reply from the wake word itself
      // Ensure IntentService returns false for subsequent calls in these specific tests
      mockIntentService.processIntent.mockResolvedValue(false);
    });
    
    it('should handle unknown intents with fallback responses if confidence is low', async () => {
      mockMessage.content = 'asdfghjkl'; // New content for this message
      recognizeIntent.mockReturnValue({
        intent: 'unknown', confidence: 0.1, entities: {}, response: ''
      });
      // mockIntentService.processIntent is already set to return false by default or in beforeEach
      
      await handler.handleMessage(mockMessage);
      
      expect(mockIntentService.processIntent).toHaveBeenCalledWith('unknown', 0.1, {}, mockMessage, expect.any(Object));
      expect(mockMessage.reply).toHaveBeenCalled();
      const reply = mockMessage.reply.mock.calls[0][0];
      expect([
        "I'm not sure I understand. Could you rephrase that?",
        "I didn't quite catch that. Can you try saying it differently?",
        "I'm still learning! Could you try a different phrase?",
        "I'm not sure how to help with that. Try asking me something else?"
      ]).toContain(reply);
    });

    it('should handle specific intents like "start_meeting" if not handled by service', async () => {
      mockMessage.content = 'let us start a meeting about project X';
      const entities = { meeting_topic: 'project X' };
      recognizeIntent.mockReturnValue({
        intent: 'start_meeting', confidence: 0.9, entities: entities, response: ''
      });
      // mockIntentService.processIntent returns false (from general beforeEach or specific setup)

      await handler.handleMessage(mockMessage);
      expect(mockIntentService.processIntent).toHaveBeenCalledWith('start_meeting', 0.9, entities, mockMessage, expect.any(Object));
      // Check for reply related to starting a meeting (specific to _handleMeetingIntent)
      expect(mockMessage.reply).toHaveBeenCalledWith(expect.objectContaining({
        embeds: expect.arrayContaining([
          expect.objectContaining({ title: expect.stringContaining('Start meeting?') })
        ])
      }));
    });
  });

  describe('Intent Handling by IntentService', () => {
    beforeEach(async () => {
      // Attentive mode
      mockMessage.content = 'hey bot';
      await handler.handleMessage(mockMessage);
      mockMessage.reply.mockClear();
    });

    it('should delegate "help" intent to IntentService and service handles it', async () => {
      mockMessage.content = 'can you help me';
      recognizeIntent.mockReturnValue({
        intent: 'help', confidence: 0.95, entities: {}, response: ''
      });
      mockIntentService.processIntent.mockResolvedValue(true); // Simulate service handling it
      // mockMessage.reply will be called by the service's mock or actual implementation

      await handler.handleMessage(mockMessage);

      expect(recognizeIntent).toHaveBeenCalledWith('can you help me', 'en', true);
      expect(mockIntentService.processIntent).toHaveBeenCalledWith('help', 0.95, {}, mockMessage, expect.any(Object));
      // If service handles it and replies, this test relies on the service's mock doing that.
      // For example, if IntentService's mock for 'help' calls message.reply:
      // mockIntentService.processIntent.mockImplementation(async (intent, conf, ent, msg) => {
      //   if (intent === 'help') { await msg.reply("Help from service!"); return true;}
      //   return false;
      // });
      // Then you'd expect(mockMessage.reply).toHaveBeenCalledWith("Help from service!");
      // For now, just checking it was called.
      // We are not testing *if* IntentService calls reply, just that NaturalMessageHandler delegates.
      // So, no mockMessage.reply check here unless we mock IntentService to do so.
    });

    it('should delegate "set_reminder" intent to IntentService', async () => {
        mockMessage.content = 'remind me to test';
        const entities = { task: 'test' };
        recognizeIntent.mockReturnValue({
            intent: 'set_reminder', confidence: 0.88, entities, response: ''
        });
        mockIntentService.processIntent.mockResolvedValue(true); // Service handles it

        await handler.handleMessage(mockMessage);

        expect(recognizeIntent).toHaveBeenCalledWith('remind me to test', 'en', true);
        expect(mockIntentService.processIntent).toHaveBeenCalledWith('set_reminder', 0.88, entities, mockMessage, expect.any(Object));
        // Similar to 'help', NaturalMessageHandler's job is to delegate.
        // The reply would come from IntentService's handling of the reminder flow.
    });
  });
  
  describe('Edge Cases', () => {
    it('should ignore messages from bots', async () => {
      mockMessage.author.bot = true;
      mockMessage.content = 'hey bot';
      await handler.handleMessage(mockMessage);
      expect(mockMessage.reply).not.toHaveBeenCalled();
    });
    
    it('should handle empty messages gracefully after wake word', async () => {
      mockMessage.content = 'hey bot '; // Content after wake word is empty
      await handler.handleMessage(mockMessage);
      expect(mockMessage.reply).toHaveBeenCalledWith("Hi there! I'm listening. What can I help you with?");
    });
    
    it('should handle message content after mention correctly', async () => {
      mockMessage.mentions.users.has.mockReturnValue(true);
      mockMessage.content = `<@${mockClient.user.id}> what time is it?`;
      
      recognizeIntent.mockReturnValue({
        intent: 'get_time', confidence: 0.9, entities: {}, response: 'The time is 12:00 PM'
      });
      mockIntentService.processIntent.mockResolvedValue(true); // Service handles it

      await handler.handleMessage(mockMessage);
      
      expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, expect.objectContaining({ content: 'what time is it?' }), expect.any(Object));
      expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
    });
  });
});
