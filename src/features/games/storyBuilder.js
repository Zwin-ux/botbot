import EventEmitter from 'events';

class StoryBuilder extends EventEmitter {
  constructor(client, channel, db, options = {}) {
    super();
    this.client = client;
    this.channel = channel;
    this.db = db;
    this.options = {
      minSentences: options.minSentences || 8,
      maxSentences: options.maxSentences || 12,
      turnTime: options.turnTime || 60000, // 1 minute
      ...options
    };
    this.state = 'waiting';
    this.story = [];
    this.participants = new Set();
    this.currentTurn = null;
    this.turnTimeout = null;
  }

  async start() {
    this.state = 'starting';
    this.story = ['Once upon a time...'];
    this.targetLength = this.getRandomLength();
    
    this.message = await this.channel.send({
      content: '📖 **Story Builder** 📖\n' +
              'I\'ll start a story, and we\'ll take turns adding to it!\n' +
              'Type `join` to participate!\n' +
              'The story will be between 8-12 sentences long.\n' +
              'Type `start` when ready to begin!'
    });
    
    this.collector = this.channel.createMessageCollector({
      filter: (msg) => !msg.author.bot && (msg.content.toLowerCase() === 'join' || msg.content.toLowerCase() === 'start'),
      time: 300000 // 5 minutes to join
    });
    
    this.collector.on('collect', (msg) => {
      if (msg.content.toLowerCase() === 'join') {
        this.handleJoin(msg.author);
      } else if (msg.content.toLowerCase() === 'start' && this.participants.size > 0) {
        this.startTurns();
      }
    });
    
    this.collector.on('end', () => {
      if (this.state !== 'started' && this.participants.size > 0) {
        this.startTurns();
      } else if (this.participants.size === 0) {
        this.end('Not enough players joined.');
      }
    });
    
    this.state = 'waiting';
  }
  
  handleJoin(user) {
    if (this.participants.has(user.id)) {
      this.channel.send(`${user.username}, you're already in the game!`);
      return;
    }
    
    this.participants.add({
      id: user.id,
      username: user.username,
      sentences: 0
    });
    
    this.channel.send(`${user.username} has joined the story!`);
  }
  
  startTurns() {
    if (this.state === 'started') return;
    
    this.state = 'started';
    this.participants = Array.from(this.participants);
    this.currentPlayerIndex = 0;
    
    if (this.collector) {
      this.collector.stop();
    }
    
    this.nextTurn();
  }
  
  nextTurn() {
    if (this.state !== 'started') return;
    
    // Check if story is complete
    if (this.story.length >= this.targetLength) {
      this.endStory();
      return;
    }
    
    // Get next player
    this.currentPlayer = this.participants[this.currentPlayerIndex];
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.participants.length;
    
    // Clear any existing timeout
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
    }
    
    // Prompt for next sentence
    this.channel.send({
      content: `📝 ${this.story.join(' ')}` +
               `\n\n<@${this.currentPlayer.id}>, it's your turn! ` +
               `Add one sentence to continue the story. (${this.story.length}/${this.targetLength} sentences)`
    });
    
    // Set up collector for next sentence
    this.collector = this.channel.createMessageCollector({
      filter: (msg) => msg.author.id === this.currentPlayer.id,
      max: 1,
      time: this.options.turnTime
    });
    
    this.collector.on('collect', (msg) => {
      this.handleSentence(msg);
    });
    
    this.collector.on('end', (collected) => {
      if (collected.size === 0) {
        this.channel.send(`⏰ Time's up! Skipping turn.`);
        this.nextTurn();
      }
    });
    
    // Set timeout for turn
    this.turnTimeout = setTimeout(() => {
      if (this.collector && !this.collector.ended) {
        this.collector.stop();
      }
    }, this.options.turnTime);
  }
  
  handleSentence(msg) {
    const sentence = msg.content.trim();
    
    // Basic content filtering
    if (sentence.length > 500) {
      this.channel.send('Please keep sentences under 500 characters.');
      return;
    }
    
    if (sentence.split(/[.!?]+/).length > 3) {
      this.channel.send('Please add only one sentence at a time.');
      return;
    }
    
    // Add to story
    this.story.push(sentence);
    this.currentPlayer.sentences++;
    
    // Continue to next turn
    this.nextTurn();
  }
  
  endStory() {
    this.state = 'ended';
    
    // Clean up
    if (this.collector) {
      this.collector.stop();
    }
    
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
    }
    
    // Generate title
    const firstSentence = this.story[0].substring(0, 50);
    const title = `📚 "${firstSentence}..." - A Collaborative Story`;
    
    // Send final story
    this.channel.send({
      content: `🎭 **${title}**\n\n${this.story.join(' ')}`
    });
    
    // Save to database
    this.saveStory(title);
    
    this.emit('end');
  }
  
  getRandomLength() {
    return Math.floor(Math.random() * (this.options.maxSentences - this.options.minSentences + 1)) + this.options.minSentences;
  }
  
  async saveStory(title) {
    // Implement story saving to database
  }
  
  end(reason) {
    if (this.state === 'ended') return;
    this.state = 'ended';
    
    if (this.collector) {
      this.collector.stop();
    }
    
    if (this.turnTimeout) {
      clearTimeout(this.turnTimeout);
    }
    
    if (reason) {
      this.channel.send(`❌ ${reason}`);
    }
    
    this.emit('end');
  }
}

export default StoryBuilder;
