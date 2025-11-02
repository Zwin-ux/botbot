require('dotenv').config();
const BotBotStorage = require('./simple-redis-storage');

async function testRedisStorage() {
  // For now, let's use a local Redis or mock
  // You'll need to get your Upstash Redis URL
  
  console.log('Testing Redis storage...');
  
  // Mock storage for testing without Redis
  const mockStorage = {
    users: new Map(),
    agents: new Map(),
    conversations: new Map(),
    messages: new Map(),
    memories: new Map(),
    
    async createUser(discordId, userData = {}) {
      const userId = `user:${discordId}`;
      this.users.set(userId, { discordId, createdAt: Date.now(), ...userData });
      return userId;
    },
    
    async createAgent(userId, name, persona, systemPrompt) {
      const agentId = `agent:${Date.now()}`;
      this.agents.set(agentId, {
        userId, name, persona, systemPrompt,
        mood: { valence: 0.5, arousal: 0.5, dominance: 0.5 },
        energy: 100,
        createdAt: Date.now()
      });
      return agentId;
    },
    
    async getAgent(agentId) {
      return this.agents.get(agentId);
    }
  };
  
  try {
    // Test user creation
    const userId = await mockStorage.createUser('123456789', { username: 'TestUser' });
    console.log('✅ User created:', userId);
    
    // Test agent creation
    const agentId = await mockStorage.createAgent(
      userId, 
      'Atlas', 
      'A curious scientist', 
      'You are Atlas, a curious scientist who loves to explore and learn.'
    );
    console.log('✅ Agent created:', agentId);
    
    // Test agent retrieval
    const agent = await mockStorage.getAgent(agentId);
    console.log('✅ Agent retrieved:', agent.name, agent.persona);
    
    console.log('\n🎉 Redis storage structure works! Now you need to:');
    console.log('1. Get Upstash Redis URL');
    console.log('2. Update REDIS_URL in .env');
    console.log('3. Replace mockStorage with real BotBotStorage');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
  }
}

testRedisStorage();