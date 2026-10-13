const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logger } = require('../config/logger');

/**
 * Authentication middleware - Verifies JWT token and attaches user to request
 */
const auth = async (req, res, next) => {
  try {
    // Get token from Authorization header
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

    // Verify token
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

    // Find user
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found. Please login again.',
      });
    }

    // Check if user is deleted
    if (user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deleted.',
      });
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id;
    req.token = token;

    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
    });
  }
};

/**
 * Optional authentication - Does not require token but attaches user if present
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
          // Token invalid, but that's okay for optional auth
          logger.debug('Optional auth token invalid:', error.message);
        }
      }
    }
    
    next();
  } catch (error) {
    logger.error('Optional auth middleware error:', error);
    next();
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

    next();
  };
};

/**
 * Workspace membership check middleware
 */
const checkWorkspaceMembership = async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
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

    const isMember = workspace.isMember(userId) || workspace.owner.toString() === userId;

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this workspace',
      });
    }

    req.workspace = workspace;
    next();
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

    const hasAccess = document.owner.toString() === userId ||
      document.collaborators.some(c => c.user.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this document',
      });
    }

    req.document = document;
    next();
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

    const hasPermission = document.owner.toString() === userId ||
      document.collaborators.some(c => 
        c.user.toString() === userId && 
        (c.role === 'admin' || c.role === 'editor')
      );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit this document',
      });
    }

    req.document = document;
    next();
  } catch (error) {
    logger.error('Document edit permission check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify document edit permission',
    });
  }
};

/**
 * Rate limiting for authentication endpoints
 */
const authRateLimit = require('express-rate-limit');

const loginRateLimiter = authRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerRateLimiter = authRateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts per window
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
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