const Workspace = require('../models/Workspace');
const Document = require('../models/Document');
const User = require('../models/User');
const { logger } = require('../config/logger');

const WorkspaceController = {
  // Create workspace
  async create(req, res, next) {
    try {
      const { name, description, settings } = req.body;
      const userId = req.user.id;

      const workspace = new Workspace({
        name,
        description,
        owner: userId,
        settings: settings || {},
        members: [{
          user: userId,
          role: 'admin',
        }],
      });

      await workspace.save();

      res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Create workspace error:', error);
      next(error);
    }
  },

  // Get all workspaces for user
  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      const { search, limit = 20, page = 1 } = req.query;

      const query = {
        deletedAt: null,
        $or: [
          { owner: userId },
          { 'members.user': userId },
        ],
      };

      if (search) {
        query.$or.push(
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        );
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const workspaces = await Workspace.find(query)
        .populate('owner', 'username displayName avatar')
        .populate('members.user', 'username displayName avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Workspace.countDocuments(query);

      res.json({
        success: true,
        data: {
          workspaces,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
          },
        },
      });
    } catch (error) {
      logger.error('Get all workspaces error:', error);
      next(error);
    }
  },

  // Get workspace by ID
  async getById(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId)
        .populate('owner', 'username displayName avatar')
        .populate('members.user', 'username displayName avatar');

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check access
      const hasAccess = workspace.owner._id.toString() === userId ||
        workspace.members.some(m => m.user._id.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this workspace',
        });
      }

      // Get workspace documents count
      const documentCount = await Document.countDocuments({
        workspace: workspaceId,
        deletedAt: null,
      });

      res.json({
        success: true,
        data: {
          ...workspace.toObject(),
          documentCount,
        },
      });
    } catch (error) {
      logger.error('Get workspace error:', error);
      next(error);
    }
  },

  // Update workspace
  async update(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const { name, description, settings } = req.body;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update this workspace',
        });
      }

      if (name) workspace.name = name;
      if (description !== undefined) workspace.description = description;
      if (settings) workspace.settings = { ...workspace.settings, ...settings };

      workspace.updatedAt = new Date();
      await workspace.save();

      res.json({
        success: true,
        message: 'Workspace updated successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Update workspace error:', error);
      next(error);
    }
  },

  // Delete workspace
  async delete(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Only owner can delete workspace
      if (workspace.owner.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the owner can delete this workspace',
        });
      }

      // Soft delete
      workspace.deletedAt = new Date();
      await workspace.save();

      // Soft delete all documents in workspace
      await Document.updateMany(
        { workspace: workspaceId },
        { deletedAt: new Date() }
      );

      res.json({
        success: true,
        message: 'Workspace deleted successfully',
      });
    } catch (error) {
      logger.error('Delete workspace error:', error);
      next(error);
    }
  },

  // Add member to workspace
  async addMember(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const { userId, role } = req.body;
      const currentUserId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === currentUserId ||
        workspace.members.some(m => 
          m.user.toString() === currentUserId && m.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add members',
        });
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      workspace.addMember(userId, role || 'member');
      await workspace.save();

      res.json({
        success: true,
        message: 'Member added successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Add member error:', error);
      next(error);
    }
  },

  // Remove member from workspace
  async removeMember(req, res, next) {
    try {
      const { workspaceId, userId } = req.params;
      const currentUserId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === currentUserId ||
        workspace.members.some(m => 
          m.user.toString() === currentUserId && m.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove members',
        });
      }

      // Cannot remove owner
      if (workspace.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the workspace owner',
        });
      }

      workspace.removeMember(userId);
      await workspace.save();

      res.json({
        success: true,
        message: 'Member removed successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Remove member error:', error);
      next(error);
    }
  },

  // Update member role
  async updateMemberRole(req, res, next) {
    try {
      const { workspaceId, userId } = req.params;
      const { role } = req.body;
      const currentUserId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === currentUserId ||
        workspace.members.some(m => 
          m.user.toString() === currentUserId && m.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update member roles',
        });
      }

      // Cannot update owner
      if (workspace.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update the workspace owner',
        });
      }

      const member = workspace.members.find(m => m.user.toString() === userId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found',
        });
      }

      member.role = role;
      await workspace.save();

      res.json({
        success: true,
        message: 'Member role updated successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Update member role error:', error);
      next(error);
    }
  },

  // Get workspace members
  async getMembers(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId)
        .populate('members.user', 'username displayName avatar email')
        .populate('owner', 'username displayName avatar email');

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check access
      const hasAccess = workspace.owner._id.toString() === userId ||
        workspace.members.some(m => m.user._id.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this workspace',
        });
      }

      res.json({
        success: true,
        data: {
          owner: workspace.owner,
          members: workspace.members,
          totalMembers: workspace.members.length + 1, // +1 for owner
        },
      });
    } catch (error) {
      logger.error('Get members error:', error);
      next(error);
    }
  },

  // Get workspace documents
  async getDocuments(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;
      const { status, search, limit = 20, page = 1 } = req.query;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check access
      const hasAccess = workspace.owner.toString() === userId ||
        workspace.members.some(m => m.user.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this workspace',
        });
      }

      const query = {
        workspace: workspaceId,
        deletedAt: null,
      };

      if (status) {
        query.status = status;
      }

      if (search) {
        query.title = { $regex: search, $options: 'i' };
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
      logger.error('Get workspace documents error:', error);
      next(error);
    }
  },

  // Get workspace statistics
  async getStats(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check access
      const hasAccess = workspace.owner.toString() === userId ||
        workspace.members.some(m => m.user.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this workspace',
        });
      }

      // Get document stats
      const documentStats = await Document.aggregate([
        {
          $match: {
            workspace: workspace._id,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]);

      // Get member stats
      const memberCount = workspace.members.length + 1; // +1 for owner

      // Get recent activity
      const recentActivity = await Document.find({
        workspace: workspaceId,
        deletedAt: null,
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('title updatedAt status owner')
        .populate('owner', 'username displayName');

      const stats = {
        totalDocuments: workspace.documentCount || 0,
        memberCount,
        statusDistribution: documentStats,
        recentActivity,
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get workspace stats error:', error);
      next(error);
    }
  },

  // Transfer workspace ownership
  async transferOwnership(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const { newOwnerId } = req.body;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Only current owner can transfer ownership
      if (workspace.owner.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the owner can transfer ownership',
        });
      }

      // Check if new owner exists and is a member
      const newOwner = await User.findById(newOwnerId);
      if (!newOwner) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const isMember = workspace.isMember(newOwnerId);
      if (!isMember) {
        return res.status(400).json({
          success: false,
          message: 'New owner must be a member of the workspace',
        });
      }

      // Transfer ownership
      workspace.owner = newOwnerId;
      workspace.members = workspace.members.map(m => {
        if (m.user.toString() === userId) {
          m.role = 'admin';
        }
        if (m.user.toString() === newOwnerId) {
          m.role = 'admin';
        }
        return m;
      });

      await workspace.save();

      res.json({
        success: true,
        message: 'Workspace ownership transferred successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Transfer ownership error:', error);
      next(error);
    }
  },

  // Archive workspace
  async archiveWorkspace(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to archive this workspace',
        });
      }

      workspace.status = 'archived';
      workspace.updatedAt = new Date();
      await workspace.save();

      // Archive all documents in workspace
      await Document.updateMany(
        { workspace: workspaceId },
        { status: 'archived' }
      );

      res.json({
        success: true,
        message: 'Workspace archived successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Archive workspace error:', error);
      next(error);
    }
  },

  // Unarchive workspace
  async unarchiveWorkspace(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to unarchive this workspace',
        });
      }

      workspace.status = 'active';
      workspace.updatedAt = new Date();
      await workspace.save();

      res.json({
        success: true,
        message: 'Workspace unarchived successfully',
        data: workspace,
      });
    } catch (error) {
      logger.error('Unarchive workspace error:', error);
      next(error);
    }
  },

  // Leave workspace
  async leaveWorkspace(req, res, next) {
    try {
      const { workspaceId } = req.params;
      const userId = req.user.id;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: 'Workspace not found',
        });
      }

      // Owner cannot leave
      if (workspace.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Owner cannot leave the workspace. Transfer ownership first.',
        });
      }

      workspace.removeMember(userId);
      await workspace.save();

      res.json({
        success: true,
        message: 'You have left the workspace',
      });
    } catch (error) {
      logger.error('Leave workspace error:', error);
      next(error);
    }
  },

  // Get user's workspaces (simplified)
  async getUserWorkspaces(req, res, next) {
    try {
      const userId = req.user.id;

      const workspaces = await Workspace.find({
        $or: [
          { owner: userId },
          { 'members.user': userId },
        ],
        deletedAt: null,
        status: 'active',
      })
        .select('name description slug documentCount memberCount updatedAt')
        .populate('owner', 'username displayName')
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

  // Search workspaces
  async searchWorkspaces(req, res, next) {
    try {
      const { query, limit = 10 } = req.query;
      const userId = req.user.id;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
        });
      }

      const workspaces = await Workspace.find({
        $and: [
          {
            $or: [
              { name: { $regex: query, $options: 'i' } },
              { description: { $regex: query, $options: 'i' } },
            ],
          },
          {
            $or: [
              { owner: userId },
              { 'members.user': userId },
            ],
          },
        ],
        deletedAt: null,
      })
        .select('name description slug documentCount memberCount')
        .limit(parseInt(limit));

      res.json({
        success: true,
        data: workspaces,
      });
    } catch (error) {
      logger.error('Search workspaces error:', error);
      next(error);
    }
  },
};

module.exports = WorkspaceController;