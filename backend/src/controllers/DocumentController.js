const Document = require('../models/Document');
const Workspace = require('../models/Workspace');
const { logger } = require('../config/logger');
const { OperationTransformer } = require('../services/ot/OperationTransformer');

const DocumentController = {
  // Create document
  async create(req, res, next) {
    try {
      const { title, workspaceId, description, ast } = req.body;
      const userId = req.user.id;

      // Check workspace exists and user has access
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

      const document = new Document({
        title,
        workspace: workspaceId,
        owner: userId,
        description,
        ast: ast || [],
        collaborators: [{
          user: userId,
          role: 'admin',
        }],
      });

      await document.save();

      // Update workspace document count
      workspace.documentCount = (workspace.documentCount || 0) + 1;
      await workspace.save();

      res.status(201).json({
        success: true,
        message: 'Document created successfully',
        data: document,
      });
    } catch (error) {
      logger.error('Create document error:', error);
      next(error);
    }
  },

  // Get all documents for user
  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      const { workspaceId, status, search, limit = 20, page = 1 } = req.query;

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
      logger.error('Get all documents error:', error);
      next(error);
    }
  },

  // Get document by ID
  async getById(req, res, next) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const document = await Document.findById(documentId)
        .populate('owner', 'username displayName avatar')
        .populate('collaborators.user', 'username displayName avatar');

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check access
      const hasAccess = document.owner._id.toString() === userId ||
        document.collaborators.some(c => c.user._id.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this document',
        });
      }

      res.json({
        success: true,
        data: document,
      });
    } catch (error) {
      logger.error('Get document error:', error);
      next(error);
    }
  },

  // Update document
  async update(req, res, next) {
    try {
      const { documentId } = req.params;
      const { title, description, ast, version, settings, status, tags, favorite } = req.body;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check edit permission
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

      // Update fields
      if (title) document.title = title;
      if (description !== undefined) document.description = description;
      if (settings) document.settings = { ...document.settings, ...settings };
      if (status) document.status = status;
      if (tags) document.tags = tags;

      // Update AST with OT
      if (ast && version !== undefined) {
        const transformer = new OperationTransformer(document);
        document.ast = ast;
        document.currentVersion = version + 1;
      }

      document.updatedAt = new Date();
      await document.save();

      // Create version history
      if (ast && version !== undefined) {
        document.createVersion(userId, 'Updated document content');
        await document.save();
      }

      res.json({
        success: true,
        message: 'Document updated successfully',
        data: document,
      });
    } catch (error) {
      logger.error('Update document error:', error);
      next(error);
    }
  },

  // Delete document (soft delete)
  async delete(req, res, next) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check delete permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && c.role === 'admin'
        );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to delete this document',
        });
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

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      logger.error('Delete document error:', error);
      next(error);
    }
  },

  // Permanently delete document (hard delete)
  async permanentDelete(req, res, next) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Only owner can permanently delete
      if (document.owner.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the owner can permanently delete this document',
        });
      }

      await document.remove();

      res.json({
        success: true,
        message: 'Document permanently deleted',
      });
    } catch (error) {
      logger.error('Permanent delete error:', error);
      next(error);
    }
  },

  // Get document versions
  async getVersions(req, res, next) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this document',
        });
      }

      res.json({
        success: true,
        data: {
          versions: document.versions,
          currentVersion: document.currentVersion,
          totalVersions: document.versions.length,
        },
      });
    } catch (error) {
      logger.error('Get versions error:', error);
      next(error);
    }
  },

  // Restore document version
  async restoreVersion(req, res, next) {
    try {
      const { documentId } = req.params;
      const { versionNumber } = req.body;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check permission
      const hasPermission = document.owner.toString() === userId ||
        document.collaborators.some(c => 
          c.user.toString() === userId && 
          (c.role === 'admin' || c.role === 'editor')
        );

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to restore versions',
        });
      }

      await document.restoreVersion(versionNumber);
      await document.save();

      res.json({
        success: true,
        message: 'Version restored successfully',
        data: document,
      });
    } catch (error) {
      logger.error('Restore version error:', error);
      next(error);
    }
  },

  // Add collaborator
  async addCollaborator(req, res, next) {
    try {
      const { documentId } = req.params;
      const { userId, role, permissions } = req.body;
      const currentUserId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check admin permission
      const isAdmin = document.owner.toString() === currentUserId ||
        document.collaborators.some(c => 
          c.user.toString() === currentUserId && c.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to add collaborators',
        });
      }

      document.addCollaborator(userId, role, permissions);
      await document.save();

      res.json({
        success: true,
        message: 'Collaborator added successfully',
        data: document,
      });
    } catch (error) {
      logger.error('Add collaborator error:', error);
      next(error);
    }
  },

  // Remove collaborator
  async removeCollaborator(req, res, next) {
    try {
      const { documentId } = req.params;
      const { userId } = req.body;
      const currentUserId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check admin permission
      const isAdmin = document.owner.toString() === currentUserId ||
        document.collaborators.some(c => 
          c.user.toString() === currentUserId && c.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to remove collaborators',
        });
      }

      // Cannot remove owner
      if (document.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot remove the document owner',
        });
      }

      document.removeCollaborator(userId);
      await document.save();

      res.json({
        success: true,
        message: 'Collaborator removed successfully',
        data: document,
      });
    } catch (error) {
      logger.error('Remove collaborator error:', error);
      next(error);
    }
  },

  // Update collaborator role
  async updateCollaborator(req, res, next) {
    try {
      const { documentId } = req.params;
      const { userId, role, permissions } = req.body;
      const currentUserId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check admin permission
      const isAdmin = document.owner.toString() === currentUserId ||
        document.collaborators.some(c => 
          c.user.toString() === currentUserId && c.role === 'admin'
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to update collaborators',
        });
      }

      // Cannot update owner
      if (document.owner.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: 'Cannot update the document owner',
        });
      }

      const collaborator = document.collaborators.find(c => c.user.toString() === userId);
      if (!collaborator) {
        return res.status(404).json({
          success: false,
          message: 'Collaborator not found',
        });
      }

      collaborator.role = role || collaborator.role;
      collaborator.permissions = permissions || collaborator.permissions;
      await document.save();

      res.json({
        success: true,
        message: 'Collaborator updated successfully',
        data: document,
      });
    } catch (error) {
      logger.error('Update collaborator error:', error);
      next(error);
    }
  },

  // Get document collaborators
  async getCollaborators(req, res, next) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const document = await Document.findById(documentId)
        .populate('collaborators.user', 'username displayName avatar email');

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user._id.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this document',
        });
      }

      // Get owner info
      const owner = await User.findById(document.owner).select('username displayName avatar email');

      res.json({
        success: true,
        data: {
          owner,
          collaborators: document.collaborators,
        },
      });
    } catch (error) {
      logger.error('Get collaborators error:', error);
      next(error);
    }
  },

  // Get document statistics
  async getStats(req, res, next) {
    try {
      const { documentId } = req.params;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this document',
        });
      }

      res.json({
        success: true,
        data: {
          stats: document.stats,
          collaborators: document.collaborators.length,
          versions: document.versions.length,
          totalEdits: document.operations.length,
          createdAt: document.createdAt,
          updatedAt: document.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      next(error);
    }
  },

  // Export document
  async exportDocument(req, res, next) {
    try {
      const { documentId } = req.params;
      const { format = 'md' } = req.query;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check access
      const hasAccess = document.owner.toString() === userId ||
        document.collaborators.some(c => c.user.toString() === userId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this document',
        });
      }

      // Convert AST to text based on format
      let content = '';
      let mimeType = 'text/plain';
      let extension = 'txt';

      switch (format) {
        case 'md':
          content = documentToMarkdown(document.ast);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
        case 'html':
          content = documentToHtml(document.ast);
          mimeType = 'text/html';
          extension = 'html';
          break;
        case 'json':
          content = JSON.stringify(document.ast, null, 2);
          mimeType = 'application/json';
          extension = 'json';
          break;
        default:
          content = documentToText(document.ast);
          extension = 'txt';
      }

      const filename = `${document.slug || document.title || 'document'}.${extension}`;

      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(content);
    } catch (error) {
      logger.error('Export document error:', error);
      next(error);
    }
  },

  // Apply operation to document
  async applyOperation(req, res, next) {
    try {
      const { documentId } = req.params;
      const { operation, version } = req.body;
      const userId = req.user.id;

      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found',
        });
      }

      // Check edit permission
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

      const transformer = new OperationTransformer(document);
      const transformedOp = transformer.transform(operation, version);
      const newAst = transformer.applyOperations(transformedOp);

      await document.save();

      // Broadcast to socket room
      const io = req.app.get('io');
      if (io) {
        io.to(`doc:${documentId}`).emit('document-update', {
          operation: transformedOp,
          version: document.currentVersion,
          userId,
          timestamp: Date.now(),
        });
      }

      res.json({
        success: true,
        message: 'Operation applied successfully',
        data: {
          ast: newAst,
          version: document.currentVersion,
        },
      });
    } catch (error) {
      logger.error('Apply operation error:', error);
      next(error);
    }
  },

  // ============================================================
  // TRASH / RESTORE
  // ============================================================
  async getTrash(req, res, next) {
    try {
      const userId = req.user.id;
      const documents = await Document.find({ deletedAt: { $ne: null }, $or: [{ owner: userId }, { 'collaborators.user': userId }] })
        .populate('owner', 'username displayName avatar')
        .sort({ deletedAt: -1 }).limit(100);
      res.json({ success: true, data: documents });
    } catch (error) { next(error); }
  },

  async restore(req, res, next) {
    try {
      const document = await Document.findById(req.params.documentId);
      if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
      if (document.owner.toString() !== req.user.id && !document.collaborators.some(c => c.user.toString() === req.user.id && c.role === 'admin')) {
        return res.status(403).json({ success: false, message: 'Only the owner or document admin can restore this document' });
      }
      document.deletedAt = null;
      await document.save();
      res.json({ success: true, message: 'Document restored successfully', data: document });
    } catch (error) { next(error); }
  },

};

// Helper functions for export
function documentToText(nodes) {
  if (!nodes || !nodes.length) return '';
  return nodes.map(node => node.content || '').join('\n');
}

function documentToMarkdown(nodes) {
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

  return nodes.map(node => traverse(node)).join('\n');
}

function documentToHtml(nodes) {
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

module.exports = DocumentController;