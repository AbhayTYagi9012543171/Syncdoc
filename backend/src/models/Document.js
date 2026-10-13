const mongoose = require('mongoose');
const crypto = require('crypto');
const { ASTNodeSchema } = require('./sub-schemas/ASTNodeSchema');

/**
 * ============================================================
 * DOCUMENT SCHEMA
 * ============================================================
 *
 * Main document model for SyncDoc.
 *
 * Important:
 * - Slugs are unique PER WORKSPACE.
 * - Do NOT use unique: true directly on slug.
 * - Compound unique index is used:
 *      { workspace: 1, slug: 1 }
 *
 * This allows:
 *
 * Workspace A -> untitled-document
 * Workspace B -> untitled-document
 *
 * But prevents:
 *
 * Workspace A -> untitled-document
 * Workspace A -> untitled-document
 *
 * ============================================================
 */

const DocumentSchema = new mongoose.Schema(
  {
    // ============================================================
    // BASIC INFORMATION
    // ============================================================

    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: false,
    },

    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
      trim: true,
    },

    // ============================================================
    // RELATIONSHIPS
    // ============================================================

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: [true, 'Workspace ID is required'],
      index: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner ID is required'],
      index: true,
    },

    // ============================================================
    // COLLABORATORS
    // ============================================================

    collaborators: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },

        role: {
          type: String,
          enum: ['viewer', 'editor', 'admin'],
          default: 'viewer',
        },

        joinedAt: {
          type: Date,
          default: Date.now,
        },

        permissions: [
          {
            type: String,
            enum: [
              'read',
              'write',
              'comment',
              'share',
              'delete',
            ],
          },
        ],

        lastActive: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ============================================================
    // AST STORAGE
    // ============================================================

    ast: {
      type: [ASTNodeSchema],
      default: [],

      validate: {
        validator: function (ast) {
          return validateASTStructure(ast);
        },

        message: 'Invalid AST structure',
      },
    },

    // ============================================================
    // VERSIONING
    // ============================================================

    currentVersion: {
      type: Number,
      default: 0,
      min: 0,
    },

    versions: [
      {
        version: {
          type: Number,
          required: true,
        },

        ast: {
          type: [ASTNodeSchema],
          required: true,
        },

        createdAt: {
          type: Date,
          default: Date.now,
        },

        createdBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },

        comment: {
          type: String,
          maxlength: [
            500,
            'Version comment cannot exceed 500 characters',
          ],
        },

        size: {
          type: Number,
          default: 0,
          min: 0,
        },

        hash: {
          type: String,
        },
      },
    ],

    // ============================================================
    // OPERATIONS LOG
    // ============================================================

    operations: [
      {
        operation: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },

        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },

        timestamp: {
          type: Date,
          default: Date.now,
        },

        version: {
          type: Number,
          required: true,
        },

        type: {
          type: String,
          enum: [
            'insert',
            'delete',
            'update',
            'move',
            'format',
          ],
          required: true,
        },

        hash: {
          type: String,
        },
      },
    ],

    // ============================================================
    // STATISTICS
    // ============================================================

    stats: {
      wordCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      charCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      nodeCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      lastEditedAt: {
        type: Date,
        default: Date.now,
      },

      totalEdits: {
        type: Number,
        default: 0,
        min: 0,
      },

      collaboratorsCount: {
        type: Number,
        default: 0,
        min: 0,
      },

      averageEditTime: {
        type: Number,
        default: 0,
        min: 0,
      },

      lastEditDuration: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    // ============================================================
    // SETTINGS
    // ============================================================

    settings: {
      allowComments: {
        type: Boolean,
        default: true,
      },

      allowSuggestions: {
        type: Boolean,
        default: true,
      },

      autoSave: {
        type: Boolean,
        default: true,
      },

      backupInterval: {
        type: Number,
        default: 30000,
        min: 5000,
        max: 600000,
      },

      enableVersionHistory: {
        type: Boolean,
        default: true,
      },

      maxVersions: {
        type: Number,
        default: 100,
        min: 10,
        max: 1000,
      },

      enableExport: {
        type: Boolean,
        default: true,
      },

      exportFormats: [
        {
          type: String,
          enum: ['md', 'html', 'pdf', 'docx', 'json'],
        },
      ],

      defaultFontSize: {
        type: Number,
        default: 16,
        min: 10,
        max: 24,
      },

      defaultFontFamily: {
        type: String,
        default: 'Inter',
        trim: true,
      },

      enableSpellCheck: {
        type: Boolean,
        default: true,
      },

      enableAutoComplete: {
        type: Boolean,
        default: true,
      },
    },

    // ============================================================
    // STATUS
    // ============================================================

    status: {
      type: String,
      enum: ['draft', 'review', 'published', 'archived'],
      default: 'draft',
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // ============================================================
    // DELETION
    // ============================================================

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ============================================================
    // LOCKING
    // ============================================================

    isLocked: {
      type: Boolean,
      default: false,
    },

    lockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    lockedAt: {
      type: Date,
      default: null,
    },

    // ============================================================
    // STARRED / FAVORITE
    // ============================================================

    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ============================================================
    // VIEWS
    // ============================================================

    viewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

// ============================================================
// INDEXES
// ============================================================

/**
 * IMPORTANT:
 *
 * Slug is unique per workspace.
 *
 * DO NOT add:
 *
 * slug: {
 *   unique: true
 * }
 *
 * because that creates:
 *
 * slug_1
 *
 * which caused your current E11000 error.
 */
DocumentSchema.index(
  {
    workspace: 1,
    slug: 1,
  },
  {
    unique: true,
    name: 'workspace_slug_unique',
  }
);

DocumentSchema.index(
  {
    owner: 1,
    status: 1,
  },
  {
    name: 'owner_status_index',
  }
);

DocumentSchema.index(
  {
    'collaborators.user': 1,
  },
  {
    name: 'collaborator_user_index',
  }
);

DocumentSchema.index(
  {
    updatedAt: -1,
  },
  {
    name: 'updated_at_index',
  }
);

DocumentSchema.index(
  {
    tags: 1,
  },
  {
    name: 'tags_index',
  }
);

DocumentSchema.index(
  {
    status: 1,
    updatedAt: -1,
  },
  {
    name: 'status_updated_at_index',
  }
);

DocumentSchema.index(
  {
    title: 'text',
    description: 'text',
  },
  {
    name: 'document_text_search_index',
  }
);

// ============================================================
// VALIDATION
// ============================================================

function validateASTStructure(nodes) {
  if (!Array.isArray(nodes)) {
    return false;
  }

  for (const node of nodes) {
    if (!node || !node.id || !node.type) {
      return false;
    }

    if (
      node.children &&
      !validateASTStructure(node.children)
    ) {
      return false;
    }
  }

  return true;
}

// ============================================================
// SLUG HELPERS
// ============================================================

function createBaseSlug(title) {
  const base = String(title || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');

  return base || 'untitled-document';
}

/**
 * Generate a unique slug for a workspace.
 *
 * Example:
 *
 * Untitled document
 * untitled-document
 *
 * Second document:
 * untitled-document-2
 *
 * Third document:
 * untitled-document-3
 */
async function generateUniqueSlug(
  workspaceId,
  title,
  documentId = null
) {
  const baseSlug = createBaseSlug(title);

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = {
      workspace: workspaceId,
      slug,
    };

    if (documentId) {
      query._id = {
        $ne: documentId,
      };
    }

    const existing = await mongoose
      .model('Document')
      .findOne(query)
      .select('_id')
      .lean();

    if (!existing) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
}

// ============================================================
// PRE-SAVE HOOK
// ============================================================

DocumentSchema.pre('save', async function (next) {
  try {
    // ----------------------------------------------------------
    // Generate slug for new document
    // ----------------------------------------------------------

    if (
      this.isNew ||
      !this.slug ||
      this.isModified('title')
    ) {
      this.slug = await generateUniqueSlug(
        this.workspace,
        this.title,
        this._id
      );
    }

    // ----------------------------------------------------------
    // Update statistics if AST changed
    // ----------------------------------------------------------

    if (this.isModified('ast')) {
      this.updateStats();

      /**
       * Only increment version when AST actually changes.
       */
      if (!this.isNew) {
        this.currentVersion += 1;
      }

      this.stats.totalEdits =
        (this.stats.totalEdits || 0) + 1;

      this.stats.lastEditedAt = new Date();
    }

    // ----------------------------------------------------------
    // Published status
    // ----------------------------------------------------------

    if (
      this.isModified('status') &&
      this.status === 'published' &&
      !this.publishedAt
    ) {
      this.publishedAt = new Date();
    }

    // ----------------------------------------------------------
    // Unpublish
    // ----------------------------------------------------------

    if (
      this.isModified('status') &&
      this.status !== 'published'
    ) {
      this.publishedAt = null;
    }

    this.updatedAt = new Date();

    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================
// VIRTUALS
// ============================================================

DocumentSchema.virtual('isPublished').get(function () {
  return this.status === 'published';
});

DocumentSchema.virtual('isArchived').get(function () {
  return this.status === 'archived';
});

DocumentSchema.virtual('isDeleted').get(function () {
  return this.deletedAt !== null;
});

DocumentSchema.virtual('collaboratorCount').get(function () {
  return this.collaborators
    ? this.collaborators.length
    : 0;
});

DocumentSchema.virtual('starCount').get(function () {
  return this.starredBy
    ? this.starredBy.length
    : 0;
});

DocumentSchema.virtual('wordCount').get(function () {
  return this.stats?.wordCount || 0;
});

DocumentSchema.virtual('charCount').get(function () {
  return this.stats?.charCount || 0;
});

// ============================================================
// INSTANCE METHODS
// ============================================================

/**
 * Generate slug from title.
 */
DocumentSchema.methods.generateSlug = function () {
  return createBaseSlug(this.title);
};

/**
 * Generate unique slug.
 */
DocumentSchema.methods.generateUniqueSlug =
  async function () {
    return generateUniqueSlug(
      this.workspace,
      this.title,
      this._id
    );
  };

/**
 * Update document statistics.
 */
DocumentSchema.methods.updateStats = function () {
  let wordCount = 0;
  let charCount = 0;
  let nodeCount = 0;

  const traverseNodes = (nodes) => {
    if (!Array.isArray(nodes)) {
      return;
    }

    for (const node of nodes) {
      if (!node) {
        continue;
      }

      nodeCount += 1;

      if (node.content) {
        const text = this.extractText(node);

        charCount += text.length;

        wordCount += text
          .split(/\s+/)
          .filter(Boolean).length;
      }

      if (
        Array.isArray(node.children) &&
        node.children.length
      ) {
        traverseNodes(node.children);
      }
    }
  };

  if (Array.isArray(this.ast)) {
    traverseNodes(this.ast);
  }

  this.stats.wordCount = wordCount;
  this.stats.charCount = charCount;
  this.stats.nodeCount = nodeCount;

  this.stats.collaboratorsCount = this.collaborators
    ? this.collaborators.length
    : 0;
};

/**
 * Extract text from AST node.
 */
DocumentSchema.methods.extractText = function (
  node
) {
  if (!node) {
    return '';
  }

  let text = node.content || '';

  if (
    Array.isArray(node.children) &&
    node.children.length
  ) {
    for (const child of node.children) {
      const childText = this.extractText(child);

      if (childText) {
        text += ` ${childText}`;
      }
    }
  }

  return text.trim();
};

/**
 * Add operation to document.
 */
DocumentSchema.methods.addOperation = function (
  operation,
  userId
) {
  const hash = crypto
    .createHash('md5')
    .update(
      JSON.stringify(operation) +
      this.id +
      userId.toString()
    )
    .digest('hex');

  this.operations.push({
    operation,
    userId,
    version: this.currentVersion,
    type: operation.type,
    hash,
    timestamp: new Date(),
  });

  this.stats.totalEdits =
    (this.stats.totalEdits || 0) + 1;

  this.stats.lastEditedAt = new Date();

  return this;
};

/**
 * Create version snapshot.
 */
DocumentSchema.methods.createVersion = function (
  userId,
  comment = ''
) {
  const astString = JSON.stringify(this.ast || []);

  const hash = crypto
    .createHash('md5')
    .update(astString + this.id)
    .digest('hex');

  this.versions.push({
    version: this.currentVersion,
    ast: JSON.parse(astString),
    createdBy: userId,
    comment,
    createdAt: new Date(),
    size: Buffer.byteLength(astString),
    hash,
  });

  const maxVersions =
    this.settings?.maxVersions || 100;

  if (this.versions.length > maxVersions) {
    this.versions =
      this.versions.slice(-maxVersions);
  }

  return this;
};

/**
 * Restore document to a specific version.
 */
DocumentSchema.methods.restoreVersion =
  function (versionNumber) {
    const version = this.versions.find(
      (item) => item.version === versionNumber
    );

    if (!version) {
      throw new Error(
        `Version ${versionNumber} not found`
      );
    }

    this.ast = JSON.parse(
      JSON.stringify(version.ast)
    );

    this.currentVersion =
      versionNumber + 1;

    this.stats.lastEditedAt = new Date();

    this.updatedAt = new Date();

    return this;
  };

/**
 * Find node by ID.
 */
DocumentSchema.methods.getNodeById =
  function (nodeId) {
    return this.findNodeInAST(
      this.ast,
      nodeId
    );
  };

/**
 * Recursive node search.
 */
DocumentSchema.methods.findNodeInAST =
  function (nodes, nodeId) {
    if (!Array.isArray(nodes)) {
      return null;
    }

    for (const node of nodes) {
      if (!node) {
        continue;
      }

      if (node.id === nodeId) {
        return node;
      }

      if (Array.isArray(node.children)) {
        const found = this.findNodeInAST(
          node.children,
          nodeId
        );

        if (found) {
          return found;
        }
      }
    }

    return null;
  };

/**
 * Find path to node.
 */
DocumentSchema.methods.getPathToNode =
  function (
    nodeId,
    nodes = null,
    path = []
  ) {
    const currentNodes =
      nodes || this.ast;

    if (!Array.isArray(currentNodes)) {
      return null;
    }

    for (
      let i = 0;
      i < currentNodes.length;
      i += 1
    ) {
      const node = currentNodes[i];

      if (!node) {
        continue;
      }

      if (node.id === nodeId) {
        return [...path, i];
      }

      if (Array.isArray(node.children)) {
        const found = this.getPathToNode(
          nodeId,
          node.children,
          [...path, i, 'children']
        );

        if (found) {
          return found;
        }
      }
    }

    return null;
  };

/**
 * Add collaborator.
 */
DocumentSchema.methods.addCollaborator =
  function (
    userId,
    role = 'editor',
    permissions = []
  ) {
    if (!this.collaborators) {
      this.collaborators = [];
    }

    const existing =
      this.collaborators.find(
        (collaborator) =>
          collaborator.user &&
          collaborator.user.toString() ===
          userId.toString()
      );

    const finalPermissions =
      permissions.length
        ? permissions
        : this.getDefaultPermissions(role);

    if (existing) {
      existing.role = role;
      existing.permissions =
        finalPermissions;
      existing.lastActive = new Date();

      this.stats.collaboratorsCount =
        this.collaborators.length;

      return this;
    }

    this.collaborators.push({
      user: userId,
      role,
      permissions: finalPermissions,
      joinedAt: new Date(),
      lastActive: new Date(),
    });

    this.stats.collaboratorsCount =
      this.collaborators.length;

    return this;
  };

/**
 * Remove collaborator.
 */
DocumentSchema.methods.removeCollaborator =
  function (userId) {
    this.collaborators =
      this.collaborators.filter(
        (collaborator) =>
          collaborator.user &&
          collaborator.user.toString() !==
          userId.toString()
      );

    this.stats.collaboratorsCount =
      this.collaborators.length;

    return this;
  };

/**
 * Default permissions.
 */
DocumentSchema.methods.getDefaultPermissions =
  function (role) {
    const defaults = {
      viewer: ['read'],

      editor: [
        'read',
        'write',
        'comment',
      ],

      admin: [
        'read',
        'write',
        'comment',
        'share',
        'delete',
      ],
    };

    return defaults[role] || ['read'];
  };

/**
 * Check permission.
 */
DocumentSchema.methods.hasPermission =
  function (userId, permission) {
    if (
      this.owner.toString() ===
      userId.toString()
    ) {
      return true;
    }

    const collaborator =
      this.collaborators.find(
        (item) =>
          item.user &&
          item.user.toString() ===
          userId.toString()
      );

    if (!collaborator) {
      return false;
    }

    if (collaborator.role === 'admin') {
      return true;
    }

    return (
      Array.isArray(
        collaborator.permissions
      ) &&
      collaborator.permissions.includes(
        permission
      )
    );
  };

/**
 * Check collaborator.
 */
DocumentSchema.methods.isCollaborator =
  function (userId) {
    return this.collaborators.some(
      (collaborator) =>
        collaborator.user &&
        collaborator.user.toString() ===
        userId.toString()
    );
  };

/**
 * Get collaborator role.
 */
DocumentSchema.methods.getCollaboratorRole =
  function (userId) {
    if (
      this.owner.toString() ===
      userId.toString()
    ) {
      return 'owner';
    }

    const collaborator =
      this.collaborators.find(
        (item) =>
          item.user &&
          item.user.toString() ===
          userId.toString()
      );

    return collaborator
      ? collaborator.role
      : null;
  };

/**
 * Lock document.
 */
DocumentSchema.methods.lock = function (
  userId
) {
  if (this.isLocked) {
    throw new Error(
      `Document is locked by user ${this.lockedBy}`
    );
  }

  this.isLocked = true;
  this.lockedBy = userId;
  this.lockedAt = new Date();

  return this;
};

/**
 * Unlock document.
 */
DocumentSchema.methods.unlock = function (
  userId
) {
  if (
    this.isLocked &&
    this.lockedBy &&
    this.lockedBy.toString() !==
    userId.toString()
  ) {
    throw new Error(
      'You do not have permission to unlock this document'
    );
  }

  this.isLocked = false;
  this.lockedBy = null;
  this.lockedAt = null;

  return this;
};

/**
 * Toggle star.
 */
DocumentSchema.methods.toggleStar =
  function (userId) {
    if (!this.starredBy) {
      this.starredBy = [];
    }

    const index =
      this.starredBy.findIndex(
        (id) =>
          id.toString() ===
          userId.toString()
      );

    if (index === -1) {
      this.starredBy.push(userId);
    } else {
      this.starredBy.splice(index, 1);
    }

    return this;
  };

/**
 * Increment view count.
 */
DocumentSchema.methods.incrementViews =
  function () {
    this.viewCount =
      (this.viewCount || 0) + 1;

    return this;
  };

/**
 * Get plain text.
 */
DocumentSchema.methods.getPlainText =
  function () {
    return this.extractText({
      children: this.ast,
    });
  };

/**
 * Get document summary.
 */
DocumentSchema.methods.getSummary =
  function (maxLength = 200) {
    const text = this.getPlainText();

    if (text.length <= maxLength) {
      return text;
    }

    return `${text.substring(
      0,
      maxLength
    )}...`;
  };

// ============================================================
// STATIC METHODS
// ============================================================

/**
 * Find document by slug.
 */
DocumentSchema.statics.findBySlug =
  function (slug, workspaceId = null) {
    const query = {
      slug: String(slug).toLowerCase(),
      deletedAt: null,
    };

    if (workspaceId) {
      query.workspace = workspaceId;
    }

    return this.findOne(query);
  };

/**
 * Get all documents for user.
 */
DocumentSchema.statics.getUserDocuments =
  function (
    userId,
    options = {}
  ) {
    const query = {
      $or: [
        {
          owner: userId,
        },
        {
          'collaborators.user': userId,
        },
      ],

      deletedAt: null,
    };

    if (options.status) {
      query.status = options.status;
    }

    if (options.workspace) {
      query.workspace =
        options.workspace;
    }

    let findQuery = this.find(query);

    if (options.limit) {
      findQuery =
        findQuery.limit(
          options.limit
        );
    }

    if (options.skip) {
      findQuery =
        findQuery.skip(
          options.skip
        );
    }

    if (options.sort) {
      findQuery =
        findQuery.sort(
          options.sort
        );
    } else {
      findQuery =
        findQuery.sort({
          updatedAt: -1,
        });
    }

    return findQuery;
  };

/**
 * Get starred documents.
 */
DocumentSchema.statics.getStarredDocuments =
  function (userId) {
    return this.find({
      starredBy: userId,
      deletedAt: null,
    }).sort({
      updatedAt: -1,
    });
  };

/**
 * Search documents.
 */
DocumentSchema.statics.searchDocuments =
  function (
    query,
    userId,
    options = {}
  ) {
    const searchQuery = {
      $text: {
        $search: query,
      },

      deletedAt: null,

      $or: [
        {
          owner: userId,
        },
        {
          'collaborators.user': userId,
        },
      ],
    };

    let findQuery = this.find(
      searchQuery,
      {
        score: {
          $meta: 'textScore',
        },
      }
    ).sort({
      score: {
        $meta: 'textScore',
      },
    });

    if (options.limit) {
      findQuery =
        findQuery.limit(
          options.limit
        );
    }

    if (options.skip) {
      findQuery =
        findQuery.skip(
          options.skip
        );
    }

    return findQuery;
  };

/**
 * Workspace statistics.
 */
DocumentSchema.statics.getWorkspaceStats =
  function (workspaceId) {
    return this.aggregate([
      {
        $match: {
          workspace:
            new mongoose.Types.ObjectId(
              workspaceId
            ),

          deletedAt: null,
        },
      },

      {
        $group: {
          _id: '$status',

          count: {
            $sum: 1,
          },

          totalEdits: {
            $sum: '$stats.totalEdits',
          },

          totalWords: {
            $sum: '$stats.wordCount',
          },
        },
      },
    ]);
  };

/**
 * Recent documents.
 */
DocumentSchema.statics.getRecentDocuments =
  function (
    userId,
    limit = 10
  ) {
    return this.find({
      $or: [
        {
          owner: userId,
        },
        {
          'collaborators.user': userId,
        },
      ],

      deletedAt: null,
    })
      .sort({
        updatedAt: -1,
      })
      .limit(limit);
  };

// ============================================================
// USER-FACING FAVORITE VIRTUAL
// ============================================================
DocumentSchema.virtual('isStarred').get(function () {
  return Array.isArray(this.starredBy) ? this.starredBy.length > 0 : false;
});

// ============================================================
// EXPORT
// ============================================================

module.exports = mongoose.model(
  'Document',
  DocumentSchema
);