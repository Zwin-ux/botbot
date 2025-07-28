const EventEmitter = require("events");

// Safe emojis that work across all platforms
const EMOJIS = ["🔥", "🚀", "⭐", "🎯", "🎲", "🎮", "🏆", "🍎", "⚡", "🌈"];

class EmojiRace extends EventEmitter {
  constructor(client, channel, db, options = {}) {
    super();
    this.client = client;
    this.channel = channel;
    this.db = db;
    this.options = {
      chainLength: options.chainLength || 1,
      timeLimit: options.timeLimit || 30000, // 30 seconds
      ...options,
    };
    this.state = "waiting";
    this.players = new Map();
    this.currentEmoji = null;
    this.chain = [];
    this.timeout = null;
  }

  async start() {
    this.state = "starting";
    this.chain = this.generateEmojiChain();

    const message = await this.channel.send({
      content:
        "🏁 **Emoji Race!** 🏁\n" +
        `React with: ${this.chain[0]} to start!\n` +
        `Chain length: ${this.chain.length} emojis`,
    });

    this.message = message;
    this.currentEmoji = this.chain[0];

    // Add reaction collector
    this.collector = message.createReactionCollector({
      filter: (reaction, user) => {
        return (
          !user.bot &&
          reaction.emoji.name === this.currentEmoji &&
          !this.players.has(user.id)
        );
      },
      time: this.options.timeLimit,
    });

    this.collector.on("collect", (reaction, user) => {
      this.handleReaction(reaction, user);
    });

    this.collector.on("end", () => {
      this.end();
    });

    this.state = "running";
  }

  generateEmojiChain() {
    const chain = [];
    for (let i = 0; i < this.options.chainLength; i++) {
      let emoji;
      do {
        emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      } while (i > 0 && emoji === chain[i - 1]);
      chain.push(emoji);
    }
    return chain;
  }

  async handleReaction(reaction, user) {
    if (this.state !== "running") return;

    const player = {
      id: user.id,
      username: user.username,
      progress: 1,
      startTime: Date.now(),
    };

    this.players.set(user.id, player);

    if (player.progress === this.chain.length) {
      this.endGame(user);
    } else {
      this.currentEmoji = this.chain[player.progress];
      await this.message.react(this.currentEmoji);
    }
  }

  async endGame(winner) {
    if (this.state !== "running") return;
    this.state = "ended";

    if (this.collector) {
      this.collector.stop();
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    // Save to leaderboard
    await this.saveToLeaderboard(winner);

    // Announce winner
    await this.channel.send(`🎉 <@${winner.id}> won the emoji race! 🎉`);

    this.emit("end");
  }

  async saveToLeaderboard(winner) {
    // Implement leaderboard logic here
    // This would involve saving to the database
  }

  end() {
    if (this.state === "ended") return;
    this.state = "ended";

    if (this.collector) {
      this.collector.stop();
    }

    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.emit("end");
  }
}

module.exports = EmojiRace;
