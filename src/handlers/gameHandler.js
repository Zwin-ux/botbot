const GameManager = require('../features/games/gameManager');
const { getSetupSuggestion } = require('../features/setupSuggest');
const { RateLimiter } = require('discord.js');

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
    const game = this.gameManager.activeGames.get(msg.channel.id);
    if (!game) {
      return msg.reply('There is no active game in this channel. Start one with "start [game name]"');
    }
    
    try {
      await game.addPlayer(msg.author);
      return msg.reply(`${msg.author.username} has joined the game!`);
    } catch (error) {
      console.error('Error adding player to game:', error);
      return msg.reply('Failed to join the game. Please try again.');
    }
  }

  /**
   * End the current game in the channel
   * @param {Message} msg - The message object
   */
  async endGame(msg) {
    const game = this.gameManager.activeGames.get(msg.channel.id);
    if (!game) {
      return msg.reply('There is no active game in this channel.');
    }
    
    // Check if the user is the game starter or has admin permissions
    if (msg.author.id !== game.startedBy && !msg.member.permissions.has('MANAGE_MESSAGES')) {
      return msg.reply('Only the game starter or an admin can end the game.');
    }
    
    try {
      await game.end();
      this.gameManager.activeGames.delete(msg.channel.id);
      return msg.reply('Game ended.');
    } catch (error) {
      console.error('Error ending game:', error);
      return msg.reply('Failed to end the game. Please try again.');
    }
  }

  /**
   * Show game help information
   * @param {Message} msg - The message object
   */
  async showGameHelp(msg) {
    const helpEmbed = {
      color: 0x0099ff,
      title: 'Game Commands',
      description: 'Here are the available games and commands:',
      fields: [
        {
          name: 'Start a Game',
          value: 'start [game name] - Start a new game\n' +
                 'Available games: emoji race, story builder, who said it'
        },
        {
          name: 'Game Commands',
          value: 'join - Join the current game\n' +
                 'end game - End the current game (game starter or admin only)'
        },
        {
          name: 'Game Descriptions',
          value: '• Emoji Race: Race to type the correct emoji sequence\n' +
                 '• Story Builder: Take turns building a story one word at a time\n' +
                 '• Who Said It: Guess which server member said a quote'
        }
      ],
      timestamp: new Date(),
      footer: { text: 'Have fun playing!' }
    };

    return msg.channel.send({ embeds: [helpEmbed] });
  }

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
            const { embed, row } = getSetupSuggestion('game');
            return msg.reply({ 
              content: 'I couldn\'t find that game. Here are the available games:', 
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
  
  async startEmojiRace(msg) {
    try {
      await this.gameManager.startGame(msg.channel, 'emoji-race', {
        chainLength: 3, // Default to 3 emojis in chain
        timeLimit: 30000 // 30 seconds
      });
      this.cooldowns.set(msg.channel.id, Date.now());
      // Confetti/celebratory feedback for first-time game start
      msg.reply('🎉 Emoji Race started! Get ready to race!');
    } catch (error) {
      msg.reply(`Couldn't start Emoji Race: ${error.message}`);
    }
  }
  
  async startStoryBuilder(msg) {
    try {
      await this.gameManager.startGame(msg.channel, 'story-builder', {
        minSentences: 5,
        maxSentences: 10,
        turnTime: 60000 // 1 minute per turn
      });
      this.cooldowns.set(msg.channel.id, Date.now());
      // Confetti/celebratory feedback for first-time game start
      msg.reply('🎉 Story Builder started! Let the creativity flow!');
    } catch (error) {
      msg.reply(`Couldn't start Story Builder: ${error.message}`);
    }
  }
  
  async startWhoSaidIt(msg) {
    try {
      await this.gameManager.startGame(msg.channel, 'who-said-it', {
        timeLimit: 45000, // 45 seconds
        hintDelay: 15000, // 15 seconds
        maxHints: 3
      });
      this.cooldowns.set(msg.channel.id, Date.now());
      // Confetti/celebratory feedback for first-time game start
      msg.reply('🎉 Who Said It? started! Guess the quote!');
    } catch (error) {
      msg.reply(`Couldn't start Who Said It?: ${error.message}`);
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
