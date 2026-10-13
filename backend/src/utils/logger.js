const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * Logger utility for the application
 * Provides structured logging with multiple transports
 */
class Logger {
  constructor() {
    this.logger = null;
    this.logDir = path.join(__dirname, '../../logs');
    this.setupLogDirectory();
    this.initializeLogger();
  }

  /**
   * Setup log directory
   */
  setupLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Initialize the logger
   */
  initializeLogger() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const isProduction = process.env.NODE_ENV === 'production';

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );

    // Define console format (more readable in development)
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(({ level, message, timestamp, ...meta }) => {
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}: ${message}${metaStr}`;
      })
    );

    // Create transports
    const transports = [];

    // File transport for errors
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDir, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    // File transport for all logs
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDir, 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    // File transport for access logs
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDir, 'access.log'),
        level: 'info',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );

    // File transport for debug logs (development only)
    if (!isProduction) {
      transports.push(
        new winston.transports.File({
          filename: path.join(this.logDir, 'debug.log'),
          level: 'debug',
          format: logFormat,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        })
      );
    }

    // Console transport
    transports.push(
      new winston.transports.Console({
        format: isProduction ? logFormat : consoleFormat,
        level: isProduction ? 'info' : 'debug',
      })
    );

    // Create the logger
    this.logger = winston.createLogger({
      level: logLevel,
      format: logFormat,
      defaultMeta: {
        service: 'syncdoc-backend',
        environment: process.env.NODE_ENV || 'development',
        pid: process.pid,
      },
      transports,
      exitOnError: false,
    });

    // Add custom methods
    this.addCustomMethods();
  }

  /**
   * Add custom logging methods
   */
  addCustomMethods() {
    // Add request logging method
    this.logger.logRequest = (req, res, responseTime) => {
      this.logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.user?.id || 'anonymous',
      });
    };

    // Add database logging method
    this.logger.logDatabase = (operation, collection, query, duration) => {
      this.logger.debug('Database Operation', {
        operation,
        collection,
        query,
        duration: `${duration}ms`,
      });
    };

    // Add authentication logging method
    this.logger.logAuth = (event, userId, email, details = {}) => {
      this.logger.info('Authentication Event', {
        event,
        userId,
        email,
        ...details,
        timestamp: new Date().toISOString(),
      });
    };

    // Add error logging method
    this.logger.logError = (error, context = {}) => {
      this.logger.error(error.message || 'Unknown error', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
          code: error.code,
        },
        context,
        timestamp: new Date().toISOString(),
      });
    };

    // Add performance logging method
    this.logger.logPerformance = (operation, duration, metadata = {}) => {
      this.logger.info('Performance Metric', {
        operation,
        duration: `${duration}ms`,
        ...metadata,
        timestamp: new Date().toISOString(),
      });
    };

    // Add security logging method
    this.logger.logSecurity = (event, userId, details = {}) => {
      this.logger.warn('Security Event', {
        event,
        userId,
        ...details,
        timestamp: new Date().toISOString(),
      });
    };

    // Add business event logging
    this.logger.logBusiness = (event, userId, data = {}) => {
      this.logger.info('Business Event', {
        event,
        userId,
        data,
        timestamp: new Date().toISOString(),
      });
    };

    // Add API logging method
    this.logger.logApi = (endpoint, method, status, duration, userId) => {
      this.logger.info('API Call', {
        endpoint,
        method,
        status,
        duration: `${duration}ms`,
        userId,
        timestamp: new Date().toISOString(),
      });
    };

    // Add health check logging
    this.logger.logHealth = (status, details = {}) => {
      this.logger.info('Health Check', {
        status,
        details,
        timestamp: new Date().toISOString(),
      });
    };
  }

  /**
   * Get the logger instance
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Create a child logger with additional metadata
   */
  child(metadata) {
    return this.logger.child(metadata);
  }

  /**
   * Create a request-scoped logger
   */
  createRequestLogger(req) {
    const requestId = req.id || this.generateRequestId();
    return this.logger.child({
      requestId,
      ip: req.ip,
      method: req.method,
      url: req.url,
    });
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get log file paths
   */
  getLogPaths() {
    return {
      error: path.join(this.logDir, 'error.log'),
      combined: path.join(this.logDir, 'combined.log'),
      access: path.join(this.logDir, 'access.log'),
      debug: path.join(this.logDir, 'debug.log'),
    };
  }

  /**
   * Get log statistics
   */
  getLogStats() {
    const paths = this.getLogPaths();
    const stats = {};

    for (const [name, filePath] of Object.entries(paths)) {
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          stats[name] = {
            size: stat.size,
            sizeFormatted: this.formatFileSize(stat.size),
            modified: stat.mtime,
            exists: true,
          };
        } else {
          stats[name] = {
            size: 0,
            sizeFormatted: '0 B',
            modified: null,
            exists: false,
          };
        }
      } catch (error) {
        stats[name] = {
          error: error.message,
          exists: false,
        };
      }
    }

    return stats;
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clear log files (with caution)
   */
  async clearLogs() {
    const paths = this.getLogPaths();
    for (const filePath of Object.values(paths)) {
      try {
        if (fs.existsSync(filePath)) {
          fs.truncateSync(filePath, 0);
        }
      } catch (error) {
        console.error(`Failed to clear log file: ${filePath}`, error);
      }
    }
  }

  /**
   * Rotate logs (create new log files)
   */
  rotateLogs() {
    const paths = this.getLogPaths();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    for (const [name, filePath] of Object.entries(paths)) {
      try {
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          // Rotate if file > 10MB
          if (stat.size > 10 * 1024 * 1024) {
            const backupPath = path.join(
              this.logDir,
              `${path.basename(filePath, path.extname(filePath))}-${timestamp}${path.extname(filePath)}`
            );
            fs.renameSync(filePath, backupPath);
          }
        }
      } catch (error) {
        console.error(`Failed to rotate log: ${filePath}`, error);
      }
    }
  }
}

// Create and export singleton instance
const loggerInstance = new Logger();
const logger = loggerInstance.getLogger();

// Export the logger and utility methods
module.exports = {
  logger,
  Logger,
  // Convenience methods
  info: (...args) => logger.info(...args),
  error: (...args) => logger.error(...args),
  warn: (...args) => logger.warn(...args),
  debug: (...args) => logger.debug(...args),
  verbose: (...args) => logger.verbose(...args),
  silly: (...args) => logger.silly(...args),
  // Custom methods
  logRequest: (...args) => logger.logRequest(...args),
  logDatabase: (...args) => logger.logDatabase(...args),
  logAuth: (...args) => logger.logAuth(...args),
  logError: (...args) => logger.logError(...args),
  logPerformance: (...args) => logger.logPerformance(...args),
  logSecurity: (...args) => logger.logSecurity(...args),
  logBusiness: (...args) => logger.logBusiness(...args),
  logApi: (...args) => logger.logApi(...args),
  logHealth: (...args) => logger.logHealth(...args),
  // Utility methods
  child: (...args) => loggerInstance.child(...args),
  createRequestLogger: (...args) => loggerInstance.createRequestLogger(...args),
  getLogPaths: () => loggerInstance.getLogPaths(),
  getLogStats: () => loggerInstance.getLogStats(),
  clearLogs: () => loggerInstance.clearLogs(),
  rotateLogs: () => loggerInstance.rotateLogs(),
};