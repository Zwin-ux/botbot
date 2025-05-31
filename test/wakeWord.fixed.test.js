import NaturalMessageHandler from '../src/handlers/naturalMessageHandler.js';
import { recognizeIntent } from '../src/utils/intentRecognizer.js';
import IntentService from '../src/services/intentService.js'; // Added

// Mock the intentRecognizer
jest.mock('../src/utils/intentRecognizer.js', () => ({ // Added .js
  recognizeIntent: jest.fn()
}));
jest.mock('../src/services/intentService.js'); // Added
// Mock embedUtils as it might be indirectly used if NaturalMessageHandler tries to send complex embeds on errors
jest.mock('../src/utils/embedUtils.js', () => ({
  createEmbed: jest.fn().mockImplementation(({ title, description, color }) => ({ title, description, color })),
  COLORS: { ERROR: '#ff0000', SUCCESS: '#00ff00', INFO: '#0000ff' },
  EMOJIS: { SUCCESS: '✅', ERROR: '❌', INFO: 'ℹ️' }
}));


describe('Wake Word Detection (Fixed Tests)', () => {
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
        users: { has: jest.fn().mockReturnValue(false) } // New mention check used by isBotAddressed
      },
      reply: jest.fn().mockResolvedValue({})
    };
    
    handler = new NaturalMessageHandler(mockClient, mockDb, mockIntentService); // Updated
    
    jest.clearAllMocks();
    // Default mock for IntentService to not handle, so NaturalMessageHandler's direct replies can be tested if needed
    mockIntentService.processIntent.mockResolvedValue(false);
  });
  
  it('should detect wake word at start of message and delegate to IntentService', async () => {
    mockMessage.content = 'hey bot, what time is it?';
    recognizeIntent.mockReturnValue({
      intent: 'get_time', confidence: 0.9, entities: {}, response: 'The time is 12:00 PM'
    });
    // Simulate IntentService successfully handling the intent and replying
    mockIntentService.processIntent.mockImplementation(async (intent, confidence, entities, message, userState) => {
      if (intent === 'get_time') {
        await message.reply('The time is 12:00 PM'); // Service makes the reply
        return true; // Service handled it
      }
      return false;
    });
    
    await handler.handleMessage(mockMessage);
    
    expect(recognizeIntent).toHaveBeenCalledWith('what time is it?', 'en', true);
    expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, expect.objectContaining({ content: 'what time is it?' }), expect.any(Object));
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
    expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, expect.objectContaining({ content: 'what time is it?' }), expect.any(Object));
    expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
  });
  
  it('should not respond to messages without wake word', async () => {
    mockMessage.content = 'hello there';
    // recognizeIntent will not be called if not addressed and not in attentive mode
    await handler.handleMessage(mockMessage);
    expect(recognizeIntent).not.toHaveBeenCalled();
    expect(mockIntentService.processIntent).not.toHaveBeenCalled();
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });
  
  it('should handle mentions as wake words and delegate', async () => {
    mockMessage.mentions.users.has.mockReturnValue(true); // use users.has
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
    expect(mockIntentService.processIntent).toHaveBeenCalledWith('get_time', 0.9, {}, expect.objectContaining({ content: 'what time is it?' }), expect.any(Object));
    expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
  });

  it('should reply with greeting if wake word is used alone', async () => {
    mockMessage.content = 'hey bot';
    // recognizeIntent might not even be called if content after wake word is empty
    // NaturalMessageHandler directly replies in this case.

    await handler.handleMessage(mockMessage);

    // It should not delegate to IntentService for this specific case
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
