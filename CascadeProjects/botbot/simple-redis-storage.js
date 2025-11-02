// Simple Redis-based storage for BotBot
const Redis = require('ioredis');

class BotBotStorage {
  constructor(redisUrl) {
    this.redis = new Redis(redisUrl);
  }

  // Users
  async createUser(discordId, userData = {}) {
    const userId = `user:${discordId}`;
    await this.redis.hset(userId, {
      discordId,
      createdAt: Date.now(),
      ...userData
    });
    return userId;
  }

  async getUser(discordId) {
    return await this.redis.hgetall(`user:${discordId}`);
  }

  // Agents
  async createAgent(userId, name, persona, systemPrompt) {
    const agentId = `agent:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await this.redis.hset(agentId, {
      userId,
      name,
      persona,
      systemPrompt,
      mood: JSON.stringify({ valence: 0.5, arousal: 0.5, dominance: 0.5 }),
      energy: 100,
      createdAt: Date.now()
    });
    
    // Add to user's agent list
    await this.redis.sadd(`${userId}:agents`, agentId);
    return agentId;
  }

  async getAgent(agentId) {
    const agent = await this.redis.hgetall(agentId);
    if (agent.mood) agent.mood = JSON.parse(agent.mood);
    return agent;
  }

  async getUserAgents(userId) {
    const agentIds = await this.redis.smembers(`${userId}:agents`);
    const agents = [];
    for (const agentId of agentIds) {
      const agent = await this.getAgent(agentId);
      if (agent.name) agents.push({ id: agentId, ...agent });
    }
    return agents;
  }

  // Conversations
  async createConversation(agentId, userId, channelType, channelId) {
    const conversationId = `conv:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await this.redis.hset(conversationId, {
      agentId,
      userId,
      channelType,
      channelId,
      createdAt: Date.now()
    });
    return conversationId;
  }

  async getConversation(conversationId) {
    return await this.redis.hgetall(conversationId);
  }

  async findConversation(agentId, channelId) {
    // Simple scan for conversation (in production, use better indexing)
    const keys = await this.redis.keys('conv:*');
    for (const key of keys) {
      const conv = await this.redis.hgetall(key);
      if (conv.agentId === agentId && conv.channelId === channelId) {
        return { id: key, ...conv };
      }
    }
    return null;
  }

  // Messages
  async addMessage(conversationId, sender, content) {
    const messageId = `msg:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await this.redis.hset(messageId, {
      conversationId,
      sender, // 'user' or 'agent'
      content,
      createdAt: Date.now()
    });
    
    // Add to conversation's message list
    await this.redis.lpush(`${conversationId}:messages`, messageId);
    
    // Keep only last 50 messages
    await this.redis.ltrim(`${conversationId}:messages`, 0, 49);
    
    return messageId;
  }

  async getMessages(conversationId, limit = 20) {
    const messageIds = await this.redis.lrange(`${conversationId}:messages`, 0, limit - 1);
    const messages = [];
    for (const messageId of messageIds) {
      const message = await this.redis.hgetall(messageId);
      if (message.content) messages.push({ id: messageId, ...message });
    }
    return messages.reverse(); // Oldest first
  }

  // Memories (simple key-value for now)
  async addMemory(agentId, userId, content, type = 'fact') {
    const memoryId = `memory:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    await this.redis.hset(memoryId, {
      agentId,
      userId,
      content,
      type,
      salience: 0.8,
      createdAt: Date.now(),
      lastAccessed: Date.now()
    });
    
    // Add to agent's memory list
    await this.redis.sadd(`${agentId}:memories`, memoryId);
    return memoryId;
  }

  async getMemories(agentId, limit = 10) {
    const memoryIds = await this.redis.smembers(`${agentId}:memories`);
    const memories = [];
    for (const memoryId of memoryIds.slice(0, limit)) {
      const memory = await this.redis.hgetall(memoryId);
      if (memory.content) memories.push({ id: memoryId, ...memory });
    }
    return memories.sort((a, b) => b.lastAccessed - a.lastAccessed);
  }

  // Rate limiting
  async checkRateLimit(userId, action = 'message', limit = 20, windowMs = 60000) {
    const key = `rate:${userId}:${action}`;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);
    
    // Count current entries
    const count = await this.redis.zcard(key);
    
    if (count >= limit) {
      return { allowed: false, resetAt: windowStart + windowMs };
    }
    
    // Add current request
    await this.redis.zadd(key, now, now);
    await this.redis.expire(key, Math.ceil(windowMs / 1000));
    
    return { allowed: true, remaining: limit - count - 1 };
  }
}

module.exports = BotBotStorage;