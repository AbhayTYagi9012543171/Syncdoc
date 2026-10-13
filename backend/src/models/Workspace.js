const mongoose = require('mongoose');

const WorkspaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Workspace name is required'],
    trim: true,
    maxlength: [100, 'Workspace name cannot exceed 100 characters'],
  },
  slug: {
    type: String,
    unique: true,
    sparse: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'viewer'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  }],
  settings: {
    allowPublicAccess: {
      type: Boolean,
      default: false,
    },
    defaultDocumentPermissions: {
      type: String,
      enum: ['viewer', 'editor', 'admin'],
      default: 'viewer',
    },
  },
  documentCount: {
    type: Number,
    default: 0,
  },
  memberCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes
WorkspaceSchema.index({ slug: 1 });
WorkspaceSchema.index({ owner: 1 });
WorkspaceSchema.index({ 'members.user': 1 });

// Pre-save hook
WorkspaceSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.generateSlug();
  }
  this.updatedAt = new Date();
  next();
});

// Virtuals
WorkspaceSchema.virtual('isPublic').get(function() {
  return this.settings.allowPublicAccess;
});

// Instance methods
WorkspaceSchema.methods.generateSlug = function() {
  const base = this.name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
  
  return base || 'workspace';
};

WorkspaceSchema.methods.addMember = function(userId, role = 'member') {
  if (!this.members) {
    this.members = [];
  }
  
  const existing = this.members.find(m => m.user && m.user.toString() === userId.toString());
  if (existing) {
    existing.role = role;
    return this;
  }
  
  this.members.push({
    user: userId,
    role,
    joinedAt: new Date(),
  });
  
  this.memberCount = this.members.length;
  return this;
};

WorkspaceSchema.methods.removeMember = function(userId) {
  this.members = this.members.filter(
    m => m.user && m.user.toString() !== userId.toString()
  );
  this.memberCount = this.members.length;
  return this;
};

WorkspaceSchema.methods.isMember = function(userId) {
  if (!this.members) return false;
  return this.members.some(m => m.user && m.user.toString() === userId.toString());
};

WorkspaceSchema.methods.getMemberRole = function(userId) {
  if (!this.members) return null;
  const member = this.members.find(m => m.user && m.user.toString() === userId.toString());
  return member ? member.role : null;
};

// Static methods
WorkspaceSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug });
};

WorkspaceSchema.statics.getUserWorkspaces = function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId },
    ],
    deletedAt: null,
  }).sort({ updatedAt: -1 });
};

module.exports = mongoose.model('Workspace', WorkspaceSchema);