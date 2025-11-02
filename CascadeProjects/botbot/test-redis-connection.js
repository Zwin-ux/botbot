require('dotenv').config();
const Redis = require('ioredis');

async function testRedisConnection() {
  console.log('Testing Redis connection...');
  
  const redis = new Redis(process.env.REDIS_URL);
  
  try {
    // Test basic connection
    await redis.ping();
    console.log('✅ Redis connected successfully!');
    
    // Test basic operations
    await redis.set('test:key', 'Hello Redis!');
    const value = await redis.get('test:key');
    console.log('✅ Read/Write test:', value);
    
    // Test hash operations (for our storage)
    await redis.hset('test:user', {
      name: 'TestUser',
      id: '123',
      created: Date.now()
    });
    
    const user = await redis.hgetall('test:user');
    console.log('✅ Hash operations work:', user);
    
    // Clean up
    await redis.del('test:key', 'test:user');
    console.log('✅ Cleanup complete');
    
    console.log('\n🎉 Redis is ready for BotBot!');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
  } finally {
    redis.disconnect();
  }
}

testRedisConnection();