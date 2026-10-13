const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const { logger } = require('../config/logger');

/**
 * Default rate limit configuration
 */
const defaultOptions = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json(options.message);
  },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for admin users
    return req.user?.role === 'admin';
  },
};

/**
 * General rate limiter for all API routes
 */
const generalLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
});

/**
 * Strict rate limiter for authentication routes
 */
const authLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Register rate limiter (new user registration)
 */
const registerLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 registrations per hour
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    code: 'REGISTER_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    code: 'RESET_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Document creation rate limiter
 */
const documentCreateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 document creations per hour
  message: {
    success: false,
    message: 'Too many document creations. Please slow down.',
    code: 'DOCUMENT_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * File upload rate limiter
 */
const uploadLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Too many upload attempts. Please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * API key rate limiter (for external API access)
 */
const apiKeyLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  keyGenerator: (req) => {
    return req.headers['x-api-key'] || req.ip;
  },
  message: {
    success: false,
    message: 'API rate limit exceeded. Please upgrade your plan.',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Redis store for distributed rate limiting (if Redis is available)
 */
const createRedisStore = () => {
  try {
    const client = getRedisClient();
    if (client) {
      const { RateLimiterRedis } = require('rate-limit-redis');
      return new RateLimiterRedis({
        storeClient: client,
        prefix: 'rl:',
      });
    }
  } catch (error) {
    logger.warn('Redis store not available, using memory store for rate limiting');
  }
  return null;
};

/**
 * Advanced rate limiter with Redis support
 */
const createRateLimiter = (options = {}) => {
  const store = createRedisStore();
  
  return rateLimit({
    ...defaultOptions,
    ...options,
    store: store || undefined,
  });
};

/**
 * Custom rate limiter by user role
 */
const roleBasedLimiter = (roleLimits = {}) => {
  return (req, res, next) => {
    const userRole = req.user?.role || 'guest';
    const limits = {
      admin: { windowMs: 60 * 1000, max: 1000 }, // 1 minute, 1000 requests
      user: { windowMs: 60 * 1000, max: 100 }, // 1 minute, 100 requests
      guest: { windowMs: 60 * 1000, max: 20 }, // 1 minute, 20 requests
      ...roleLimits,
    };

    const limit = limits[userRole] || limits.guest;
    
    const limiter = rateLimit({
      ...defaultOptions,
      windowMs: limit.windowMs,
      max: limit.max,
    });

    return limiter(req, res, next);
  };
};

/**
 * Rate limiter for specific endpoint
 */
const endpointLimiter = (windowMs, max) => {
  return rateLimit({
    ...defaultOptions,
    windowMs,
    max,
  });
};

/**
 * Rate limit middleware factory
 */
const rateLimitMiddleware = (type = 'general', options = {}) => {
  const limiters = {
    general: generalLimiter,
    auth: authLimiter,
    register: registerLimiter,
    reset: passwordResetLimiter,
    document: documentCreateLimiter,
    upload: uploadLimiter,
    api: apiKeyLimiter,
  };

  return limiters[type] || generalLimiter;
};

/**
 * Skip rate limiting for localhost/development
 */
const skipIfDevelopment = (req) => {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  // Skip for localhost
  const ip = req.ip || req.connection.remoteAddress;
  return ip === '::1' || ip === '127.0.0.1' || ip === 'localhost';
};

/**
 * Create a custom rate limiter with skip condition
 */
const createCustomLimiter = (options = {}) => {
  return rateLimit({
    ...defaultOptions,
    ...options,
    skip: (req) => {
      if (options.skip) {
        return options.skip(req);
      }
      return skipIfDevelopment(req);
    },
  });
};

module.exports = {
  // Basic limiters
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  documentCreateLimiter,
  uploadLimiter,
  apiKeyLimiter,
  
  // Advanced limiters
  createRateLimiter,
  roleBasedLimiter,
  endpointLimiter,
  rateLimitMiddleware,
  createCustomLimiter,
  
  // Utilities
  skipIfDevelopment,
};