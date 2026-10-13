const mongoose = require('mongoose');
const NotificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
  type: { type: String, default: 'document_activity' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false, index: true },
  sourceKey: { type: String, unique: true, sparse: true },
}, { timestamps: true });
NotificationSchema.index({ recipient: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', NotificationSchema);
