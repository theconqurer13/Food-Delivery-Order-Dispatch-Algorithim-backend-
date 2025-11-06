const redis = require('redis');
require('dotenv').config();

// Create Redis client
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  }
  // Optional: Add password if Redis requires authentication
  // password: process.env.REDIS_PASSWORD,
});

// Connect to Redis
(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Connected to Redis');
  } catch (err) {
    console.error('❌ Redis connection error:', err);
    process.exit(-1);
  }
})();

// Error handling
redisClient.on('error', (err) => {
    
  console.error('Redis Client Error:', err);
});

redisClient.on('ready', () => {
  console.log('📡 Redis client is ready');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis client is reconnecting...');
});

module.exports = redisClient;