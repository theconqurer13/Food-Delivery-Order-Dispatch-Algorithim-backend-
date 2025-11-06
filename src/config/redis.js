const redis = require('redis');
require('dotenv').config();

// Create Redis client
let redisUrl = process.env.REDIS_URL || `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

// Enable TLS for production Redis services (Upstash, Render, etc.)
// Render uses rediss:// (with double 's') or requires TLS even with redis://
const isProduction = process.env.NODE_ENV === 'production';
const hasRedissProtocol = redisUrl.startsWith('rediss://');
const isCloudProvider = redisUrl.includes('upstash') || 
                        redisUrl.includes('render.com') ||
                        redisUrl.includes('redis.railway') ||
                        redisUrl.includes('redis.cloud');

// Enable TLS if:
// 1. URL uses rediss:// protocol (explicit TLS)
// 2. It's a known cloud provider
// 3. It's production and REDIS_URL is provided (likely from Render or similar)
const requiresTLS = hasRedissProtocol || 
                    isCloudProvider ||
                    (isProduction && process.env.REDIS_URL && !redisUrl.includes('localhost'));

// If TLS is required but URL uses redis://, convert to rediss://
// The Redis client library requires the protocol to match the TLS setting
if (requiresTLS && redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
  redisUrl = redisUrl.replace('redis://', 'rediss://');
  console.log('🔄 Converted Redis URL to use TLS protocol (rediss://)');
}

const redisOptions = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Too many Redis reconnection attempts');
        return new Error('Too many retries');
      }
      return Math.min(retries * 100, 3000); // Reconnect with a max delay of 3s
    },
    connectTimeout: 10000, // 10 seconds connection timeout
    keepAlive: 30000, // Keep alive ping every 30 seconds
  }
};

// Enable TLS socket option if using rediss:// protocol
if (redisUrl.startsWith('rediss://')) {
  redisOptions.socket.tls = true;
  // For Render and other cloud providers, reject unauthorized certificates
  redisOptions.socket.rejectUnauthorized = true;
  console.log('🔒 TLS enabled for Redis connection');
}

const redisClient = redis.createClient(redisOptions);

// Connect to Redis with retry logic
let isConnected = false;
let connectionAttempts = 0;
const maxConnectionAttempts = 5;

async function connectRedis() {
  try {
    if (!isConnected) {
      await redisClient.connect();
      isConnected = true;
      connectionAttempts = 0;
      console.log('✅ Connected to Redis');
    }
  } catch (err) {
    connectionAttempts++;
    console.error(`❌ Redis connection error (attempt ${connectionAttempts}/${maxConnectionAttempts}):`, err.message);
    
    if (connectionAttempts >= maxConnectionAttempts) {
      console.error('❌ Failed to connect to Redis after multiple attempts. Application will continue but Redis features will be unavailable.');
      // Don't exit the process - let the app run without Redis
      // Some features might not work, but the app won't crash
    } else {
      // Retry after a delay
      setTimeout(() => {
        connectRedis();
      }, 2000 * connectionAttempts);
    }
  }
}

// Start connection
connectRedis();

// Error handling
redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
  isConnected = false;
  
  // Attempt to reconnect if connection was lost
  if (err.message.includes('Socket closed') || err.message.includes('ECONNREFUSED')) {
    console.log('🔄 Attempting to reconnect to Redis...');
    setTimeout(() => {
      connectRedis();
    }, 2000);
  }
});

redisClient.on('ready', () => {
  console.log('📡 Redis client is ready');
  isConnected = true;
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis client is reconnecting...');
  isConnected = false;
});

redisClient.on('end', () => {
  console.log('🔌 Redis connection ended');
  isConnected = false;
});

module.exports = redisClient;