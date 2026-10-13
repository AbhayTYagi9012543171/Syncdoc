
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { APIError } = require('../middleware/errorHandler');

class AuthService {
  static async register(userData) {
    try {
      const { username, email, password, displayName } = userData;

      const emailExists = await User.isEmailTaken(email);
      if (emailExists) {
        throw new APIError('Email already registered', 400, 'EMAIL_EXISTS');
      }

      const usernameExists = await User.isUsernameTaken(username);
      if (usernameExists) {
        throw new APIError('Username already taken', 400, 'USERNAME_EXISTS');
      }

      const user = new User({
        username,
        email,
        password,
        displayName: displayName || username,
      });

      await user.save();

      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();
      const verificationToken = this.generateVerificationToken(user._id);

      user.verificationToken = verificationToken;
      await user.save();

      return {
        user: user.toJSON(),
        accessToken,
        refreshToken,
        verificationToken,
      };
    } catch (error) {
      logger.error('AuthService.register error:', error);
      throw error;
    }
  }

  static async login(email, password, ipAddress = null, userAgent = null) {
    try {
      const user = await User.findByCredentials(email, password);
      
      if (!user) {
        throw new APIError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
      }

      user.lastLogin = new Date();
      await user.save();

      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      logger.info(`User logged in: ${user.email} from ${ipAddress}`);

      return {
        user: user.toJSON(),
        accessToken,
        refreshToken,
      };
    } catch (error) {
      logger.error('AuthService.login error:', error);
      throw error;
    }
  }

  static async refreshToken(refreshToken) {
    try {
      if (!refreshToken) {
        throw new APIError('Refresh token required', 400, 'REFRESH_TOKEN_REQUIRED');
      }

      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET
      );
      
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new APIError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      const accessToken = user.generateAuthToken();

      return { accessToken };
    } catch (error) {
      logger.error('AuthService.refreshToken error:', error);
      if (error.name === 'JsonWebTokenError') {
        throw new APIError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }
      if (error.name === 'TokenExpiredError') {
        throw new APIError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  static async logout(userId, socketId = null) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (socketId) {
        await user.removeSession(socketId);
      }

      logger.info(`User logged out: ${user.email}`);
      return { success: true };
    } catch (error) {
      logger.error('AuthService.logout error:', error);
      throw error;
    }
  }

  static async getCurrentUser(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password -activeSessions -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      return user;
    } catch (error) {
      logger.error('AuthService.getCurrentUser error:', error);
      throw error;
    }
  }

  static async updatePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select('+password');
      if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new APIError('Current password is incorrect', 400, 'INVALID_PASSWORD');
      }

      user.password = newPassword;
      await user.save();

      logger.info(`Password updated for user: ${user.email}`);
      return { success: true };
    } catch (error) {
      logger.error('AuthService.updatePassword error:', error);
      throw error;
    }
  }

  static async forgotPassword(email) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        return { success: true, message: 'If an account exists, a reset link will be sent' };
      }

      const resetToken = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 3600000;
      await user.save();

      logger.info(`Password reset requested for: ${user.email}`);
      return { 
        success: true, 
        message: 'If an account exists, a reset link will be sent',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      };
    } catch (error) {
      logger.error('AuthService.forgotPassword error:', error);
      throw error;
    }
  }

  static async resetPassword(token, newPassword) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findOne({
        _id: decoded.id,
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });

      if (!user) {
        throw new APIError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      logger.info(`Password reset successful for: ${user.email}`);
      return { success: true };
    } catch (error) {
      logger.error('AuthService.resetPassword error:', error);
      if (error.name === 'JsonWebTokenError') {
        throw new APIError('Invalid reset token', 400, 'INVALID_RESET_TOKEN');
      }
      if (error.name === 'TokenExpiredError') {
        throw new APIError('Reset token expired', 400, 'RESET_TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  static async verifyEmail(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (user.isVerified) {
        return { success: true, message: 'Email already verified' };
      }

      user.isVerified = true;
      user.verificationToken = undefined;
      await user.save();

      logger.info(`Email verified for user: ${user.email}`);
      return { success: true };
    } catch (error) {
      logger.error('AuthService.verifyEmail error:', error);
      if (error.name === 'JsonWebTokenError') {
        throw new APIError('Invalid verification token', 400, 'INVALID_VERIFICATION_TOKEN');
      }
      if (error.name === 'TokenExpiredError') {
        throw new APIError('Verification token expired', 400, 'VERIFICATION_TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  static async updateProfile(userId, updateData) {
    try {
      const { displayName, avatar, preferences } = updateData;
      
      const user = await User.findById(userId);
      if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      if (displayName) user.displayName = displayName;
      if (avatar) user.avatar = avatar;
      if (preferences) {
        user.preferences = { ...user.preferences, ...preferences };
      }

      await user.save();

      logger.info(`Profile updated for user: ${user.email}`);
      return user.toJSON();
    } catch (error) {
      logger.error('AuthService.updateProfile error:', error);
      throw error;
    }
  }

  static generateVerificationToken(userId) {
    return jwt.sign(
      { id: userId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static validateToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return null;
    }
  }

  static getTokenFromHeader(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.split(' ')[1];
  }

  static async sendVerificationEmail(email, token) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
    logger.info(`Verification email would be sent to ${email}: ${verificationUrl}`);
  }

  static async sendPasswordResetEmail(email, token) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    logger.info(`Password reset email would be sent to ${email}: ${resetUrl}`);
  }

  static isAuthenticated(user) {
    return user && user._id;
  }

  static hasRole(user, role) {
    if (!user) return false;
    return user.role === role;
  }

  static hasAnyRole(user, roles) {
    if (!user) return false;
    return roles.includes(user.role);
  }

  static isAdmin(user) {
    return this.hasRole(user, 'admin');
  }

  static getUserPermissions(user) {
    if (!user) return [];
    
    const basePermissions = ['read'];
    
    if (user.role === 'user') {
      return [...basePermissions, 'write', 'comment'];
    }
    
    if (user.role === 'admin') {
      return [...basePermissions, 'write', 'comment', 'share', 'delete', 'admin'];
    }
    
    return basePermissions;
  }
}

module.exports = AuthService;
