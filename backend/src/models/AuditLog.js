'use strict';

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, default: null },
  workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', index: true, default: null },
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', index: true, default: null },
  action: { type: String, required: true, trim: true, maxlength: 100, index: true },
  entityType: { type: String, required: true, trim: true, maxlength: 50 },
  entityId: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  requestId: { type: String, index: true, default: null },
  ip: { type: String, default: null },
  userAgent: { type: String, maxlength: 500, default: null },
}, { timestamps: true });

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ workspace: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
