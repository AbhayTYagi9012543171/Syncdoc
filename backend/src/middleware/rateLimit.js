
const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');
const { logger } = require('../config/logger');

const defaultOptions = {
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },

  handler: (req, res, next, options) => {
    logger.warn(
      `[RATE_LIMITED] ${req.method} ${req.originalUrl} IP: ${req.ip}`
    );

    return res.status(429).json(options.message);
  },

  // Use a stable key for each authenticated user or anonymous IP.
  // IPv6-aware IP handling is left to express-rate-limit's defaults
  // where its default key generator is used.
  keyGenerator: (req) => {
    return req.user?.id
      ? `user:${req.user.id}`
      : `ip:${req.ip}`;
  },

  skip: (req) => req.user?.role === 'admin',
};

/**
 * General API limiter: 100 requests per 15 minutes.
 */
const generalLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max: 100,
});

/**
 * Authentication limiter: 5 failed attempts per 15 minutes.
 * Successful requests are not counted.
 */
const authLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,

  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Registration limiter: 10 attempts per hour.
 */
const registerLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max: 10,

  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    code: 'REGISTER_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Password reset limiter: 3 attempts per hour.
 */
const passwordResetLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max: 3,

  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again later.',
    code: 'RESET_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Document creation limiter: 50 requests per hour.
 */
const documentCreateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max: 50,

  message: {
    success: false,
    message: 'Too many document creations. Please slow down.',
    code: 'DOCUMENT_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * File upload limiter: 20 requests per hour.
 */
const uploadLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max: 20,

  message: {
    success: false,
    message: 'Too many upload attempts. Please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * API key limiter: 1000 requests per hour.
 */
const apiKeyLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000,
  max: 1000,

  keyGenerator: (req) => {
    return req.headers['x-api-key']
      ? `api-key:${req.headers['x-api-key']}`
      : `ip:${req.ip}`;
  },

  message: {
    success: false,
    message: 'API rate limit exceeded. Please upgrade your plan.',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});

/**
 * Optional Redis store.
 *
 * Note: rate-limit-redis APIs vary by version. This helper is
 * retained for compatibility with the installed project setup.
 * If your installed version expects a different constructor,
 * adjust this helper to that version's documented API.
 */
const createRedisStore = () => {
  try {
    const client = getRedisClient();

    if (client) {
      const { RedisStore } = require('rate-limit-redis');

      return new RedisStore({
        sendCommand: (...args) => client.call(...args),
        prefix: 'rl:',
      });
    }
  } catch (error) {
    logger.warn(
      'Redis rate-limit store unavailable; using the default memory store.'
    );
  }

  return undefined;
};

/**
 * Create a limiter with optional Redis storage.
 */
const createRateLimiter = (options = {}) => {
  const store = createRedisStore();

  return rateLimit({
    ...defaultOptions,
    ...options,
    ...(store ? { store } : {}),
  });
};

/**
 * Create a limiter based on the authenticated user's role.
 */
const roleBasedLimiter = (roleLimits = {}) => {
  const limits = {
    admin: { windowMs: 60 * 1000, max: 1000 },
    user: { windowMs: 60 * 1000, max: 100 },
    guest: { windowMs: 60 * 1000, max: 20 },
    ...roleLimits,
  };

  return (req, res, next) => {
    const role = req.user?.role || 'guest';
    const limit = limits[role] || limits.guest;

    return rateLimit({
      ...defaultOptions,
      windowMs: limit.windowMs,
      max: limit.max,
    })(req, res, next);
  };
};

/**
 * Create a limiter for a specific endpoint.
 */
const endpointLimiter = (windowMs, max) => {
  return rateLimit({
    ...defaultOptions,
    windowMs,
    max,
  });
};

/**
 * Retrieve a named limiter.
 */
const rateLimitMiddleware = (type = 'general') => {
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
 * Skip custom rate limiting in development or for loopback IPs.
 */
const skipIfDevelopment = (req) => {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  const ip = req.ip || req.socket?.remoteAddress || '';

  return [
    '::1',
    '127.0.0.1',
    '::ffff:127.0.0.1',
    'localhost',
  ].includes(ip);
};

/**
 * Create a limiter with a custom skip callback.
 */
const createCustomLimiter = (options = {}) => {
  const originalSkip = options.skip;

  return rateLimit({
    ...defaultOptions,
    ...options,

    skip: (req) => {
      if (typeof originalSkip === 'function') {
        return originalSkip(req);
      }

      return skipIfDevelopment(req);
    },
  });
};

module.exports = {
  generalLimiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  documentCreateLimiter,
  uploadLimiter,
  apiKeyLimiter,

  createRateLimiter,
  roleBasedLimiter,
  endpointLimiter,
  rateLimitMiddleware,
  createCustomLimiter,

  skipIfDevelopment,
};
