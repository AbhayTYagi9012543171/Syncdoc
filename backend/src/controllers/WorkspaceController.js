const Workspace = require('../models/Workspace');
const Document = require('../models/Document');
const User = require('../models/User');
const { logger } = require('../config/logger');

const WorkspaceController = {
  // Create workspace
  async create(req, res, next) {
    try {
      const { name, description, settings } = req.body || {};
      const userId = String(req.user?.id || req.user?._id || '');
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.' },
        });
      }

      const normalizedName = typeof name === 'string' ? name.trim() : '';
      if (!normalizedName) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Workspace name is required.' },
        });
      }

      // Slugs are unique in MongoDB. Append a short stable-per-create suffix
      // so two users can create workspaces with the same display name.
      const baseSlug = normalizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 70) || 'workspace';
      let slug = baseSlug;
      if (await Workspace.exists({ slug })) {
        slug = `${baseSlug}-${require('crypto').randomBytes(3).toString('hex')}`;
      }

      const suppliedSettings = settings && typeof settings === 'object' && !Array.isArray(settings)
        ? settings
        : {};
      const safeSettings = {};
      if (typeof suppliedSettings.allowPublicAccess === 'boolean') {
        safeSettings.allowPublicAccess = suppliedSettings.allowPublicAccess;
      }
      if (['viewer', 'editor', 'admin'].includes(suppliedSettings.defaultDocumentPermissions)) {
        safeSettings.defaultDocumentPermissions = suppliedSettings.defaultDocumentPermissions;
      }

      const workspace = new Workspace({
        name: normalizedName,
        description: typeof description === 'string' ? description.trim().slice(0, 500) : '',
        owner: userId,
        slug,
        settings: safeSettings,
        members: [{
          user: userId,
          role: 'admin',
        }],
        memberCount: 1,
      });

      await workspace.save();

      // Keep the API contract stable even if Mongoose virtual serialization
      // settings change in a later schema revision.
      const workspaceData = workspace.toObject({ virtuals: true });
      workspaceData.id = String(workspace._id);
      workspaceData.workspaceId = String(workspace._id);

      return res.status(201).json({
        success: true,
        message: 'Workspace created successfully',
        data: workspaceData,
      });
    } catch (error) {
      logger.error('Create workspace error:', error);
      next(error);
    }
  },

  // Get all workspaces accessible to the authenticated user.
  // Access conditions and search conditions are kept separate to prevent
  // search results from exposing workspaces the user cannot access.
  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      const search =
        typeof req.query.search === 'string'
          ? req.query.search.trim()
          : '';

      const page = Math.max(
        1,
        Number.parseInt(req.query.page, 10) || 1
      );
      const limit = Math.min(
        100,
        Math.max(1, Number.parseInt(req.query.limit, 10) || 20)
      );

      // Escape regex metacharacters so search text is treated literally.
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const conditions = [
        { deletedAt: null },
        {
          $or: [
            { owner: userId },
            { 'members.user': userId },
          ],
        },
      ];

      if (escapedSearch) {
        conditions.push({
          $or: [
            { name: { $regex: escapedSearch, $options: 'i' } },
            { description: { $regex: escapedSearch, $options: 'i' } },
          ],
        });
      }

      const query = { $and: conditions };
      const skip = (page - 1) * limit;

      const [workspaces, total] = await Promise.all([
        Workspace.find(query)
          .populate('owner', 'username displayName avatar')
          .populate('members.user', 'username displayName avatar')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Workspace.countDocuments(query),
      ]);

      return res.json({
        success: true,
        data: {
          workspaces,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      logger.error('Get all workspaces error:', error);
      return next(error);
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
      const { name, description, settings } = req.body || {};
      const userId = String(req.user?.id || req.user?._id || '');
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.' },
        });
      }

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