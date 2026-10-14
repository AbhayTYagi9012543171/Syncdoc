const validateEnv = () => {
  const required = [
    'MONGODB_URI',
    'JWT_SECRET',
    'REFRESH_TOKEN_SECRET',
  ];

  const missing = required.filter(
    (key) => !process.env[key] || !process.env[key].trim()
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters in production.'
      );
    }

    if (process.env.REFRESH_TOKEN_SECRET.length < 32) {
      throw new Error(
        'REFRESH_TOKEN_SECRET must be at least 32 characters in production.'
      );
    }
  }
};

validateEnv();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT, 10) || 5000,
  socketPort: Number.parseInt(process.env.SOCKET_PORT, 10) || 4001,
  // Set CORS_ORIGIN explicitly in deployments. This default is for local dev.
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  mongoUri: process.env.MONGODB_URI,
  // Redis is optional in this codebase; redis.js handles an absent URL.
  redisUrl: process.env.REDIS_URL || null,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiry: process.env.JWT_EXPIRY || '7d',
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET,
  logLevel: process.env.LOG_LEVEL || 'info',
};
