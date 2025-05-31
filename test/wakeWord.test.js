import NaturalMessageHandler from '../src/handlers/naturalMessageHandler.js';
import { recognizeIntent } from '../src/utils/intentRecognizer.js';
import IntentService from '../src/services/intentService.js'; // Added

// Mock the intentRecognizer
jest.mock('../src/utils/intentRecognizer.js', () => ({ // Ensured .js
  recognizeIntent: jest.fn()
}));
jest.mock('../src/services/intentService.js'); // Added IntentService mock

// Mock the embedUtils
jest.mock('../src/utils/embedUtils.js', () => ({
  createEmbed: jest.fn().mockImplementation(({ title, description, color }) => ({ title, description, color })),
  COLORS: { ERROR: '#ff0000', SUCCESS: '#00ff00', INFO: '#0000ff' },
  EMOJIS: { SUCCESS: '✅', ERROR: '❌', INFO: 'ℹ️' }
}));

describe('Wake Word Detection (Original Tests)', () => { // Modified describe slightly for clarity if both files are kept
  let handler;
  let mockClient;
  let mockDb;
  let mockMessage;
  let mockIntentService; // Added
  
  beforeEach(() => {
    mockClient = { user: { id: 'bot123' } };
    mockDb = {};
    mockIntentService = new IntentService(); // Instantiate mock

    mockMessage = {
      author: { id: 'user123', bot: false },
      content: '',
      channel: { send: jest.fn().mockResolvedValue({}) },
      mentions: { 
        has: jest.fn().mockReturnValue(false), // Old mention check
        users: { has: jest.fn().mockReturnValue(false) } // New mention check
      },
      reply: jest.fn().mockResolvedValue({})
    };
    
    handler = new NaturalMessageHandler(mockClient, mockDb, mockIntentService); // Updated
    
    jest.clearAllMocks();
    mockIntentService.processIntent.mockResolvedValue(false); // Default: service does not handle
  });
  
  it('should detect wake word at start of message and delegate to IntentService', async () => {
    mockMessage.content = 'hey bot, what time is it?';
    recognizeIntent.mockReturnValue({
      intent: 'get_time', confidence: 0.9, entities: {}, response: 'The time is 12:00 PM'
    });
    mockIntentService.processIntent.mockImplementation(async (intent, conf, ent, msg) => {
      if (intent === 'get_time') {
        await msg.reply('The time is 12:00 PM');
        return true;
      }
      return false;
    });
    
    await handler.handleMessage(mockMessage);
    
    expect(recognizeIntent).toHaveBeenCalledWith('what time is it?', 'en', true);
    expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, expect.objectContaining({content: 'what time is it?'}), expect.any(Object));
    expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
  });
  
  it('should be case insensitive for wake words and delegate', async () => {
    mockMessage.content = 'HEY BOT, what time is it?';
    recognizeIntent.mockReturnValue({
      intent: 'get_time', confidence: 0.9, entities: {}, response: 'The time is 12:00 PM'
    });
    mockIntentService.processIntent.mockImplementation(async (intent, conf, ent, msg) => {
        await msg.reply('The time is 12:00 PM'); return true;
    });
    
    await handler.handleMessage(mockMessage);
    
    expect(recognizeIntent).toHaveBeenCalledWith('what time is it?', 'en', true);
    expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, expect.objectContaining({content: 'what time is it?'}), expect.any(Object));
    expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
  });
  
  it('should not respond to messages without wake word', async () => {
    mockMessage.content = 'hello there';
    await handler.handleMessage(mockMessage);
    expect(recognizeIntent).not.toHaveBeenCalled();
    expect(mockIntentService.processIntent).not.toHaveBeenCalled();
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });
  
  it('should handle mentions as wake words and delegate', async () => {
    mockMessage.mentions.users.has.mockReturnValue(true); // Use users.has
    mockMessage.content = `<@${mockClient.user.id}> what time is it?`;
    
    recognizeIntent.mockReturnValue({
      intent: 'get_time', confidence: 0.9, entities: {}, response: 'The time is 12:00 PM'
    });
    mockIntentService.processIntent.mockImplementation(async (intent, conf, ent, msg) => {
        await msg.reply('The time is 12:00 PM'); return true;
    });
    
    await handler.handleMessage(mockMessage);
    
    expect(mockMessage.mentions.users.has).toHaveBeenCalledWith(mockClient.user.id);
    expect(recognizeIntent).toHaveBeenCalledWith('what time is it?', 'en', true);
    expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, expect.objectContaining({content: 'what time is it?'}), expect.any(Object));
    expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
  });

  it('should reply with greeting if wake word is used alone', async () => {
    mockMessage.content = 'hey bot';
    await handler.handleMessage(mockMessage);
    expect(recognizeIntent).not.toHaveBeenCalled();
    expect(mockIntentService.processIntent).not.toHaveBeenCalled();
    expect(mockMessage.reply).toHaveBeenCalledWith("Hi there! I'm listening. What can I help you with?");
  });

  it('should reply with greeting if mention is used alone', async () => {
    mockMessage.mentions.users.has.mockReturnValue(true);
    mockMessage.content = `<@${mockClient.user.id}>`;
    await handler.handleMessage(mockMessage);
    expect(recognizeIntent).not.toHaveBeenCalled();
    expect(mockIntentService.processIntent).not.toHaveBeenCalled();
    expect(mockMessage.reply).toHaveBeenCalledWith("Hi there! I'm listening. What can I help you with?");
  });
});
