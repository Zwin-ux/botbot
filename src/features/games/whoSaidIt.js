import EventEmitter from 'events';

// Default quotes (can be expanded or loaded from a database)
const DEFAULT_QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" }
];

class WhoSaidIt extends EventEmitter {
  constructor(client, channel, db, options = {}) {
    super();
    this.client = client;
    this.channel = channel;
    this.db = db;
    this.options = {
      timeLimit: options.timeLimit || 30000, // 30 seconds
      hintDelay: options.hintDelay || 15000, // 15 seconds
      maxHints: options.maxHints || 2,
      ...options
    };
    this.state = 'waiting';
    this.players = new Map();
    this.currentQuote = null;
    this.hintsGiven = 0;
    this.hintTimeout = null;
  }

  async start() {
    this.state = 'starting';
    
    // Get a random quote (in a real app, this would be from a database)
    this.currentQuote = this.getRandomQuote();
    
    // Send the quote
    this.message = await this.channel.send({
      content: '🤔 **Who Said It?** 🤔\n' +
              'I\'ll give you a quote, and you have to guess who said it!\n\n' +
              '> ' + this.currentQuote.text
    });
    
    // Set up collector for guesses
    this.collector = this.channel.createMessageCollector({
      filter: (msg) => !msg.author.bot,
      time: this.options.timeLimit
    });
    
    this.collector.on('collect', (msg) => {
      this.handleGuess(msg);
    });
    
    this.collector.on('end', () => {
      this.end();
    });
    
    // Set up hint timer
    this.setupHintTimer();
    
    this.state = 'running';
  }
  
  getRandomQuote() {
    // In a real app, this would query the database
    return DEFAULT_QUOTES[Math.floor(Math.random() * DEFAULT_QUOTES.length)];
  }
  
  setupHintTimer() {
    this.hintTimeout = setTimeout(() => {
      if (this.state === 'running' && this.hintsGiven < this.options.maxHints) {
        this.giveHint();
        this.setupHintTimer();
      }
    }, this.options.hintDelay);
  }
  
  giveHint() {
    if (!this.currentQuote) return;
    
    this.hintsGiven++;
    const hintType = this.hintsGiven % 3; // Rotate through hint types
    
    let hint = '';
    const nameParts = this.currentQuote.author.split(' ');
    
    switch (hintType) {
      case 0: // First letter of first and last name
        hint = `Hint: The author's initials are ${nameParts[0][0]}.${nameParts[nameParts.length - 1][0]}.`;
        break;
      case 1: // Name length
        hint = `Hint: The author's name has ${this.currentQuote.author.length} letters.`;
        break;
      case 2: // First name
        hint = `Hint: The author's first name is ${nameParts[0]}.`;
        break;
    }
    
    this.channel.send(hint);
  }
  
  handleGuess(msg) {
    if (this.state !== 'running') return;
    
    const guess = msg.content.trim().toLowerCase();
    const correct = this.currentQuote.author.toLowerCase();
    
    // Check if the guess is correct (allows for partial matches)
    if (guess === correct.toLowerCase() || 
        correct.toLowerCase().includes(guess) ||
        guess.split(' ').some(word => correct.toLowerCase().includes(word))) {
      
      // Clear timeouts
      if (this.hintTimeout) {
        clearTimeout(this.hintTimeout);
      }
      
      // Announce winner
      this.channel.send(`🎉 Correct! <@${msg.author.id}> got it! The answer was **${this.currentQuote.author}**.`);
      
      // Update score
      this.updateScore(msg.author);
      
      // End the game
      this.end();
    }
  }
  
  async updateScore(user) {
    // Implement score tracking in the database
    // This would involve incrementing the user's score
  }
  
  end() {
    if (this.state === 'ended') return;
    this.state = 'ended';
    
    // Clean up
    if (this.collector) {
      this.collector.stop();
    }
    
    if (this.hintTimeout) {
      clearTimeout(this.hintTimeout);
    }
    
    // If game ended without a winner
    if (this.state === 'running') {
      this.channel.send(`Time's up! The answer was **${this.currentQuote.author}**.`);
    }
    
    this.emit('end');
  }
}

export default WhoSaidIt;
