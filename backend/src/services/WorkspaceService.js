const Workspace = require('../models/Workspace');
const Document = require('../models/Document');
const User = require('../models/User');
const { logger } = require('../config/logger');
const { APIError } = require('../middleware/errorHandler');

/**
 * Workspace Service
 * Handles all workspace-related business logic
 */
class WorkspaceService {
  /**
   * Create a new workspace
   */
  static async createWorkspace(userId, data) {
    try {
      const { name, description, settings } = data;

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

      logger.info(`Workspace created: ${workspace.name} by user ${userId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.createWorkspace error:', error);
      throw error;
    }
  }

  /**
   * Get workspace by ID
   */
  static async getWorkspaceById(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId)
        .populate('owner', 'username displayName avatar')
        .populate('members.user', 'username displayName avatar');

      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check access
      const hasAccess = workspace.owner._id.toString() === userId ||
        workspace.members.some(m => m.user._id.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      // Get document count
      const documentCount = await Document.countDocuments({
        workspace: workspaceId,
        deletedAt: null,
      });

      return {
        ...workspace.toObject(),
        documentCount,
      };
    } catch (error) {
      logger.error('WorkspaceService.getWorkspaceById error:', error);
      throw error;
    }
  }

  /**
   * Get all workspaces for a user
   */
  static async getUserWorkspaces(userId, options = {}) {
    try {
      const { search, limit = 20, page = 1 } = options;

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

      return {
        workspaces,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('WorkspaceService.getUserWorkspaces error:', error);
      throw error;
    }
  }

  /**
   * Update workspace
   */
  static async updateWorkspace(workspaceId, userId, updateData) {
    try {
      const { name, description, settings } = updateData;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to update this workspace', 403, 'WORKSPACE_UPDATE_DENIED');
      }

      if (name) workspace.name = name;
      if (description !== undefined) workspace.description = description;
      if (settings) workspace.settings = { ...workspace.settings, ...settings };

      workspace.updatedAt = new Date();
      await workspace.save();

      logger.info(`Workspace updated: ${workspace.name} by user ${userId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.updateWorkspace error:', error);
      throw error;
    }
  }

  /**
   * Delete workspace (soft delete)
   */
  static async deleteWorkspace(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Only owner can delete workspace
      if (workspace.owner.toString() !== userId) {
        throw new APIError('Only the owner can delete this workspace', 403, 'WORKSPACE_DELETE_DENIED');
      }

      // Soft delete
      workspace.deletedAt = new Date();
      await workspace.save();

      // Soft delete all documents in workspace
      await Document.updateMany(
        { workspace: workspaceId },
        { deletedAt: new Date() }
      );

      logger.info(`Workspace deleted: ${workspace.name} by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('WorkspaceService.deleteWorkspace error:', error);
      throw error;
    }
  }

  /**
   * Add member to workspace
   */
  static async addMember(workspaceId, userId, collaboratorId, role = 'member') {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to add members', 403, 'ADD_MEMBER_DENIED');
      }

      // Check if user exists
      const user = await User.findById(collaboratorId);
      if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      workspace.addMember(collaboratorId, role);
      await workspace.save();

      logger.info(`Member added to workspace ${workspace.name} by user ${userId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.addMember error:', error);
      throw error;
    }
  }

  /**
   * Remove member from workspace
   */
  static async removeMember(workspaceId, userId, collaboratorId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to remove members', 403, 'REMOVE_MEMBER_DENIED');
      }

      // Cannot remove owner
      if (workspace.owner.toString() === collaboratorId) {
        throw new APIError('Cannot remove the workspace owner', 400, 'CANNOT_REMOVE_OWNER');
      }

      workspace.removeMember(collaboratorId);
      await workspace.save();

      logger.info(`Member removed from workspace ${workspace.name} by user ${userId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.removeMember error:', error);
      throw error;
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(workspaceId, userId, collaboratorId, role) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to update member roles', 403, 'UPDATE_ROLE_DENIED');
      }

      // Cannot update owner
      if (workspace.owner.toString() === collaboratorId) {
        throw new APIError('Cannot update the workspace owner', 400, 'CANNOT_UPDATE_OWNER');
      }

      const member = workspace.members.find(m => m.user.toString() === collaboratorId);
      if (!member) {
        throw new APIError('Member not found', 404, 'MEMBER_NOT_FOUND');
      }

      member.role = role;
      await workspace.save();

      logger.info(`Member role updated in workspace ${workspace.name} by user ${userId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.updateMemberRole error:', error);
      throw error;
    }
  }

  /**
   * Get workspace members
   */
  static async getWorkspaceMembers(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId)
        .populate('members.user', 'username displayName avatar email')
        .populate('owner', 'username displayName avatar email');

      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check access
      const hasAccess = workspace.owner._id.toString() === userId ||
        workspace.members.some(m => m.user._id.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      return {
        owner: workspace.owner,
        members: workspace.members,
        totalMembers: workspace.members.length + 1, // +1 for owner
      };
    } catch (error) {
      logger.error('WorkspaceService.getWorkspaceMembers error:', error);
      throw error;
    }
  }

  /**
   * Get workspace documents
   */
  static async getWorkspaceDocuments(workspaceId, userId, options = {}) {
    try {
      const { status, search, limit = 20, page = 1 } = options;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check access
      const hasAccess = workspace.owner.toString() === userId ||
        workspace.members.some(m => m.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
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

      return {
        documents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('WorkspaceService.getWorkspaceDocuments error:', error);
      throw error;
    }
  }

  /**
   * Get workspace statistics
   */
  static async getWorkspaceStats(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check access
      const hasAccess = workspace.owner.toString() === userId ||
        workspace.members.some(m => m.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
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
            totalEdits: { $sum: '$stats.totalEdits' },
            totalWords: { $sum: '$stats.wordCount' },
          },
        },
      ]);

      // Get member count
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

      // Get total document count
      const totalDocuments = await Document.countDocuments({
        workspace: workspaceId,
        deletedAt: null,
      });

      // Get document size stats
      const sizeStats = await Document.aggregate([
        {
          $match: {
            workspace: workspace._id,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalSize: { $sum: { $strLenCP: { $toString: '$ast' } } },
            avgSize: { $avg: { $strLenCP: { $toString: '$ast' } } },
          },
        },
      ]);

      const stats = {
        totalDocuments,
        memberCount,
        statusDistribution: documentStats,
        recentActivity,
        sizeStats: sizeStats[0] || { totalSize: 0, avgSize: 0 },
        createdAt: workspace.createdAt,
        updatedAt: workspace.updatedAt,
      };

      return stats;
    } catch (error) {
      logger.error('WorkspaceService.getWorkspaceStats error:', error);
      throw error;
    }
  }

  /**
   * Transfer workspace ownership
   */
  static async transferOwnership(workspaceId, userId, newOwnerId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Only current owner can transfer ownership
      if (workspace.owner.toString() !== userId) {
        throw new APIError('Only the owner can transfer ownership', 403, 'TRANSFER_OWNERSHIP_DENIED');
      }

      // Check if new owner exists and is a member
      const newOwner = await User.findById(newOwnerId);
      if (!newOwner) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      const isMember = workspace.isMember(newOwnerId);
      if (!isMember) {
        throw new APIError('New owner must be a member of the workspace', 400, 'NEW_OWNER_NOT_MEMBER');
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

      logger.info(`Workspace ownership transferred: ${workspace.name} from user ${userId} to ${newOwnerId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.transferOwnership error:', error);
      throw error;
    }
  }

  /**
   * Archive workspace
   */
  static async archiveWorkspace(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to archive this workspace', 403, 'ARCHIVE_DENIED');
      }

      workspace.status = 'archived';
      workspace.updatedAt = new Date();
      await workspace.save();

      // Archive all documents in workspace
      await Document.updateMany(
        { workspace: workspaceId },
        { status: 'archived' }
      );

      logger.info(`Workspace archived: ${workspace.name} by user ${userId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.archiveWorkspace error:', error);
      throw error;
    }
  }

  /**
   * Unarchive workspace
   */
  static async unarchiveWorkspace(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to unarchive this workspace', 403, 'UNARCHIVE_DENIED');
      }

      workspace.status = 'active';
      workspace.updatedAt = new Date();
      await workspace.save();

      logger.info(`Workspace unarchived: ${workspace.name} by user ${userId}`);
      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.unarchiveWorkspace error:', error);
      throw error;
    }
  }

  /**
   * Leave workspace
   */
  static async leaveWorkspace(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Owner cannot leave
      if (workspace.owner.toString() === userId) {
        throw new APIError('Owner cannot leave the workspace. Transfer ownership first.', 400, 'OWNER_CANNOT_LEAVE');
      }

      workspace.removeMember(userId);
      await workspace.save();

      logger.info(`User ${userId} left workspace ${workspace.name}`);
      return { success: true };
    } catch (error) {
      logger.error('WorkspaceService.leaveWorkspace error:', error);
      throw error;
    }
  }

  /**
   * Search workspaces
   */
  static async searchWorkspaces(userId, query, options = {}) {
    try {
      const { limit = 20 } = options;

      if (!query) {
        throw new APIError('Search query is required', 400, 'SEARCH_QUERY_REQUIRED');
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
        status: 'active',
      })
        .select('name description slug documentCount memberCount updatedAt')
        .populate('owner', 'username displayName')
        .limit(parseInt(limit))
        .sort({ updatedAt: -1 });

      return workspaces;
    } catch (error) {
      logger.error('WorkspaceService.searchWorkspaces error:', error);
      throw error;
    }
  }

  /**
   * Get workspace by slug
   */
  static async getWorkspaceBySlug(slug, userId) {
    try {
      const workspace = await Workspace.findOne({ slug, deletedAt: null })
        .populate('owner', 'username displayName avatar')
        .populate('members.user', 'username displayName avatar');

      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check access
      const hasAccess = workspace.owner._id.toString() === userId ||
        workspace.members.some(m => m.user._id.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      return workspace;
    } catch (error) {
      logger.error('WorkspaceService.getWorkspaceBySlug error:', error);
      throw error;
    }
  }

  /**
   * Get workspace members count
   */
  static async getWorkspaceMemberCount(workspaceId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      return {
        totalMembers: workspace.members.length + 1, // +1 for owner
        activeMembers: workspace.members.filter(m => m.user).length + 1,
      };
    } catch (error) {
      logger.error('WorkspaceService.getWorkspaceMemberCount error:', error);
      throw error;
    }
  }

  /**
   * Get workspace activity
   */
  static async getWorkspaceActivity(workspaceId, userId, options = {}) {
    try {
      const { limit = 20, page = 1 } = options;

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      // Check access
      const hasAccess = workspace.owner.toString() === userId ||
        workspace.members.some(m => m.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Get recent document updates
      const recentDocuments = await Document.find({
        workspace: workspaceId,
        deletedAt: null,
      })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('title updatedAt status owner')
        .populate('owner', 'username displayName');

      // Get total activity count
      const total = await Document.countDocuments({
        workspace: workspaceId,
        deletedAt: null,
      });

      return {
        activity: recentDocuments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('WorkspaceService.getWorkspaceActivity error:', error);
      throw error;
    }
  }

  /**
   * Validate workspace membership
   */
  static async validateMembership(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return { valid: false, error: 'Workspace not found' };
      }

      const isMember = workspace.isMember(userId) || workspace.owner.toString() === userId;

      return {
        valid: isMember,
        workspace,
      };
    } catch (error) {
      logger.error('WorkspaceService.validateMembership error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate workspace admin
   */
  static async validateAdmin(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return { valid: false, error: 'Workspace not found' };
      }

      const isAdmin = workspace.owner.toString() === userId ||
        workspace.members.some(m => 
          m.user.toString() === userId && m.role === 'admin'
        );

      return {
        valid: isAdmin,
        workspace,
      };
    } catch (error) {
      logger.error('WorkspaceService.validateAdmin error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate workspace owner
   */
  static async validateOwner(workspaceId, userId) {
    try {
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return { valid: false, error: 'Workspace not found' };
      }

      return {
        valid: workspace.owner.toString() === userId,
        workspace,
      };
    } catch (error) {
      logger.error('WorkspaceService.validateOwner error:', error);
      return { valid: false, error: error.message };
    }
  }
}

module.exports = WorkspaceService;