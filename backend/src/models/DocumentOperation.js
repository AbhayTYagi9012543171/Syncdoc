const mongoose = require('mongoose');

/**
 * DocumentOperation Schema
 * Stores all operations performed on documents for OT/CRDT and version history
 */
const DocumentOperationSchema = new mongoose.Schema({
  // Reference to the document
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: [true, 'Document ID is required'],
    index: true,
  },

  // User who performed the operation
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },

  // The operation data
  operation: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Operation data is required'],
  },

  // Operation type
  type: {
    type: String,
    enum: ['insert', 'delete', 'update', 'move', 'format', 'batch'],
    required: [true, 'Operation type is required'],
    index: true,
  },

  // Version number after applying this operation
  version: {
    type: Number,
    required: [true, 'Version number is required'],
    index: true,
  },

  // Previous version before operation
  previousVersion: {
    type: Number,
    default: null,
  },

  // Hash of the operation for deduplication
  hash: {
    type: String,
    index: true,
  },

  // Whether the operation has been applied
  applied: {
    type: Boolean,
    default: true,
    index: true,
  },

  // Whether the operation has been rolled back
  rolledBack: {
    type: Boolean,
    default: false,
    index: true,
  },

  // Timestamp when operation was performed
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },

  // Additional metadata
  metadata: {
    // IP address of the user
    ipAddress: {
      type: String,
      default: null,
    },

    // User agent
    userAgent: {
      type: String,
      default: null,
    },

    // Session ID
    sessionId: {
      type: String,
      default: null,
    },

    // Device info
    device: {
      type: String,
      default: null,
    },

    // Location info
    location: {
      type: String,
      default: null,
    },

    // Custom metadata
    custom: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
  },

  // For undo/redo
  undoOperation: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },

  // Related operations (for batch operations)
  relatedOperations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DocumentOperation',
  }],

  // Conflict resolution info
  conflictResolution: {
    resolved: {
      type: Boolean,
      default: false,
    },
    strategy: {
      type: String,
      enum: ['manual', 'automatic', 'merge', 'last-write-wins'],
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },

  // Creation timestamp
  createdAt: {
    type: Date,
    default: Date.now,
  },

  // Update timestamp
  updatedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Compound indexes
DocumentOperationSchema.index({ documentId: 1, version: 1 }, { unique: true });
DocumentOperationSchema.index({ documentId: 1, timestamp: -1 });
DocumentOperationSchema.index({ userId: 1, timestamp: -1 });
DocumentOperationSchema.index({ documentId: 1, type: 1 });
DocumentOperationSchema.index({ hash: 1 }, { unique: true, sparse: true });
DocumentOperationSchema.index({ applied: 1, rolledBack: 1 });

// Virtuals
DocumentOperationSchema.virtual('isInsert').get(function() {
  return this.type === 'insert';
});

DocumentOperationSchema.virtual('isDelete').get(function() {
  return this.type === 'delete';
});

DocumentOperationSchema.virtual('isUpdate').get(function() {
  return this.type === 'update';
});

DocumentOperationSchema.virtual('isMove').get(function() {
  return this.type === 'move';
});

DocumentOperationSchema.virtual('isFormat').get(function() {
  return this.type === 'format';
});

DocumentOperationSchema.virtual('isBatch').get(function() {
  return this.type === 'batch';
});

DocumentOperationSchema.virtual('isApplied').get(function() {
  return this.applied === true && this.rolledBack === false;
});

// Pre-save hook
DocumentOperationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Generate hash if not provided
  if (!this.hash && this.operation) {
    const crypto = require('crypto');
    this.hash = crypto
      .createHash('md5')
      .update(JSON.stringify(this.operation) + this.documentId + this.userId)
      .digest('hex');
  }
  
  next();
});

// Instance methods
DocumentOperationSchema.methods.apply = async function() {
  if (this.applied) {
    throw new Error('Operation already applied');
  }
  
  this.applied = true;
  this.rolledBack = false;
  await this.save();
  
  return this;
};

DocumentOperationSchema.methods.rollback = async function() {
  if (!this.applied) {
    throw new Error('Operation not applied');
  }
  
  if (this.rolledBack) {
    throw new Error('Operation already rolled back');
  }
  
  this.rolledBack = true;
  this.applied = false;
  await this.save();
  
  return this;
};

DocumentOperationSchema.methods.getUndoOperation = function() {
  if (this.undoOperation) {
    return this.undoOperation;
  }
  
  // Generate undo operation based on type
  const op = this.operation;
  switch (this.type) {
    case 'insert':
      return {
        type: 'delete',
        nodeId: op.nodeId,
        path: op.path,
        position: op.position,
      };
    case 'delete':
      return {
        type: 'insert',
        nodeId: op.nodeId,
        nodeType: op.nodeType,
        content: op.content,
        attributes: op.attributes,
        path: op.path,
        position: op.position,
      };
    case 'update':
      return {
        type: 'update',
        nodeId: op.nodeId,
        path: op.path,
        content: op.previousContent,
        attributes: op.previousAttributes,
      };
    case 'move':
      return {
        type: 'move',
        nodeId: op.nodeId,
        sourcePath: op.targetPath,
        targetPath: op.sourcePath,
      };
    default:
      return null;
  }
};

DocumentOperationSchema.methods.isSameAs = function(otherOperation) {
  return this.hash === otherOperation.hash;
};

DocumentOperationSchema.methods.isConflictingWith = function(otherOperation) {
  if (this.documentId.toString() !== otherOperation.documentId.toString()) {
    return false;
  }
  
  if (this.type === 'insert' && otherOperation.type === 'insert') {
    return this.operation.position === otherOperation.operation.position &&
           this.operation.path === otherOperation.operation.path;
  }
  
  if (this.type === 'delete' && otherOperation.type === 'delete') {
    return this.operation.nodeId === otherOperation.operation.nodeId;
  }
  
  if (this.type === 'update' && otherOperation.type === 'update') {
    return this.operation.nodeId === otherOperation.operation.nodeId;
  }
  
  return false;
};

// Static methods
DocumentOperationSchema.statics.getByDocument = function(documentId, options = {}) {
  const query = this.find({ documentId, ...options })
    .sort({ version: 1 });
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  if (options.skip) {
    query.skip(options.skip);
  }
  
  return query;
};

DocumentOperationSchema.statics.getByUser = function(userId, options = {}) {
  const query = this.find({ userId })
    .sort({ timestamp: -1 });
  
  if (options.limit) {
    query.limit(options.limit);
  }
  
  return query;
};

DocumentOperationSchema.statics.getLatest = function(documentId, options = {}) {
  const query = this.find({ documentId })
    .sort({ version: -1 })
    .limit(1);
  
  return query;
};

DocumentOperationSchema.statics.getVersion = function(documentId, version) {
  return this.findOne({ documentId, version });
};

DocumentOperationSchema.statics.getByHash = function(hash) {
  return this.findOne({ hash });
};

DocumentOperationSchema.statics.getApplied = function(documentId) {
  return this.find({
    documentId,
    applied: true,
    rolledBack: false,
  }).sort({ version: 1 });
};

DocumentOperationSchema.statics.getPending = function(documentId) {
  return this.find({
    documentId,
    applied: false,
  }).sort({ timestamp: 1 });
};

DocumentOperationSchema.statics.getConflicting = function(documentId, operation) {
  const query = {
    documentId,
    applied: true,
    rolledBack: false,
  };
  
  if (operation.type === 'insert') {
    query['operation.position'] = operation.position;
  } else if (operation.type === 'delete') {
    query['operation.nodeId'] = operation.nodeId;
  } else if (operation.type === 'update') {
    query['operation.nodeId'] = operation.nodeId;
  }
  
  return this.find(query);
};

DocumentOperationSchema.statics.bulkCreate = async function(operations) {
  if (!Array.isArray(operations) || operations.length === 0) {
    return [];
  }
  
  return this.insertMany(operations);
};

DocumentOperationSchema.statics.getStatistics = async function(documentId) {
  const stats = await this.aggregate([
    {
      $match: { documentId: mongoose.Types.ObjectId(documentId) },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        users: { $addToSet: '$userId' },
        earliest: { $min: '$timestamp' },
        latest: { $max: '$timestamp' },
      },
    },
    {
      $project: {
        type: '$_id',
        count: 1,
        uniqueUsers: { $size: '$users' },
        earliest: 1,
        latest: 1,
        _id: 0,
      },
    },
  ]);
  
  return stats;
};

module.exports = mongoose.model('DocumentOperation', DocumentOperationSchema);