const Document = require('../models/Document');
const Workspace = require('../models/Workspace');
const User = require('../models/User');
const DocumentOperation = require('../models/DocumentOperation');
const { OperationTransformer } = require('./ot/OperationTransformer');
const { logger } = require('../config/logger');
const { APIError } = require('../middleware/errorHandler');

/**
 * Document Service
 * Handles all document-related business logic
 */
class DocumentService {
  /**
   * Create a new document
   */
  static async createDocument(userId, data) {
    try {
      const { title, workspaceId, description, ast, content = '' } = data;

      // Check workspace exists and user has access
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new APIError('Workspace not found', 404, 'WORKSPACE_NOT_FOUND');
      }

      const isMember = workspace.isMember(userId) || workspace.owner.toString() === userId;
      if (!isMember) {
        throw new APIError('You do not have access to this workspace', 403, 'WORKSPACE_ACCESS_DENIED');
      }

      const document = new Document({
        title,
        workspace: workspaceId,
        owner: userId,
        description: description || '',
        ast: ast || [],
        content,
        collaborators: [{
          user: userId,
          role: 'admin',
        }],
      });

      document.operations.push({ operation: { type: 'update', action: 'created', title: document.title }, userId, version: Math.max(1, document.currentVersion || 0), type: 'update', timestamp: new Date() });
      await document.save();

      // Update workspace document count
      workspace.documentCount = (workspace.documentCount || 0) + 1;
      await workspace.save();

      logger.info(`Document created: ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.createDocument error:', error);
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  static async getDocumentById(documentId, userId) {
    try {
      const document = await Document.findById(documentId)
        .populate('owner', 'username displayName avatar')
        .populate('collaborators.user', 'username displayName avatar');

      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check access
      const hasAccess = document.owner._id.toString() === userId ||
        document.collaborators.some(c => c.user._id.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this document', 403, 'DOCUMENT_ACCESS_DENIED');
      }

      // Increment view count
      document.incrementViews();
      await document.save();

      return document;
    } catch (error) {
      logger.error('DocumentService.getDocumentById error:', error);
      throw error;
    }
  }

  /**
   * Get all documents for a user
   */
  static async getUserDocuments(userId, options = {}) {
    try {
      const { workspaceId, status, search, limit = 20, page = 1 } = options;

      const query = {
        deletedAt: null,
        $or: [
          { owner: userId },
          { 'collaborators.user': userId },
        ],
      };

      if (workspaceId) {
        query.workspace = workspaceId;
      }

      if (status) {
        query.status = status;
      }

      if (search) {
        query.$text = { $search: search };
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
      logger.error('DocumentService.getUserDocuments error:', error);
      throw error;
    }
  }

  /**
   * Update document
   */
  static async updateDocument(documentId, userId, updateData) {
    try {
      const { title, description, ast, content, version, settings, status, tags, favorite } = updateData;

      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check edit permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && 
          (c.role === 'admin' || c.role === 'editor')
        );

      if (!hasPermission) {
        throw new APIError('You do not have permission to edit this document', 403, 'EDIT_PERMISSION_DENIED');
      }

      // Update fields
      if (title) document.title = title;
      if (description !== undefined) document.description = description;
      if (content !== undefined) document.content = String(content);
      if (favorite !== undefined) document.favorite = Boolean(favorite);
      if (settings) document.settings = { ...document.settings, ...settings };
      if (status) document.status = status;
      if (tags) document.tags = tags;

      // Update AST with OT
      if (ast && version !== undefined) {
        const transformer = new OperationTransformer(document);
        document.ast = ast;
        document.currentVersion = version + 1;
      }

      document.operations.push({ operation: { type: 'update', action: 'edited', title: document.title }, userId, version: Math.max(1, document.currentVersion || 0), type: 'update', timestamp: new Date() });
      document.stats.totalEdits = (document.stats.totalEdits || 0) + 1;
      document.stats.lastEditedAt = new Date();
      document.updatedAt = new Date();
      await document.save();

      // Create version history
      if (ast && version !== undefined) {
        document.createVersion(userId, 'Updated document content');
        await document.save();
      }

      logger.info(`Document updated: ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.updateDocument error:', error);
      throw error;
    }
  }

  /**
   * Delete document (soft delete)
   */
  static async deleteDocument(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check delete permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && c.role === 'admin'
        );

      if (!hasPermission) {
        throw new APIError('You do not have permission to delete this document', 403, 'DELETE_PERMISSION_DENIED');
      }

      // Soft delete
      document.deletedAt = new Date();
      await document.save();

      // Update workspace document count
      const workspace = await Workspace.findById(document.workspace);
      if (workspace) {
        workspace.documentCount = Math.max(0, (workspace.documentCount || 1) - 1);
        await workspace.save();
      }

      logger.info(`Document deleted: ${document.title} by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('DocumentService.deleteDocument error:', error);
      throw error;
    }
  }

  /**
   * Permanently delete document
   */
  static async permanentDeleteDocument(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Only owner can permanently delete
      if (document.owner.toString() !== userId) {
        throw new APIError('Only the owner can permanently delete this document', 403, 'PERMANENT_DELETE_DENIED');
      }

      await document.remove();

      logger.info(`Document permanently deleted: ${document.title} by user ${userId}`);
      return { success: true };
    } catch (error) {
      logger.error('DocumentService.permanentDeleteDocument error:', error);
      throw error;
    }
  }

  /**
   * Get document versions
   */
  static async getDocumentVersions(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this document', 403, 'DOCUMENT_ACCESS_DENIED');
      }

      return {
        versions: document.versions,
        currentVersion: document.currentVersion,
        totalVersions: document.versions.length,
      };
    } catch (error) {
      logger.error('DocumentService.getDocumentVersions error:', error);
      throw error;
    }
  }

  /**
   * Restore document version
   */
  static async restoreDocumentVersion(documentId, userId, versionNumber) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && 
          (c.role === 'admin' || c.role === 'editor')
        );

      if (!hasPermission) {
        throw new APIError('You do not have permission to restore versions', 403, 'RESTORE_PERMISSION_DENIED');
      }

      await document.restoreVersion(versionNumber);
      await document.save();

      logger.info(`Document version restored: ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.restoreDocumentVersion error:', error);
      throw error;
    }
  }

  /**
   * Add collaborator to document
   */
  static async addCollaborator(documentId, userId, collaboratorId, role, permissions) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && c.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to add collaborators', 403, 'ADD_COLLABORATOR_DENIED');
      }

      // Check if user exists
      const user = await User.findById(collaboratorId);
      if (!user) {
        throw new APIError('User not found', 404, 'USER_NOT_FOUND');
      }

      document.addCollaborator(collaboratorId, role, permissions);
      await document.save();

      logger.info(`Collaborator added to document ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.addCollaborator error:', error);
      throw error;
    }
  }

  /**
   * Remove collaborator from document
   */
  static async removeCollaborator(documentId, userId, collaboratorId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && c.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to remove collaborators', 403, 'REMOVE_COLLABORATOR_DENIED');
      }

      // Cannot remove owner
      if (document.owner.toString() === collaboratorId) {
        throw new APIError('Cannot remove the document owner', 400, 'CANNOT_REMOVE_OWNER');
      }

      document.removeCollaborator(collaboratorId);
      await document.save();

      logger.info(`Collaborator removed from document ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.removeCollaborator error:', error);
      throw error;
    }
  }

  /**
   * Update collaborator role
   */
  static async updateCollaborator(documentId, userId, collaboratorId, role, permissions) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check admin permission
      const isAdmin = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && c.role === 'admin'
        );

      if (!isAdmin) {
        throw new APIError('You do not have permission to update collaborators', 403, 'UPDATE_COLLABORATOR_DENIED');
      }

      // Cannot update owner
      if (document.owner.toString() === collaboratorId) {
        throw new APIError('Cannot update the document owner', 400, 'CANNOT_UPDATE_OWNER');
      }

      const collaborator = document.collaborators.find(c => c.user.toString() === collaboratorId);
      if (!collaborator) {
        throw new APIError('Collaborator not found', 404, 'COLLABORATOR_NOT_FOUND');
      }

      collaborator.role = role || collaborator.role;
      collaborator.permissions = permissions || collaborator.permissions;
      await document.save();

      logger.info(`Collaborator updated in document ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.updateCollaborator error:', error);
      throw error;
    }
  }

  /**
   * Get document collaborators
   */
  static async getDocumentCollaborators(documentId, userId) {
    try {
      const document = await Document.findById(documentId)
        .populate('collaborators.user', 'username displayName avatar email');

      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user._id.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this document', 403, 'DOCUMENT_ACCESS_DENIED');
      }

      const owner = await User.findById(document.owner).select('username displayName avatar email');

      return {
        owner,
        collaborators: document.collaborators,
      };
    } catch (error) {
      logger.error('DocumentService.getDocumentCollaborators error:', error);
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  static async getDocumentStats(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this document', 403, 'DOCUMENT_ACCESS_DENIED');
      }

      // Get operation statistics
      const operationStats = await DocumentOperation.getStatistics(documentId);

      return {
        stats: document.stats,
        collaborators: document.collaborators.length,
        versions: document.versions.length,
        totalEdits: document.operations.length,
        operationStats,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      };
    } catch (error) {
      logger.error('DocumentService.getDocumentStats error:', error);
      throw error;
    }
  }

  /**
   * Export document
   */
  static async exportDocument(documentId, userId, format = 'md') {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this document', 403, 'DOCUMENT_ACCESS_DENIED');
      }

      let content = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      switch (format) {
        case 'md':
          content = this.documentToMarkdown(document.ast);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
        case 'html':
          content = this.documentToHtml(document.ast);
          mimeType = 'text/html';
          extension = 'html';
          break;
        case 'json':
          content = JSON.stringify(document.ast, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
        case 'txt':
          content = this.documentToText(document.ast);
          extension = 'txt';
          break;
        default:
          content = this.documentToText(document.ast);
          extension = 'txt';
      }

      return {
        content,
        mimeType,
        extension,
        filename: `${document.slug || document.title || 'document'}.${extension}`,
      };
    } catch (error) {
      logger.error('DocumentService.exportDocument error:', error);
      throw error;
    }
  }

  /**
   * Apply operation to document
   */
  static async applyOperation(documentId, userId, operation, version) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check edit permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && 
          (c.role === 'admin' || c.role === 'editor')
        );

      if (!hasPermission) {
        throw new APIError('You do not have permission to edit this document', 403, 'EDIT_PERMISSION_DENIED');
      }

      const transformer = new OperationTransformer(document);
      const transformedOp = transformer.transform(operation, version);
      const newAst = transformer.applyOperations(transformedOp);

      await document.save();

      logger.info(`Operation applied to document ${document.title} by user ${userId}`);
      return {
        ast: newAst,
        version: document.currentVersion,
        operation: transformedOp,
      };
    } catch (error) {
      logger.error('DocumentService.applyOperation error:', error);
      throw error;
    }
  }

  /**
   * Toggle star on document
   */
  static async toggleStar(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        throw new APIError('You do not have access to this document', 403, 'DOCUMENT_ACCESS_DENIED');
      }

      document.toggleStar(userId);
      await document.save();

      return { starred: document.starredBy.includes(userId) };
    } catch (error) {
      logger.error('DocumentService.toggleStar error:', error);
      throw error;
    }
  }

  /**
   * Lock document for editing
   */
  static async lockDocument(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check edit permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && 
          (c.role === 'admin' || c.role === 'editor')
        );

      if (!hasPermission) {
        throw new APIError('You do not have permission to lock this document', 403, 'LOCK_PERMISSION_DENIED');
      }

      document.lock(userId);
      await document.save();

      logger.info(`Document locked: ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.lockDocument error:', error);
      throw error;
    }
  }

  /**
   * Unlock document
   */
  static async unlockDocument(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        throw new APIError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
      }

      // Check permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && 
          (c.role === 'admin' || c.role === 'editor')
        );

      if (!hasPermission) {
        throw new APIError('You do not have permission to unlock this document', 403, 'UNLOCK_PERMISSION_DENIED');
      }

      document.unlock(userId);
      await document.save();

      logger.info(`Document unlocked: ${document.title} by user ${userId}`);
      return document;
    } catch (error) {
      logger.error('DocumentService.unlockDocument error:', error);
      throw error;
    }
  }

  /**
   * Search documents
   */
  static async searchDocuments(userId, query, options = {}) {
    try {
      const { limit = 20, page = 1 } = options;

      const searchQuery = {
        $text: { $search: query },
        deletedAt: null,
        $or: [
          { owner: userId },
          { 'collaborators.user': userId },
        ],
      };

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const documents = await Document.find(searchQuery, { score: { $meta: 'textScore' } })
        .populate('owner', 'username displayName avatar')
        .populate('collaborators.user', 'username displayName avatar')
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Document.countDocuments(searchQuery);

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
      logger.error('DocumentService.searchDocuments error:', error);
      throw error;
    }
  }

  /**
   * Get starred documents
   */
  static async getStarredDocuments(userId) {
    try {
      return await Document.find({
        starredBy: userId,
        deletedAt: null,
      })
        .populate('owner', 'username displayName avatar')
        .populate('collaborators.user', 'username displayName avatar')
        .sort({ updatedAt: -1 });
    } catch (error) {
      logger.error('DocumentService.getStarredDocuments error:', error);
      throw error;
    }
  }

  /**
   * Get recent documents
   */
  static async getRecentDocuments(userId, limit = 10) {
    try {
      return await Document.find({
        $or: [
          { owner: userId },
          { 'collaborators.user': userId },
        ],
        deletedAt: null,
      })
        .populate('owner', 'username displayName avatar')
        .populate('collaborators.user', 'username displayName avatar')
        .sort({ updatedAt: -1 })
        .limit(limit);
    } catch (error) {
      logger.error('DocumentService.getRecentDocuments error:', error);
      throw error;
    }
  }

  /**
   * Helper: Convert AST to plain text
   */
  static documentToText(nodes) {
    if (!nodes || !nodes.length) return '';
    
    const traverse = (node) => {
      if (!node) return '';
      let text = node.content || '';
      if (node.children && node.children.length) {
        for (const child of node.children) {
          text += ' ' + traverse(child);
        }
      }
      return text;
    };

    return nodes.map(node => traverse(node)).join('\n');
  }

  /**
   * Helper: Convert AST to Markdown
   */
  static documentToMarkdown(nodes) {
    if (!nodes || !nodes.length) return '';
    
    const traverse = (node) => {
      if (!node) return '';
      
      switch (node.type) {
        case 'heading':
          const level = node.attributes?.level || 1;
          return '#'.repeat(level) + ' ' + (node.content || '') + '\n';
        case 'paragraph':
          return (node.content || '') + '\n';
        case 'code-block':
          const lang = node.attributes?.language || '';
          return '```' + lang + '\n' + (node.content || '') + '\n```\n';
        case 'list':
          return '- ' + (node.content || '') + '\n';
        case 'blockquote':
          return '> ' + (node.content || '') + '\n';
        default:
          return (node.content || '') + '\n';
      }
    };

    return nodes.map(node => traverse(node)).join('');
  }

  /**
   * Helper: Convert AST to HTML
   */
  static documentToHtml(nodes) {
    if (!nodes || !nodes.length) return '';
    
    const traverse = (node) => {
      if (!node) return '';
      
      switch (node.type) {
        case 'heading':
          const level = node.attributes?.level || 1;
          return `<h${level}>${node.content || ''}</h${level}>`;
        case 'paragraph':
          return `<p>${node.content || ''}</p>`;
        case 'code-block':
          const lang = node.attributes?.language || '';
          return `<pre><code class="language-${lang}">${node.content || ''}</code></pre>`;
        case 'list':
          return `<li>${node.content || ''}</li>`;
        case 'blockquote':
          return `<blockquote>${node.content || ''}</blockquote>`;
        default:
          return node.content || '';
      }
    };

    return nodes.map(node => traverse(node)).join('\n');
  }

  /**
   * Validate document ownership
   */
  static async validateOwnership(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        return { valid: false, error: 'Document not found' };
      }
      
      return {
        valid: document.owner.toString() === userId,
        document,
      };
    } catch (error) {
      logger.error('DocumentService.validateOwnership error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate document access
   */
  static async validateAccess(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        return { valid: false, error: 'Document not found' };
      }

      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      return {
        valid: hasAccess,
        document,
      };
    } catch (error) {
      logger.error('DocumentService.validateAccess error:', error);
      return { valid: false, error: error.message };
    }
  }

  /**
   * Validate edit permission
   */
  static async validateEditPermission(documentId, userId) {
    try {
      const document = await Document.findById(documentId);
      if (!document) {
        return { valid: false, error: 'Document not found' };
      }

      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && 
          (c.role === 'admin' || c.role === 'editor')
        );

      return {
        valid: hasPermission,
        document,
      };
    } catch (error) {
      logger.error('DocumentService.validateEditPermission error:', error);
      return { valid: false, error: error.message };
    }
  }
}

module.exports = DocumentService;