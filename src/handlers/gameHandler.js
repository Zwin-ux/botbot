const GameManager = require('../features/games/gameManager');

class GameHandler {
  constructor(client, db) {
    this.client = client;
    this.gameManager = new GameManager(client, db);
    this.cooldowns = new Map(); // channelId -> lastGameTime
    this.COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown per channel
  }

  async handleMessage(msg) {
    const content = msg.content.toLowerCase().trim();
    
    // Check for game commands
    if (content.startsWith('start ')) {
      const gameType = content.slice(6).trim().toLowerCase();
      
      // Check cooldown
      const lastGame = this.cooldowns.get(msg.channel.id) || 0;
      const cooldownLeft = (lastGame + this.COOLDOWN) - Date.now();
      
      if (cooldownLeft > 0) {
        const minutesLeft = Math.ceil(cooldownLeft / (60 * 1000));
        return msg.reply(`Please wait ${minutesLeft} more minute(s) before starting another game in this channel.`);
      }
      
      // Handle different game types
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
          return this.showGameHelp(msg);
      }
    }
    
    // Handle game-specific commands
    if (content === 'join') {
      // This will be handled by the individual game handlers
      return;
    }
    
    if (content === 'end game' || content === 'stop game') {
      return this.endGame(msg);
    }
    
    if (content === 'games' || content === 'game help') {
      return this.showGameHelp(msg);
    }
  }
  
  async startEmojiRace(msg) {
    try {
      await this.gameManager.startGame(msg.channel, 'emoji-race', {
        chainLength: 3, // Default to 3 emojis in chain
        timeLimit: 30000 // 30 seconds
      });
      this.cooldowns.set(msg.channel.id, Date.now());
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
    
    msg.channel.send({ embeds: [helpEmbed] });
  }
}

module.exports = GameHandler;
