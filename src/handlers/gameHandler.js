const GameManager = require('../features/games/gameManager');
const { getSetupSuggestion } = require('../features/setupSuggest');
const { 
  RateLimiter, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle 
} = require('discord.js');
const { 
  COLORS, 
  EMOJIS, 
  createGameEmbed, 
  createCountdownEmbed, 
  createPlayerListEmbed 
} = require('../utils/embedUtils');

// Rate limiting configuration
const RATE_LIMIT = {
  GAME_START: {
    points: 3,      // 3 game starts
    duration: 60,   // per 60 seconds
    cooldown: 300   // 5 minute cooldown if rate limited
  },
  GAME_COMMAND: {
    points: 10,     // 10 commands
    duration: 30    // per 30 seconds
  }
};

class GameHandler {
  constructor(client, db) {
    this.client = client;
    this.gameManager = new GameManager(client, db);
    this.cooldowns = new Map(); // channelId -> { lastGameTime, lastGameType }
    this.COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown per channel
    
    // Initialize rate limiters
    this.rateLimiters = {
      gameStart: new RateLimiter(RATE_LIMIT.GAME_START.points, RATE_LIMIT.GAME_START.duration, true),
      gameCommand: new RateLimiter(RATE_LIMIT.GAME_COMMAND.points, RATE_LIMIT.GAME_COMMAND.duration, true)
    };
  }

  /**
   * Check if a user is rate limited
   * @param {Message} msg - The message object
   * @param {string} type - The rate limit type ('gameStart' or 'gameCommand')
   * @returns {Object} - { rateLimited: boolean, message: string }
   */
  checkRateLimit(msg, type) {
    const userId = msg.author.id;
    const channelId = msg.channel.id;
    const key = `${userId}:${channelId}`;
    
    try {
      // Check command rate limiting first
      if (type === 'gameCommand') {
        const commandLimit = this.rateLimiters.gameCommand.take(key);
        if (!commandLimit) {
          return {
            rateLimited: true,
            message: 'You\'re using game commands too quickly. Please slow down.'
          };
        }
      }
      
      // Check game start rate limiting
      if (type === 'gameStart') {
        const gameStartLimit = this.rateLimiters.gameStart.take(key);
        if (!gameStartLimit) {
          return {
            rateLimited: true,
            message: `You're starting games too quickly. Please wait ${RATE_LIMIT.GAME_START.duration} seconds between game starts.`
          };
        }
      }
      
      return { rateLimited: false };
    } catch (error) {
      console.error('Rate limit check failed:', error);
      return { rateLimited: false }; // Fail open to not block legitimate users
    }
  }

  /**
   * Validate game start request
   * @param {Message} msg - The message object
   * @param {string} gameType - The type of game to validate
   * @returns {Object} - { valid: boolean, error?: string }
   */
  async validateGameStart(msg, gameType) {
    // Check if user is rate limited
    const rateLimitCheck = this.checkRateLimit(msg, 'gameStart');
    if (rateLimitCheck.rateLimited) {
      return { valid: false, error: rateLimitCheck.message };
    }

    // Check channel cooldown
    const now = Date.now();
    const channelCooldown = this.cooldowns.get(msg.channel.id) || { lastGameTime: 0 };
    const cooldownLeft = (channelCooldown.lastGameTime + this.COOLDOWN) - now;
    
    if (cooldownLeft > 0) {
      const minutesLeft = Math.ceil(cooldownLeft / (60 * 1000));
      return { 
        valid: false, 
        error: `Please wait ${minutesLeft} more minute(s) before starting another game in this channel.` 
      };
    }

    // Check if another game is already active in this channel
    if (this.gameManager.activeGames.has(msg.channel.id)) {
      return { 
        valid: false, 
        error: 'There is already an active game in this channel. Type "end game" to end it first.' 
      };
    }

    // Validate game type
    const validGameTypes = ['emoji race', 'emojirace', 'story', 'story builder', 'who said it', 'quote game'];
    if (!validGameTypes.includes(gameType)) {
      return { 
        valid: false, 
        error: `Invalid game type. Available games: emoji race, story builder, who said it` 
      };
    }

    return { valid: true };
  }

  /**
   * Handle joining a game
   * @param {Message} msg - The message object
   */
  async handleJoinGame(msg) {
    const game = this.gameManager.getGame(msg.channel.id);
    if (!game) {
      const embed = createGameEmbed(null, {
        title: 'No Active Game',
        description: 'There\'s no active game in this channel. Start one with `start game`!',
        color: COLORS.WARNING,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [embed] });
    }
    
    try {
      await game.addPlayer(msg.author);
      
      // Get updated player list
      const players = Array.from(game.players?.values() || []);
      const playerListEmbed = createPlayerListEmbed(
        players,
        'Player Joined'
      );
      
      return msg.reply({ 
        content: `🎉 ${msg.author} has joined the game!`,
        embeds: [playerListEmbed]
      });
    } catch (error) {
      console.error('Error joining game:', error);
      const embed = createGameEmbed(null, {
        title: 'Error',
        description: `Couldn't join the game: ${error.message}`,
        color: COLORS.DANGER,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [embed] });
    }
  }

  /**
   * End the current game in the channel
   * @param {Message} msg - The message that triggered the command
   */
  async endGame(msg) {
    const game = this.gameManager.getGame(msg.channel.id);
    if (!game) {
      const embed = createGameEmbed(null, {
        title: 'No Active Game',
        description: 'There\'s no active game in this channel.',
        color: COLORS.WARNING,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [embed] });
    }
    
    // Check if the user is the game starter or has admin permissions
    if (msg.member && !msg.member.permissions.has('MANAGE_MESSAGES')) {
      const embed = createGameEmbed(null, {
        title: 'Permission Denied',
        description: 'Only moderators can end the game.',
        color: COLORS.DANGER,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [embed] });
    }
    
    try {
      const gameType = game.constructor.name.toLowerCase();
      const gameName = {
        'emojirace': 'Emoji Race',
        'storybuilder': 'Story Builder',
        'whosaidit': 'Who Said It'
      }[gameType] || 'game';
      
      // End the game
      this.gameManager.endGame(msg.channel.id);
      
      // Create a game over embed
      const embed = createGameEmbed(gameType, {
        title: 'Game Ended',
        description: `The ${gameName} game has been ended by ${msg.author}.`,
        color: COLORS.NEUTRAL,
        emoji: EMOJIS.ENDED
      });
      
      return msg.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error ending game:', error);
      const embed = createGameEmbed(null, {
        title: 'Error',
        description: `Failed to end the game: ${error.message}`,
        color: COLORS.DANGER,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [embed] });
    }
  }

  /**
   * Show game help information
   * @param {Message} msg - The message object
   */
  async showGameHelp(msg) {
    const helpEmbed = {
      color: 0x0099ff,
      title: '🎮 Available Games',
      description: 'Start any game by typing `start [game name]`',
      fields: [
        {
          name: 'Emoji Race',
          value: '`start emoji race` - Race to be the first to react with the correct emoji!',
          inline: true
        },
        {
          name: 'Story Builder',
          value: '`start story` - Collaborate to build a story one sentence at a time!',
          inline: true
        },
        {
          name: 'Who Said It?',
          value: '`start who said it` - Guess who said the famous quote!',
          inline: true
        },
        {
          name: 'Game Controls',
          value: '`join` - Join a game in progress\n' +
                 '`end game` - End the current game (moderators only)\n' +
                 '`games` - Show this help message',
        }
      ]
    };
    
    // Remove all ! from help text and examples for natural language
    helpEmbed.description = 'Start any game by typing something like "start emoji race" or "start story".';
    helpEmbed.fields = helpEmbed.fields.map(f => ({ ...f, value: f.value.replace(/`!?(start|join|end|games)[^`]*`/g, match => match.replace(/!/g, '')) }));
    msg.channel.send({ embeds: [helpEmbed] });
  }

  /**
   * Handle incoming messages for game commands
   * @param {Message} msg - The message object
   */
  async handleMessage(msg) {
    // Don't process bot messages
    if (msg.author.bot) return;

    const content = msg.content.toLowerCase().trim();
    
    try {
      // Handle game start command
      if (content.startsWith('start ')) {
        const gameType = content.slice(6).trim();
        
        // Validate the game start request
        const validation = await this.validateGameStart(msg, gameType);
        if (!validation.valid) {
          return msg.reply(validation.error);
        }
        
        // Start the appropriate game
        switch(gameType) {
          case 'emoji race':
          case 'emojirace':
            return this.startEmojiRace(msg);
            
          case 'story':
          case 'story builder':
            return this.startStoryBuilder(msg);
            
          case 'who said it':
          case 'quote game':
            return this.startWhoSaidIt(msg);
            
          default:
            const embed = createGameEmbed(null, {
              title: 'Game Not Found',
              description: 'I couldn\'t find that game. Here are the available games:',
              color: COLORS.WARNING,
              emoji: EMOJIS.ERROR
            });
            
            const row = new ActionRowBuilder()
              .addComponents(
                new ButtonBuilder()
                  .setLabel('View Games')
                  .setStyle(ButtonStyle.Primary)
                  .setCustomId('view_games')
              );
              
            return msg.reply({ 
              embeds: [embed],
              components: [row]
            });
        }
      }
      
      // Handle other game commands if they're not rate limited
      const rateLimitCheck = this.checkRateLimit(msg, 'gameCommand');
      if (rateLimitCheck.rateLimited) {
        return; // Silently ignore rate-limited commands
      }
      
      // Process other game commands
      if (content === 'join') {
        return this.handleJoinGame(msg);
      }
      
      if (content === 'end game' || content === 'stop game') {
        return this.endGame(msg);
      }
      
      if (content === 'games' || content === 'game help') {
        return this.showGameHelp(msg);
      }
      
      // Handle game-specific messages if a game is active
      const game = this.gameManager.activeGames.get(msg.channel.id);
      if (game && game.handlePlayerMessage) {
        await game.handlePlayerMessage(msg);
      }
      
    } catch (error) {
      console.error('Error in game handler:', error);
      msg.reply('An error occurred while processing your request. Please try again.');
    }
  }
  
  /**
   * Start an emoji race game
   * @param {Message} msg - The message that triggered the game
   */
  async startEmojiRace(msg) {
    try {
      // Create a starting embed
      const startingEmbed = createGameEmbed('emoji-race', {
        title: 'Starting Emoji Race',
        description: 'Get ready to race! The game will begin in a moment...',
        emoji: EMOJIS.WAITING
      });
      
      const startingMessage = await msg.reply({ embeds: [startingEmbed] });
      
      // Start the game
      await this.gameManager.startGame(msg.channel, 'emoji-race', {
        chainLength: 3, // Default to 3 emojis in chain
        timeLimit: 30000 // 30 seconds
      });
      
      this.cooldowns.set(msg.channel.id, Date.now());
      
      // Update with join instructions
      const joinEmbed = createGameEmbed('emoji-race', {
        title: 'Emoji Race',
        description: 'Type `join` to join the race!',
        emoji: EMOJIS.JOIN,
        fields: [
          { name: 'How to Play', value: 'Be the first to type the emoji sequence correctly!' },
          { name: 'Time Limit', value: '30 seconds per round' }
        ]
      });
      
      return startingMessage.edit({ embeds: [joinEmbed] });
    } catch (error) {
      console.error('Error starting emoji race:', error);
      const errorEmbed = createGameEmbed('emoji-race', {
        title: 'Error',
        description: `Couldn't start Emoji Race: ${error.message}`,
        color: COLORS.DANGER,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [errorEmbed] });
    }
  }
  
  /**
   * Start a story builder game
   * @param {Message} msg - The message that triggered the game
   */
  async startStoryBuilder(msg) {
    try {
      // Create a starting embed
      const startingEmbed = createGameEmbed('story-builder', {
        title: 'Starting Story Builder',
        description: 'Get ready to build an amazing story together!',
        emoji: EMOJIS.WAITING
      });
      
      const startingMessage = await msg.reply({ embeds: [startingEmbed] });
      
      // Start the game
      await this.gameManager.startGame(msg.channel, 'story-builder', {
        minSentences: 5,
        maxSentences: 10,
        turnTime: 60000 // 1 minute per turn
      });
      
      this.cooldowns.set(msg.channel.id, Date.now());
      
      // Update with join instructions
      const joinEmbed = createGameEmbed('story-builder', {
        title: 'Story Builder',
        description: 'Type `join` to join the story!',
        emoji: EMOJIS.JOIN,
        fields: [
          { name: 'How to Play', value: 'Take turns adding to the story, one sentence at a time!' },
          { name: 'Time Limit', value: '1 minute per turn' },
          { name: 'Story Length', value: '5-10 sentences' }
        ]
      });
      
      return startingMessage.edit({ embeds: [joinEmbed] });
    } catch (error) {
      console.error('Error starting story builder:', error);
      const errorEmbed = createGameEmbed('story-builder', {
        title: 'Error',
        description: `Couldn't start Story Builder: ${error.message}`,
        color: COLORS.DANGER,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [errorEmbed] });
    }
  }
  
  /**
   * Start a Who Said It game
   * @param {Message} msg - The message that triggered the game
   */
  async startWhoSaidIt(msg) {
    try {
      // Create a starting embed
      const startingEmbed = createGameEmbed('who-said-it', {
        title: 'Starting Who Said It?',
        description: 'Get ready to test your knowledge of your server members!',
        emoji: EMOJIS.WAITING
      });
      
      const startingMessage = await msg.reply({ embeds: [startingEmbed] });
      
      // Start the game
      await this.gameManager.startGame(msg.channel, 'who-said-it', {
        timeLimit: 45000, // 45 seconds
        hintDelay: 15000, // 15 seconds
        maxHints: 3
      });
      
      this.cooldowns.set(msg.channel.id, Date.now());
      
      // Update with join instructions
      const joinEmbed = createGameEmbed('who-said-it', {
        title: 'Who Said It?',
        description: 'Type `join` to join the game!',
        emoji: EMOJIS.JOIN,
        fields: [
          { name: 'How to Play', value: 'Guess which server member said the quote!' },
          { name: 'Time Limit', value: '45 seconds per round' },
          { name: 'Hints', value: 'Get hints after 15 seconds' }
        ]
      });
      
      return startingMessage.edit({ embeds: [joinEmbed] });
    } catch (error) {
      console.error('Error starting Who Said It:', error);
      const errorEmbed = createGameEmbed('who-said-it', {
        title: 'Error',
        description: `Couldn't start Who Said It?: ${error.message}`,
        color: COLORS.DANGER,
        emoji: EMOJIS.ERROR
      });
      return msg.reply({ embeds: [errorEmbed] });
    }
  }
  
  async endGame(msg) {
    const game = this.gameManager.getGame(msg.channel.id);
    if (!game) {
      return msg.reply('There is no active game in this channel.');
    }
    
    // Check if the user is the game starter or has admin permissions
    if (msg.member && !msg.member.permissions.has('MANAGE_MESSAGES')) {
      return msg.reply('Only moderators can end the game.');
    }
    
    this.gameManager.endGame(msg.channel.id);
    msg.channel.send('The game has been ended.');
  }
  
  showGameHelp(msg) {
    const helpEmbed = {
      color: 0x0099ff,
      title: '🎮 Available Games',
      description: 'Start any game by typing `start [game name]`',
      fields: [
        {
          name: 'Emoji Race',
          value: '`start emoji race` - Race to be the first to react with the correct emoji!',
          inline: true
        },
        {
          name: 'Story Builder',
          value: '`start story` - Collaborate to build a story one sentence at a time!',
          inline: true
        },
        {
          name: 'Who Said It?',
          value: '`start who said it` - Guess who said the famous quote!',
          inline: true
        },
        {
          name: 'Game Controls',
          value: '`join` - Join a game in progress\n' +
                 '`end game` - End the current game (moderators only)\n' +
                 '`games` - Show this help message',
        }
      ]
    };
    
    // Remove all ! from help text and examples for natural language
    helpEmbed.description = 'Start any game by typing something like "start emoji race" or "start story".';
    helpEmbed.fields = helpEmbed.fields.map(f => ({ ...f, value: f.value.replace(/`!?(start|join|end|games)[^`]*`/g, match => match.replace(/!/g, '')) }));
    msg.channel.send({ embeds: [helpEmbed] });
  }
}

module.exports = GameHandler;
