const redis = require('redis');

let client = null;
let redisAvailable = false;

const connectRedis = async () => {
  // Already connected
  if (client && redisAvailable) {
    return client;
  }

  // Redis is optional
  if (!process.env.REDIS_URL) {
    console.log('⚠️ REDIS_URL is not configured. Continuing without Redis.');
    return null;
  }

  try {
    client = redis.createClient({
      url: process.env.REDIS_URL,
      password: process.env.REDIS_PASSWORD || undefined,

      socket: {
        reconnectStrategy: (retries) => {
          if (retries >= 5) {
            console.log('⚠️ Redis reconnect limit reached.');
            return new Error('Redis connection failed');
          }

          return Math.min(retries * 500, 3000);
        },
      },
    });

    client.on('error', (error) => {
      redisAvailable = false;
      console.error('Redis Client Error:', error.message);
    });

    client.on('connect', () => {
      console.log('🔴 Redis connecting...');
    });

    client.on('ready', () => {
      redisAvailable = true;
      console.log('🔴 Redis Client Connected');
    });

    client.on('end', () => {
      redisAvailable = false;
      console.log('Redis connection closed');
    });

    await client.connect();

    redisAvailable = true;

    return client;
  } catch (error) {
    redisAvailable = false;
    client = null;

    console.warn(
      `⚠️ Redis unavailable. Continuing without Redis: ${error.message}`
    );

    return null;
  }
};

const disconnectRedis = async () => {
  if (!client) {
    return;
  }

  try {
    if (client.isOpen) {
      await client.quit();
    }
  } catch (error) {
    console.error('Redis disconnect error:', error.message);
  } finally {
    client = null;
    redisAvailable = false;
  }
};

const getRedisClient = () => {
  return client;
};

const isRedisConnected = () => {
  return Boolean(client && redisAvailable && client.isReady);
};

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  isRedisConnected,
};