const { logger } = require('../config/logger');

// ============================================================
// API ERROR
// ============================================================

class APIError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);

    this.name = 'APIError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// ============================================================
// NOT FOUND HANDLER
// ============================================================

const notFoundHandler = (req, res, next) => {
  const error = new APIError(
    `Route not found: ${req.method} ${req.originalUrl}`,
    404,
    'ROUTE_NOT_FOUND'
  );

  next(error);
};

// ============================================================
// ERROR HANDLER
// ============================================================

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  const message =
    err.message || 'Internal server error';

  // Safe logger
  try {
    if (logger && typeof logger.error === 'function') {
      logger.error(
        `${req.method} ${req.originalUrl} - ${statusCode} - ${message}`,
        {
          stack: err.stack,
          code: err.code,
        }
      );
    } else {
      console.error(
        `${req.method} ${req.originalUrl} - ${statusCode} - ${message}`
      );
      console.error(err.stack);
    }
  } catch (loggerError) {
    console.error('Logger error:', loggerError);
    console.error(err);
  }

  // Don't send response twice
  if (res.headersSent) {
    return next(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development'
      ? {
          stack: err.stack,
        }
      : {}),
  });
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  APIError,
  notFoundHandler,
  errorHandler,
};