'use strict';

const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    default: null,
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null,
  },
  type: {
    type: String,
    trim: true,
    lowercase: true,
    default: 'document_activity',
    maxlength: 60,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 180,
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1200,
  },
  isRead: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  // Used to safely de-duplicate notifications generated from document operations.
  // Include recipient in this key because one operation can notify multiple collaborators.
  sourceKey: {
    type: String,
    trim: true,
    maxlength: 500,
    unique: true,
    sparse: true,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined,
  },
}, {
  timestamps: true,
  minimize: true,
  versionKey: false,
});

NotificationSchema.index({ recipient: 1, createdAt: -1, _id: -1 });
NotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
