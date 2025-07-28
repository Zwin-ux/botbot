/**
 * Jest Test Setup
 * Configures global mocks and test environment
 */

// Mock timers to prevent hanging
jest.useFakeTimers();

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Discord.js components
jest.mock('discord.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    login: jest.fn().mockResolvedValue(),
    on: jest.fn(),
    user: { id: 'bot123', username: 'BotBot' },
  })),
  GatewayIntentBits: {
    Guilds: 1,
    GuildMessages: 2,
    MessageContent: 4,
    GuildMessageReactions: 8,
  },
  Partials: {
    Message: 'MESSAGE',
    Channel: 'CHANNEL',
    Reaction: 'REACTION',
  },
  EmbedBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setColor: jest.fn().mockReturnThis(),
    addFields: jest.fn().mockReturnThis(),
    setTimestamp: jest.fn().mockReturnThis(),
    setFooter: jest.fn().mockReturnThis(),
  })),
  ActionRowBuilder: jest.fn(),
  ButtonBuilder: jest.fn(),
  ButtonStyle: { Primary: 1, Secondary: 2 },
  ActivityType: { Playing: 0 },
}));

// Mock node-cron to prevent scheduler hanging
jest.mock('node-cron', () => ({
  schedule: jest.fn(),
  destroy: jest.fn(),
}));

// Mock SQLite3 database
jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => ({
    run: jest.fn((sql, params, callback) => {
      if (callback) callback(null);
    }),
    get: jest.fn((sql, params, callback) => {
      if (callback) callback(null, {});
    }),
    all: jest.fn((sql, params, callback) => {
      if (callback) callback(null, []);
    }),
    close: jest.fn((callback) => {
      if (callback) callback(null);
    }),
  })),
}));

// Mock fs operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(() => '{}'),
}));

// Mock path operations for cross-platform compatibility
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  resolve: jest.fn((...args) => args.join('/')),
  join: jest.fn((...args) => args.join('/')),
}));

// Set test timeout
jest.setTimeout(10000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});

// Clean up after all tests
afterAll(() => {
  jest.useRealTimers();
});
