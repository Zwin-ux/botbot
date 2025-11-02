// Simple Discord bot test without database
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.once('ready', () => {
  console.log('✅ Discord bot is ready!');
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // Simple test responses
  if (message.content.includes('hello') || message.mentions.has(client.user)) {
    await message.reply('Hello! I\'m BotBot. Database is not connected yet, but I can respond!');
  }
  
  if (message.content.includes('test')) {
    await message.reply('✅ Discord connection working! Next step: fix database connection.');
  }
});

client.login(process.env.DISCORD_TOKEN);