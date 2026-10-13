const mongoose = require('mongoose');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const { logger } = require('../config/logger');

function oid(value) { return new mongoose.Types.ObjectId(String(value)); }

const NotificationController = {
  async list(req, res, next) {
    try {
      const userId = oid(req.user.id);
      const docs = await Document.find({ deletedAt: null, $or: [{ owner: userId }, { 'collaborators.user': userId }] }).select('title owner collaborators operations').lean();
      const writes = [];
      for (const doc of docs) {
        for (const op of (doc.operations || []).slice(-30)) {
          if (!op?.timestamp || String(op.userId) === String(userId)) continue;
          const sourceKey = `${doc._id}:${op.version}:${op.timestamp.toISOString()}:${op.userId}`;
          writes.push({ updateOne: { filter: { sourceKey }, update: { $setOnInsert: { recipient: userId, actor: op.userId, document: doc._id, type: op.type || 'update', title: doc.title || 'Document activity', message: `${op.type || 'updated'} ${doc.title || 'a document'}`, isRead: false, sourceKey } }, upsert: true } });
        }
      }
      if (writes.length) await Notification.bulkWrite(writes, { ordered: false });
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const notifications = await Notification.find({ recipient: userId }).populate('actor', 'displayName username avatar').populate('document', 'title').sort({ createdAt: -1 }).limit(limit).lean();
      res.json({ success: true, data: notifications });
    } catch (error) { logger.error('Notification list error:', error); next(error); }
  },
  async markRead(req, res, next) { try { const n = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { isRead: true }, { new: true }); if (!n) return res.status(404).json({ success:false, message:'Notification not found' }); res.json({success:true,data:n}); } catch(e){next(e);} },
  async markAllRead(req, res, next) { try { await Notification.updateMany({ recipient:req.user.id, isRead:false }, { $set:{isRead:true} }); res.json({success:true}); } catch(e){next(e);} },
  async unreadCount(req,res,next){ try { const count=await Notification.countDocuments({recipient:req.user.id,isRead:false}); res.json({success:true,data:{count}}); } catch(e){next(e);} },

  async markUnread(req, res, next) {
    try {
      const n = await Notification.findOneAndUpdate(
        { _id: req.params.id, recipient: req.user.id },
        { isRead: false },
        { new: true }
      );
      if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });
      return res.json({ success: true, data: n });
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const result = await Notification.deleteOne({
        _id: req.params.id,
        recipient: req.user.id,
      });
      if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Notification not found' });
      return res.json({ success: true, message: 'Notification deleted' });
    } catch (e) { next(e); }
  },

  async removeRead(req, res, next) {
    try {
      const result = await Notification.deleteMany({
        recipient: req.user.id,
        isRead: true,
      });
      return res.json({ success: true, data: { deleted: result.deletedCount || 0 } });
    } catch (e) { next(e); }
  },

  async clearAll(req, res, next) {
    try {
      const result = await Notification.deleteMany({ recipient: req.user.id });
      return res.json({ success: true, data: { deleted: result.deletedCount || 0 } });
    } catch (e) { next(e); }
  },
};
module.exports = NotificationController;
