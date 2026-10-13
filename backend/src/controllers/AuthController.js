const User = require('../models/User');
const { setupLogger } = require('../config/logger');
const jwt = require('jsonwebtoken');

const logger = setupLogger();

const AuthController = {
  // =========================================================
  // REGISTER
  // POST /api/v1/auth/register
  // =========================================================
  async register(req, res, next) {
    try {
      const {
        name,
        username,
        email,
        password,
        displayName,
      } = req.body;

      // -------------------------------------------------------
      // Validate required fields
      // -------------------------------------------------------
      if (!name && !username) {
        return res.status(400).json({
          success: false,
          message: 'Name or username is required',
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required',
        });
      }

      // -------------------------------------------------------
      // Create a valid username
      //
      // Example:
      // "Prashant Sharma" -> "prashant_sharma"
      // "Prashant Sharma" -> "prashant _sharma"
      // "Prashant@Sharma" -> "prashant_sharma"
      // -------------------------------------------------------
      let finalUsername = username || name;

      finalUsername = String(finalUsername)
        .trim()
        .toLowerCase()
        .replace(/[^a-zA-Z0-9_]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_');

      // -------------------------------------------------------
      // Validate generated username
      // -------------------------------------------------------
      if (!finalUsername) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid name or username',
        });
      }

      // -------------------------------------------------------
      // Check username length
      // -------------------------------------------------------
      if (finalUsername.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Username must contain at least 3 characters',
        });
      }

      // Keep username within a reasonable length
      if (finalUsername.length > 30) {
        finalUsername = finalUsername.substring(0, 30);
      }

      // -------------------------------------------------------
      // Check email
      // -------------------------------------------------------
      const emailExists = await User.isEmailTaken(email);

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      // -------------------------------------------------------
      // Check username and generate unique username if needed
      // -------------------------------------------------------
      const originalUsername = finalUsername;

      let usernameExists =
        await User.isUsernameTaken(finalUsername);

      let counter = 1;

      while (usernameExists && counter <= 999) {
        const suffix = `_${counter}`;

        // Make sure total length does not exceed 30
        const baseLength = 30 - suffix.length;

        finalUsername =
          originalUsername.substring(0, baseLength) + suffix;

        usernameExists =
          await User.isUsernameTaken(finalUsername);

        counter++;
      }

      if (usernameExists) {
        return res.status(400).json({
          success: false,
          message: 'Unable to generate a unique username',
        });
      }

      // -------------------------------------------------------
      // Display name
      // -------------------------------------------------------
      const finalDisplayName =
        displayName ||
        name ||
        finalUsername;

      // -------------------------------------------------------
      // Create user
      // -------------------------------------------------------
      const user = new User({
        username: finalUsername,
        email: String(email).trim().toLowerCase(),
        password,
        displayName: finalDisplayName,
      });

      await user.save();

      // -------------------------------------------------------
      // Generate tokens
      // -------------------------------------------------------
      const accessToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      logger.info(
        `User registered successfully: ${user.email}`
      );

      // -------------------------------------------------------
      // Response
      // -------------------------------------------------------
      return res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error(
        `Register error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return next(error);
    }
  },

  // =========================================================
  // LOGIN
  // POST /api/v1/auth/login
  // =========================================================
  async login(req, res, next) {
    try {
      const {
        email,
        password,
      } = req.body;

      // -------------------------------------------------------
      // Validate
      // -------------------------------------------------------
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required',
        });
      }

      // -------------------------------------------------------
      // Find user
      // -------------------------------------------------------
      const user = await User.findByCredentials(
        String(email).trim().toLowerCase(),
        password
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      // -------------------------------------------------------
      // Update last login
      // -------------------------------------------------------
      user.lastLogin = new Date();

      await user.save();

      // -------------------------------------------------------
      // Generate tokens
      // -------------------------------------------------------
      const accessToken =
        user.generateAuthToken();

      const refreshToken =
        user.generateRefreshToken();

      logger.info(
        `User login successful: ${user.email}`
      );

      return res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toJSON(),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error(
        `Login error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return res.status(401).json({
        success: false,
        message:
          error.message ||
          'Invalid email or password',
      });
    }
  },

  // =========================================================
  // REFRESH TOKEN
  // POST /api/v1/auth/refresh
  // =========================================================
  async refreshToken(req, res) {
    try {
      const {
        refreshToken,
      } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token required',
        });
      }

      const secret =
        process.env.REFRESH_TOKEN_SECRET ||
        process.env.JWT_SECRET;

      if (!secret) {
        return res.status(500).json({
          success: false,
          message: 'JWT secret is not configured',
        });
      }

      const decoded = jwt.verify(
        refreshToken,
        secret
      );

      const user = await User.findById(
        decoded.id
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token',
        });
      }

      const accessToken =
        user.generateAuthToken();

      return res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken,
        },
      });
    } catch (error) {
      logger.error(
        `Refresh token error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return res.status(401).json({
        success: false,
        message:
          'Invalid or expired refresh token',
      });
    }
  },

  // =========================================================
  // LOGOUT
  // POST /api/v1/auth/logout
  // =========================================================
  async logout(req, res, next) {
    try {
      const {
        socketId,
      } = req.body;

      if (
        req.user &&
        socketId &&
        typeof req.user.removeSession === 'function'
      ) {
        await req.user.removeSession(
          socketId
        );
      }

      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      logger.error(
        `Logout error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return next(error);
    }
  },

  // =========================================================
  // GET CURRENT USER
  // GET /api/v1/auth/me
  // =========================================================
  async getMe(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      return res.json({
        success: true,
        data: {
          user: req.user.toJSON(),
        },
      });
    } catch (error) {
      logger.error(
        `Get me error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return next(error);
    }
  },

  // =========================================================
  // UPDATE PASSWORD
  // PUT /api/v1/auth/password
  // =========================================================
  async updatePassword(req, res, next) {
    try {
      const {
        currentPassword,
        newPassword,
      } = req.body;

      const user = req.user;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message:
            'Current password and new password are required',
        });
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      const isMatch =
        await user.comparePassword(
          currentPassword
        );

      if (!isMatch) {
        return res.status(400).json({
          success: false,
          message:
            'Current password is incorrect',
        });
      }

      user.password = newPassword;

      await user.save();

      return res.json({
        success: true,
        message:
          'Password updated successfully',
      });
    } catch (error) {
      logger.error(
        `Update password error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return next(error);
    }
  },

  // =========================================================
  // FORGOT PASSWORD
  // POST /api/v1/auth/forgot-password
  // =========================================================
  async forgotPassword(req, res, next) {
    try {
      const {
        email,
      } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required',
        });
      }

      const user = await User.findOne({
        email: String(email)
          .trim()
          .toLowerCase(),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'JWT secret is not configured',
        });
      }

      const resetToken = jwt.sign(
        {
          id: user._id,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: '1h',
        }
      );

      user.resetPasswordToken =
        resetToken;

      user.resetPasswordExpires =
        Date.now() + 3600000;

      await user.save();

      return res.json({
        success: true,
        message:
          'Password reset link sent to email',
        data: {
          resetToken,
        },
      });
    } catch (error) {
      logger.error(
        `Forgot password error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return next(error);
    }
  },

  // =========================================================
  // RESET PASSWORD
  // POST /api/v1/auth/reset-password
  // =========================================================
  async resetPassword(req, res) {
    try {
      const {
        token,
        newPassword,
      } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message:
            'Token and new password are required',
        });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'JWT secret is not configured',
        });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const user = await User.findOne({
        _id: decoded.id,
        resetPasswordToken: token,
        resetPasswordExpires: {
          $gt: Date.now(),
        },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid or expired reset token',
        });
      }

      user.password = newPassword;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;

      await user.save();

      return res.json({
        success: true,
        message:
          'Password reset successfully',
      });
    } catch (error) {
      logger.error(
        `Reset password error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return res.status(400).json({
        success: false,
        message:
          'Invalid or expired reset token',
      });
    }
  },

  // =========================================================
  // VERIFY EMAIL
  // GET /api/v1/auth/verify-email/:token
  // =========================================================
  async verifyEmail(req, res) {
    try {
      const {
        token,
      } = req.params;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Verification token is required',
        });
      }

      if (!process.env.JWT_SECRET) {
        return res.status(500).json({
          success: false,
          message: 'JWT secret is not configured',
        });
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      const user =
        await User.findById(decoded.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      user.isVerified = true;

      await user.save();

      return res.json({
        success: true,
        message:
          'Email verified successfully',
      });
    } catch (error) {
      logger.error(
        `Verify email error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return res.status(400).json({
        success: false,
        message:
          'Invalid or expired verification token',
      });
    }
  },

  // =========================================================
  // UPDATE PROFILE
  // PUT /api/v1/auth/profile
  // =========================================================
  async updateProfile(req, res, next) {
    try {
      const {
        displayName,
        avatar,
        preferences,
      } = req.body;

      const user = req.user;

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
      }

      if (displayName) {
        user.displayName =
          displayName;
      }

      if (avatar) {
        user.avatar = avatar;
      }

      if (preferences) {
        user.preferences = {
          ...(user.preferences || {}),
          ...preferences,
        };
      }

      await user.save();

      return res.json({
        success: true,
        message:
          'Profile updated successfully',
        data: {
          user: user.toJSON(),
        },
      });
    } catch (error) {
      logger.error(
        `Update profile error: ${error.message}`,
        {
          stack: error.stack,
        }
      );

      return next(error);
    }
  },
};

module.exports = AuthController;