
const jwt = require('jsonwebtoken');
const authRateLimit = require('express-rate-limit');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Token not provided.',
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh your token.',
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
        });
      }

      throw error;
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted.',
      });
    }

    req.user = user;
    req.userId = user._id;
    req.token = token;

    return next();
  } catch (error) {
    logger.error('Auth middleware error:', error);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
    });
  }
};

/**
 * Optional authentication
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];

      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const user = await User.findById(decoded.id);

          if (user && !user.deletedAt) {
            req.user = user;
            req.userId = user._id;
            req.token = token;
          }
        } catch (error) {
          logger.debug('Optional auth token invalid:', error.message);
        }
      }
    }

    return next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    return next();
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(', ')}`,
      });
    }

    return next();
  };
};

/**
 * Workspace membership check middleware
 */
const checkWorkspaceMembership = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userId = req.user.id;

    if (!workspaceId) {
      return res.status(400).json({
        success: false,
        message: 'Workspace ID is required',
      });
    }

    const Workspace = require('../models/Workspace');
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: 'Workspace not found',
      });
    }

    const isMember =
      workspace.isMember(userId) ||
      workspace.owner.toString() === userId;

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this workspace',
      });
    }

    req.workspace = workspace;

    return next();
  } catch (error) {
    logger.error('Workspace membership check error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to verify workspace access',
    });
  }
};

/**
 * Document access check middleware
 */
const checkDocumentAccess = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userId = req.user.id;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required',
      });
    }

    const Document = require('../models/Document');
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const hasAccess =
      document.owner.toString() === userId ||
      document.collaborators.some(
        (collaborator) => collaborator.user.toString() === userId
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this document',
      });
    }

    req.document = document;

    return next();
  } catch (error) {
    logger.error('Document access check error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to verify document access',
    });
  }
};

/**
 * Document edit permission check middleware
 */
const checkDocumentEditPermission = async (req, res, next) => {
  try {
    const { documentId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    const userId = req.user.id;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        message: 'Document ID is required',
      });
    }

    const Document = require('../models/Document');
    const document = await Document.findById(documentId);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found',
      });
    }

    const hasPermission =
      document.owner.toString() === userId ||
      document.collaborators.some(
        (collaborator) =>
          collaborator.user.toString() === userId &&
          ['admin', 'editor'].includes(collaborator.role)
      );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this document',
      });
    }

    req.document = document;

    return next();
  } catch (error) {
    logger.error('Document edit permission check error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to verify document edit permission',
    });
  }
};

/**
 * Login rate limiter
 *
 * Up to 10 failed login attempts per IP within 15 minutes.
 * Successful login responses are not counted against the limit.
 */
const loginRateLimiter = authRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    code: 'LOGIN_RATE_LIMITED',
    message:
      'Too many failed login attempts. Please try again in 15 minutes.',
  },

  handler: (req, res, next, options) => {
    logger.warn(
      `[LOGIN_RATE_LIMITED] ${req.method} ${req.originalUrl} IP: ${req.ip}`
    );

    return res
      .status(options.statusCode || 429)
      .json(options.message);
  },
});

/**
 * Registration rate limiter
 *
 * Up to 10 registration attempts per IP within one hour.
 */
const registerRateLimiter = authRateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
});

module.exports = {
  auth,
  optionalAuth,
  authorize,
  checkWorkspaceMembership,
  checkDocumentAccess,
  checkDocumentEditPermission,
  loginRateLimiter,
  registerRateLimiter,
};
