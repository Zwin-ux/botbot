require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const OpenAI = require('openai');

// Simple in-memory storage (replace with Redis later)
const storage = {
  users: new Map(),
  agents: new Map(),
  conversations: new Map(),
  messages: new Map(),
  
  async getOrCreateUser(discordId, username) {
    const userId = `user:${discordId}`;
    if (!this.users.has(userId)) {
      this.users.set(userId, {
        discordId,
        username,
        createdAt: Date.now()
      });
    }
    return userId;
  },
  
  async createAgent(userId, name, persona) {
    const agentId = `agent:${Date.now()}:${Math.random().toString(36).substr(2, 6)}`;
    const systemPrompt = `You are ${name}, ${persona}. You are a Discord bot companion with persistent memory. Be helpful, engaging, and remember what users tell you. Keep responses under 2000 characters.`;
    
    this.agents.set(agentId, {
      userId,
      name,
      persona,
      systemPrompt,
      mood: { valence: 0.7, arousal: 0.6, dominance: 0.5 },
      energy: 100,
      createdAt: Date.now()
    });
    
    return { agentId, agent: this.agents.get(agentId) };
  },
  
  async getUserAgents(userId) {
    const agents = [];
    for (const [agentId, agent] of this.agents) {
      if (agent.userId === userId) {
        agents.push({ id: agentId, ...agent });
      }
    }
    return agents;
  },
  
  async getAgent(agentId) {
    return this.agents.get(agentId);
  },
  
  async getOrCreateConversation(agentId, channelId) {
    const conversationId = `conv:${agentId}:${channelId}`;
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        agentId,
        channelId,
        messages: [],
        createdAt: Date.now()
      });
    }
    return conversationId;
  },
  
  async addMessage(conversationId, sender, content) {
    const conversation = this.conversations.get(conversationId);
    if (conversation) {
      conversation.messages.push({
        sender,
        content,
        timestamp: Date.now()
      });
      
      // Keep only last 20 messages
      if (conversation.messages.length > 20) {
        conversation.messages = conversation.messages.slice(-20);
      }
    }
  },
  
  async getMessages(conversationId, limit = 10) {
    const conversation = this.conversations.get(conversationId);
    return conversation ? conversation.messages.slice(-limit) : [];
  }
};

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

client.once('ready', () => {
  console.log('🤖 BotBot is ready!');
  console.log(`Logged in as ${client.user.tag}`);
  console.log('Try these commands:');
  console.log('  @BotBot adopt a curious scientist named Atlas');
  console.log('  @BotBot hello');
  console.log('  @BotBot help');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  const userId = await storage.getOrCreateUser(message.author.id, message.author.username);
  const isMentioned = message.mentions.has(client.user);
  const isDM = !message.guild;
  
  if (!isMentioned && !isDM) return;
  
  const content = message.content.replace(`<@${client.user.id}>`, '').trim();
  
  try {
    // Parse commands
    if (content.match(/adopt\s+(?:a\s+)?(.+?)\s+named\s+(\w+)/i)) {
      await handleAdopt(message, content, userId);
    } else if (content.match(/help/i)) {
      await handleHelp(message);
    } else if (content.match(/agents|list/i)) {
      await handleListAgents(message, userId);
    } else {
      await handleChat(message, content, userId);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    await message.reply('Sorry, I encountered an error. Please try again.');
  }
});

async function handleAdopt(message, content, userId) {
  const match = content.match(/adopt\s+(?:a\s+)?(.+?)\s+named\s+(\w+)/i);
  if (!match) {
    await message.reply('Please use the format: `adopt a [persona] named [name]`');
    return;
  }
  
  const [, persona, name] = match;
  const { agentId, agent } = await storage.createAgent(userId, name, persona);
  
  await message.reply(`🎉 You've adopted **${name}**! ${persona}\n\nTry talking to them: \`@BotBot hello ${name}\``);
}

async function handleHelp(message) {
  const help = `
🤖 **BotBot Commands**

**Adopt an Agent:**
\`@BotBot adopt a curious scientist named Atlas\`
\`@BotBot adopt a friendly cat named Whiskers\`

**Chat:**
\`@BotBot hello\`
\`@BotBot how are you?\`

**Manage:**
\`@BotBot agents\` - List your agents
\`@BotBot help\` - Show this help

**Features:**
✅ Natural conversation
✅ Persistent memory
✅ Multiple personalities
✅ Works in DMs and servers
  `;
  
  await message.reply(help);
}

async function handleListAgents(message, userId) {
  const agents = await storage.getUserAgents(userId);
  
  if (agents.length === 0) {
    await message.reply('You haven\'t adopted any agents yet! Try: `@BotBot adopt a helpful assistant named Alex`');
    return;
  }
  
  const agentList = agents.map(agent => 
    `**${agent.name}** - ${agent.persona} (Energy: ${agent.energy}%)`
  ).join('\n');
  
  await message.reply(`🤖 **Your Agents:**\n\n${agentList}`);
}

async function handleChat(message, content, userId) {
  const agents = await storage.getUserAgents(userId);
  
  if (agents.length === 0) {
    await message.reply('You need to adopt an agent first! Try: `@BotBot adopt a helpful assistant named Alex`');
    return;
  }
  
  // Use the first agent for now (in full version, detect which agent to use)
  const agent = agents[0];
  const conversationId = await storage.getOrCreateConversation(agent.id, message.channel.id);
  
  // Add user message to conversation
  await storage.addMessage(conversationId, 'user', content);
  
  // Get conversation history
  const messages = await storage.getMessages(conversationId, 10);
  
  // Build prompt
  const conversationHistory = messages.map(msg => 
    `${msg.sender === 'user' ? 'User' : agent.name}: ${msg.content}`
  ).join('\n');
  
  const prompt = `${agent.systemPrompt}

Recent conversation:
${conversationHistory}

User: ${content}
${agent.name}:`;

  // Show typing indicator
  await message.channel.sendTyping();
  
  // Get AI response
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'system', content: agent.systemPrompt },
      { role: 'user', content: content }
    ],
    max_tokens: 500,
    temperature: 0.8
  });
  
  const reply = response.choices[0].message.content;
  
  // Add agent response to conversation
  await storage.addMessage(conversationId, 'agent', reply);
  
  // Send reply
  await message.reply(reply);
}

// Handle errors
client.on('error', console.error);

// Login
client.login(process.env.DISCORD_TOKEN);