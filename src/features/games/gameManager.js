import EmojiRace from './emojiRace.js';
import StoryBuilder from './storyBuilder.js';
import WhoSaidIt from './whoSaidIt.js';

class GameManager {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.activeGames = new Map(); // channelId -> game
    this.gameTypes = {
      'emoji-race': EmojiRace,
      'story-builder': StoryBuilder,
      'who-said-it': WhoSaidIt
    };
  }

  async startGame(channel, gameType, options = {}) {
    if (this.activeGames.has(channel.id)) {
      return { error: 'There is already an active game in this channel.' };
    }

    const GameClass = this.gameTypes[gameType];
    if (!GameClass) {
      return { error: 'Unknown game type.' };
    }

    const game = new GameClass(this.client, channel, this.db, options);
    this.activeGames.set(channel.id, game);

    game.on('end', () => {
      this.activeGames.delete(channel.id);
    });

    try {
      await game.start();
      return { success: true };
    } catch (error) {
      this.activeGames.delete(channel.id);
      return { error: 'Failed to start game: ' + error.message };
    }
  }

  endGame(channelId) {
    const game = this.activeGames.get(channelId);
    if (game) {
      game.end();
      this.activeGames.delete(channelId);
      return true;
    }
    return false;
  }

  getGame(channelId) {
    return this.activeGames.get(channelId);
  }
}

export default GameManager;
