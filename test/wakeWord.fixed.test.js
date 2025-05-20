const NaturalMessageHandler = require('../src/handlers/naturalMessageHandler');
const { recognizeIntent } = require('../src/utils/intentRecognizer');

// Mock the intentRecognizer
jest.mock('../src/utils/intentRecognizer', () => ({
  recognizeIntent: jest.fn()
}));

// Mock the embedUtils
jest.mock('../src/utils/embedUtils', () => ({
  createEmbed: jest.fn().mockImplementation(({ title, description, color }) => ({
    title,
    description,
    color
  })),
  COLORS: {
    ERROR: '#ff0000',
    SUCCESS: '#00ff00',
    INFO: '#0000ff'
  },
  EMOJIS: {
    SUCCESS: '✅',
    ERROR: '❌',
    INFO: 'ℹ️'
  }
}));

describe('Wake Word Detection', () => {
  let handler;
  let mockClient;
  let mockDb;
  let mockMessage;
  
  beforeEach(() => {
    // Setup mocks
    mockClient = {
      user: {
        id: 'bot123'
      }
    };
    
    mockDb = {};
    
    mockMessage = {
      author: { id: 'user123', bot: false },
      content: '',
      channel: {
        send: jest.fn().mockResolvedValue({})
      },
      mentions: { 
        has: jest.fn().mockReturnValue(false),
        users: new Map()
      },
      reply: jest.fn().mockResolvedValue({})
    };
    
    // Reset the handler for each test
    handler = new NaturalMessageHandler(mockClient, mockDb);
    
    // Reset all mocks
    jest.clearAllMocks();
  });
  
  it('should detect wake word at start of message', async () => {
    // Mock the message with a wake word
    mockMessage.content = 'hey bot, what time is it?';
    
    // Use mockReturnValue instead of mockResolvedValue
    recognizeIntent.mockReturnValue({
      intent: 'get_time',
      confidence: 0.9,
      entities: {},
      response: 'The time is 12:00 PM'
    });
    
    await handler.handleMessage(mockMessage);
    
    // Verify the bot processed the message
    expect(recognizeIntent).toHaveBeenCalledWith(
      'what time is it?', // Should have wake word removed
      'en',
      true // Should be in attentive mode
    );
    
    // Verify the bot replied with the expected response
    expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
  });
  
  it('should be case insensitive', async () => {
    // Mock the message with uppercase wake word
    mockMessage.content = 'HEY BOT, what time is it?';
    
    // Use mockReturnValue instead of mockResolvedValue
    recognizeIntent.mockReturnValue({
      intent: 'get_time',
      confidence: 0.9,
      entities: {},
      response: 'The time is 12:00 PM'
    });
    
    await handler.handleMessage(mockMessage);
    
    // Verify the bot processed the message with case-insensitive wake word
    expect(recognizeIntent).toHaveBeenCalledWith(
      'what time is it?',
      'en',
      true
    );
    expect(mockMessage.reply).toHaveBeenCalled();
  });
  
  it('should not respond to messages without wake word', async () => {
    // Mock a message without a wake word
    mockMessage.content = 'hello there';
    
    await handler.handleMessage(mockMessage);
    
    // The bot should not reply to messages without wake words
    expect(mockMessage.reply).not.toHaveBeenCalled();
  });
  
  it('should handle mentions as wake words', async () => {
    // Mock a message with a mention
    mockMessage.mentions.has.mockReturnValue(true);
    mockMessage.mentions.users.set('bot123', { id: 'bot123' });
    mockMessage.content = '<@bot123> what time is it?';
    
    // Use mockReturnValue instead of mockResolvedValue
    recognizeIntent.mockReturnValue({
      intent: 'get_time',
      confidence: 0.9,
      entities: {},
      response: 'The time is 12:00 PM'
    });
    
    await handler.handleMessage(mockMessage);
    
    // The bot should respond to mentions
    expect(mockMessage.mentions.has).toHaveBeenCalledWith(mockClient.user);
    expect(recognizeIntent).toHaveBeenCalledWith(
      'what time is it?', // Should have mention removed
      'en',
      true // Should be in attentive mode
    );
    expect(mockMessage.reply).toHaveBeenCalledWith('The time is 12:00 PM');
  });
});
