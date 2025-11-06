const redis = require('redis');
require('dotenv').config();

// Create Redis client
const redisOptions = {
  url: process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Too many Redis reconnection attempts');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000); // Reconnect with a max delay of 3s
    }
  }
};

// For Upstash/Render, enable TLS
if (process.env.NODE_ENV === 'production' && redisOptions.url.includes('upstash')) {
  redisOptions.socket.tls = true;
}

const redisClient = redis.createClient(redisOptions);

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