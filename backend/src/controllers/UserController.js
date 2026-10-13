const User = require('../models/User');
const Document = require('../models/Document');
const Workspace = require('../models/Workspace');
const { logger } = require('../config/logger');

const UserController = {
  // Get all users (admin only)
  async getAllUsers(req, res, next) {
    try {
      const { search, limit = 20, page = 1 } = req.query;

      const query = {};
      
      if (search) {
        query.$or = [
          { username: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { displayName: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const users = await User.find(query)
        .select('-password -activeSessions -resetPasswordToken -resetPasswordExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await User.countDocuments(query);

      res.json({
        success: true,
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      logger.error('Get all users error:', error);
      next(error);
    }
  },

  // Get user by ID
  async getUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId)
        .select('-password -activeSessions -resetPasswordToken -resetPasswordExpires');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get user stats
      const documentCount = await Document.countDocuments({
        $or: [
          { owner: userId },
          { 'collaborators.user': userId },
        ],
        deletedAt: null,
      });

      const workspaceCount = await Workspace.countDocuments({
        $or: [
          { owner: userId },
          { 'members.user': userId },
        ],
        deletedAt: null,
      });

      res.json({
        success: true,
        data: {
          user,
          stats: {
            documentCount,
            workspaceCount,
            isOnline: user.isOnline,
          },
        },
      });
    } catch (error) {
      logger.error('Get user by ID error:', error);
      next(error);
    }
  },

  // Update user profile
  async updateProfile(req, res, next) {
    try {
      const { userId } = req.params;
      const { displayName, avatar, preferences } = req.body;
      const currentUserId = req.user.id;

      // Users can only update their own profile
      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own profile',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      if (displayName) user.displayName = displayName;
      if (avatar) user.avatar = avatar;
      if (preferences) {
        user.preferences = { ...user.preferences, ...preferences };
      }

      user.updatedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: user.toJSON(),
        },
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  },

  // Update user role (admin only)
  async updateUserRole(req, res, next) {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can update user roles',
        });
      }

      if (!['admin', 'user', 'guest'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role. Must be admin, user, or guest',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      user.role = role;
      user.updatedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'User role updated successfully',
        data: {
          user: user.toJSON(),
        },
      });
    } catch (error) {
      logger.error('Update user role error:', error);
      next(error);
    }
  },

  // Delete user account
  async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      // Users can only delete their own account unless admin
      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own account',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Soft delete
      user.deletedAt = new Date();
      await user.save();

      // Remove user from all documents and workspaces
      await Document.updateMany(
        { 'collaborators.user': userId },
        { $pull: { collaborators: { user: userId } } }
      );

      await Workspace.updateMany(
        { 'members.user': userId },
        { $pull: { members: { user: userId } } }
      );

      res.json({
        success: true,
        message: 'User account deleted successfully',
      });
    } catch (error) {
      logger.error('Delete user error:', error);
      next(error);
    }
  },

  // Permanently delete user (admin only)
  async permanentDeleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can permanently delete users',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Remove all user data
      await Document.deleteMany({ owner: userId });
      await Workspace.deleteMany({ owner: userId });
      await user.remove();

      res.json({
        success: true,
        message: 'User permanently deleted',
      });
    } catch (error) {
      logger.error('Permanent delete user error:', error);
      next(error);
    }
  },

  // Get current user's documents
  async getUserDocuments(req, res, next) {
    try {
      const { userId } = req.params;
      const { status, limit = 20, page = 1 } = req.query;
      const currentUserId = req.user.id;

      // Users can only view their own documents unless admin
      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own documents',
        });
      }

      const query = {
        deletedAt: null,
        $or: [
          { owner: userId },
          { 'collaborators.user': userId },
        ],
      };

      if (status) {
        query.status = status;
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const documents = await Document.find(query)
        .populate('owner', 'username displayName avatar')
        .populate('collaborators.user', 'username displayName avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Document.countDocuments(query);

      res.json({
        success: true,
        data: {
          documents,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      logger.error('Get user documents error:', error);
      next(error);
    }
  },

  // Get current user's workspaces
  async getUserWorkspaces(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own workspaces',
        });
      }

      const workspaces = await Workspace.find({
        $or: [
          { owner: userId },
          { 'members.user': userId },
        ],
        deletedAt: null,
      })
        .populate('owner', 'username displayName avatar')
        .populate('members.user', 'username displayName avatar')
        .sort({ updatedAt: -1 });

      res.json({
        success: true,
        data: workspaces,
      });
    } catch (error) {
      logger.error('Get user workspaces error:', error);
      next(error);
    }
  },

  // Get user activity
  async getUserActivity(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own activity',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Get recent documents
      const recentDocuments = await Document.find({
        $or: [
          { owner: userId },
          { 'collaborators.user': userId },
        ],
        deletedAt: null,
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title updatedAt status');

      // Get recent collaborators
      const recentCollaborators = await Document.aggregate([
        {
          $match: {
            deletedAt: null,
            'collaborators.user': userId,
          },
        },
        {
          $unwind: '$collaborators',
        },
        {
          $match: {
            'collaborators.user': { $ne: userId },
          },
        },
        {
          $group: {
            _id: '$collaborators.user',
            count: { $sum: 1 },
            lastActive: { $max: '$updatedAt' },
          },
        },
        {
          $sort: { count: -1 },
        },
        {
          $limit: 5,
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        {
          $unwind: '$userInfo',
        },
        {
          $project: {
            userId: '$_id',
            username: '$userInfo.username',
            displayName: '$userInfo.displayName',
            avatar: '$userInfo.avatar',
            count: 1,
            lastActive: 1,
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          recentDocuments,
          recentCollaborators,
          totalDocuments: user.stats?.totalDocuments || 0,
          totalEdits: user.stats?.totalEdits || 0,
          lastActive: user.lastLogin,
        },
      });
    } catch (error) {
      logger.error('Get user activity error:', error);
      next(error);
    }
  },

  // Get user sessions
  async getUserSessions(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own sessions',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: {
          sessions: user.activeSessions || [],
          totalSessions: user.activeSessions?.length || 0,
        },
      });
    } catch (error) {
      logger.error('Get user sessions error:', error);
      next(error);
    }
  },

  // Terminate a session
  async terminateSession(req, res, next) {
    try {
      const { userId, socketId } = req.params;
      const currentUserId = req.user.id;

      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only terminate your own sessions',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      await user.removeSession(socketId);

      res.json({
        success: true,
        message: 'Session terminated successfully',
      });
    } catch (error) {
      logger.error('Terminate session error:', error);
      next(error);
    }
  },

  // Terminate all sessions
  async terminateAllSessions(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only terminate your own sessions',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      user.activeSessions = [];
      await user.save();

      res.json({
        success: true,
        message: 'All sessions terminated successfully',
      });
    } catch (error) {
      logger.error('Terminate all sessions error:', error);
      next(error);
    }
  },

  // Get user preferences
  async getUserPreferences(req, res, next) {
    try {
      const { userId } = req.params;
      const currentUserId = req.user.id;

      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own preferences',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        data: user.preferences,
      });
    } catch (error) {
      logger.error('Get user preferences error:', error);
      next(error);
    }
  },

  // Update user preferences
  async updateUserPreferences(req, res, next) {
    try {
      const { userId } = req.params;
      const { preferences } = req.body;
      const currentUserId = req.user.id;

      if (userId !== currentUserId && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own preferences',
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      user.preferences = { ...user.preferences, ...preferences };
      user.updatedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: user.preferences,
      });
    } catch (error) {
      logger.error('Update user preferences error:', error);
      next(error);
    }
  },

  // Get user statistics (admin only)
  async getUserStats(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can view user statistics',
        });
      }

      const totalUsers = await User.countDocuments({ deletedAt: null });
      const activeUsers = await User.countDocuments({
        deletedAt: null,
        'activeSessions.0': { $exists: true },
      });
      const verifiedUsers = await User.countDocuments({
        deletedAt: null,
        isVerified: true,
      });
      const totalDocuments = await Document.countDocuments({ deletedAt: null });

      // Get user growth over time (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const growth = await User.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
        },
      ]);

      const stats = {
        totalUsers,
        activeUsers,
        verifiedUsers,
        unverifiedUsers: totalUsers - verifiedUsers,
        totalDocuments,
        growth: growth.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          count: item.count,
        })),
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get user stats error:', error);
      next(error);
    }
  },

  // Search users
  async searchUsers(req, res, next) {
    try {
      const { query, limit = 10 } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: 'i' } },
          { displayName: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
        ],
        deletedAt: null,
      })
        .select('username displayName avatar email')
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: users,
      });
    } catch (error) {
      logger.error('Search users error:', error);
      next(error);
    }
  },

  // Bulk update users (admin only)
  async bulkUpdateUsers(req, res, next) {
    try {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Only admins can perform bulk updates',
        });
      }

      const { userIds, updates } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'User IDs are required',
        });
      }

      if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Updates are required',
        });
      }

      const result = await User.updateMany(
        { _id: { $in: userIds } },
        { $set: { ...updates, updatedAt: new Date() } }
      );

      res.json({
        success: true,
        message: `${result.modifiedCount} users updated successfully`,
        data: {
          matched: result.matchedCount,
          modified: result.modifiedCount,
        },
      });
    } catch (error) {
      logger.error('Bulk update users error:', error);
      next(error);
    }
  },
};

module.exports = UserController;