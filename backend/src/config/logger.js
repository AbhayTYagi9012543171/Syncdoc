// src/config/logger.js

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ============================================================
// LOG DIRECTORY
// ============================================================

const logDir = path.join(__dirname, '../../logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// ============================================================
// LOGGER
// ============================================================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',

  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({
      stack: true,
    }),
    winston.format.splat(),
    winston.format.json()
  ),

  defaultMeta: {
    service: 'syncdoc-backend',
  },

  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
    }),

    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
    }),
  ],
});

// ============================================================
// DEVELOPMENT CONSOLE
// ============================================================

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss',
        }),
        winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
          let output = `${timestamp} ${level}: ${message}`;

          if (stack) {
            output += `\n${stack}`;
          }

          if (Object.keys(meta).length > 0) {
            output += ` ${JSON.stringify(meta)}`;
          }

          return output;
        })
      ),
    })
  );
}

// ============================================================
// SETUP LOGGER
// ============================================================

const setupLogger = () => {
  return logger;
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  logger,
  setupLogger,
};