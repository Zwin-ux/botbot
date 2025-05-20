/**
 * Test Handler - Hidden testing functionality for BotBot
 * This handler provides a natural language way to test the bot's functionality
 * without relying on the wake word mechanism
 */

const { recognizeIntent } = require('../utils/intentRecognizer');
const NaturalMessageHandler = require('./naturalMessageHandler');

class TestHandler {
  constructor(client, db) {
    this.client = client;
    this.db = db;
    this.naturalHandler = new NaturalMessageHandler(client, db);
    
    // Test phrases to try with the bot
    this.testPhrases = [
      { category: 'Wake Words', phrase: 'hey bot', description: 'Basic wake word' },
      { category: 'Wake Words', phrase: 'okay bot', description: 'Alternate wake word' },
      { category: 'Wake Words', phrase: 'yo bot', description: 'Casual wake word' },
      { category: 'Wake Words', phrase: 'bot', description: 'Minimal wake word' },
      { category: 'Wake Words', phrase: 'botbot', description: 'Double wake word' },
      { category: 'Wake Words', phrase: 'hey botbot', description: 'Combined wake word' },
      
      { category: 'Intents', phrase: 'hey bot, what can you do?', description: 'Help intent' },
      { category: 'Intents', phrase: 'hey bot, remind me to check the server in 10 minutes', description: 'Reminder intent' },
      { category: 'Intents', phrase: 'bot, I need help with something', description: 'Help/blocked intent' },
      { category: 'Intents', phrase: 'yo bot, I\'m stuck with this issue', description: 'Blocked intent' },
      { category: 'Intents', phrase: 'hey bot, start a meeting', description: 'Meeting intent' },
      { category: 'Intents', phrase: 'bot, let\'s play a game', description: 'Game intent' },
      
      { category: 'Edge Cases', phrase: 'HEY BOT', description: 'All caps wake word' },
      { category: 'Edge Cases', phrase: 'hey bot!', description: 'Wake word with punctuation' },
      { category: 'Edge Cases', phrase: 'hey   bot', description: 'Wake word with extra spaces' }
    ];
  }

  /**
   * Handle a message that might be a test command
   * @param {Message} message - The Discord message
   * @returns {boolean} - Whether the message was handled as a test command
   */
  async handleMessage(message) {
    const content = message.content.trim().toLowerCase();
    
    // Secret test command trigger phrases
    if (content === 'bot test mode' || content === 'test bot nlp' || content === 'nlp test') {
      await this.showTestMenu(message);
      return true;
    }
    
    // Handle test selection
    if (content.startsWith('test phrase ')) {
      const index = parseInt(content.replace('test phrase ', ''), 10);
      if (!isNaN(index) && index >= 1 && index <= this.testPhrases.length) {
        await this.runTest(message, index - 1);
        return true;
      }
    }
    
    // Handle category testing
    if (content.startsWith('test category ')) {
      const category = content.replace('test category ', '');
      await this.runCategoryTests(message, category);
      return true;
    }
    
    return false;
  }
  
  /**
   * Show the test menu with available test phrases
   * @private
   */
  async showTestMenu(message) {
    let response = '**🔍 BotBot Test Mode**\n\n';
    response += 'Use these natural language commands to test the bot:\n\n';
    
    // Group by category
    const categories = [...new Set(this.testPhrases.map(t => t.category))];
    
    for (const category of categories) {
      response += `**${category}**\n`;
      
      const categoryTests = this.testPhrases.filter(t => t.category === category);
      categoryTests.forEach((test, i) => {
        const testIndex = this.testPhrases.indexOf(test) + 1;
        response += `${testIndex}. \`${test.phrase}\` - ${test.description}\n`;
      });
      
      response += `• Type \`test category ${category.toLowerCase()}\` to run all ${category} tests\n\n`;
    }
    
    response += '\nTo run a specific test, type `test phrase [number]`\n';
    response += 'Example: `test phrase 3`\n\n';
    response += '**Note:** This is a hidden test mode for developers.';
    
    await message.reply(response);
  }
  
  /**
   * Run a specific test
   * @private
   */
  async runTest(message, index) {
    const test = this.testPhrases[index];
    
    await message.reply(`**Running Test:** \`${test.phrase}\` (${test.category} - ${test.description})`);
    
    // Create a simulated message with the test phrase
    const simulatedMessage = {
      content: test.phrase,
      author: message.author,
      channel: message.channel,
      mentions: message.mentions,
      reply: async (content) => {
        return message.reply(`**Bot Response:** ${content}`);
      }
    };
    
    // Process the message through the natural message handler
    try {
      await this.naturalHandler.handleMessage(simulatedMessage);
    } catch (error) {
      await message.reply(`**Error during test:** ${error.message}`);
      console.error('Test error:', error);
    }
  }
  
  /**
   * Run all tests in a category
   * @private
   */
  async runCategoryTests(message, categoryName) {
    const categoryTests = this.testPhrases.filter(
      t => t.category.toLowerCase() === categoryName.toLowerCase()
    );
    
    if (categoryTests.length === 0) {
      await message.reply(`No tests found for category "${categoryName}"`);
      return;
    }
    
    await message.reply(`**Running all ${categoryTests.length} tests in category:** ${categoryName}`);
    
    for (const test of categoryTests) {
      const index = this.testPhrases.indexOf(test);
      await this.runTest(message, index);
      
      // Add a small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    await message.reply(`**Completed all tests in category:** ${categoryName}`);
  }
}

module.exports = TestHandler;
