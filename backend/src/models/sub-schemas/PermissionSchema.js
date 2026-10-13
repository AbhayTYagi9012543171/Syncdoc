const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  resourceType: {
    type: String,
    enum: ['document', 'workspace', 'user'],
    required: true,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  permissions: [{
    type: String,
    enum: ['read', 'write', 'comment', 'share', 'delete', 'admin'],
  }],
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  grantedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
});

module.exports = { PermissionSchema };