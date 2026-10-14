'use strict';

const mongoose = require('mongoose');
const Document = require('../models/Document');
const Notification = require('../models/Notification');
const { logger } = require('../config/logger');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function getUserId(req) {
  return req.user?._id || req.user?.id || req.user?.userId;
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
}

function parseBoundedInt(value, fallback, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sendServerError(res, error, next) {
  if (logger?.error) logger.error('Notification request failed:', error);
  if (typeof next === 'function') return next(error);
  return res.status(500).json({ success: false, message: 'Unable to complete notification request.' });
}

/**
 * Backfill notifications from recent document operations. sourceKey makes this
 * idempotent; the recipient is part of the key so collaborators do not collide.
 */
async function syncDocumentActivity(recipientId) {
  const docs = await Document.find({
    deletedAt: null,
    $or: [
      { owner: recipientId },
      { 'collaborators.user': recipientId },
    ],
  })
    .select('title owner collaborators operations workspace')
    .lean();

  const writes = [];
  for (const doc of docs) {
    const operations = Array.isArray(doc.operations) ? doc.operations.slice(-30) : [];
    for (const operation of operations) {
      if (!operation?.timestamp || !operation?.userId) continue;
      if (String(operation.userId) === String(recipientId)) continue;

      const timestamp = new Date(operation.timestamp);
      if (Number.isNaN(timestamp.getTime())) continue;

      const sourceKey = [
        String(recipientId), String(doc._id), String(operation.version ?? ''),
        timestamp.toISOString(), String(operation.userId), String(operation.type || 'update'),
      ].join(':');
      const action = String(operation.type || 'updated').replace(/[_-]+/g, ' ');
      const title = String(doc.title || 'Document activity').slice(0, 180);
      const message = `${action} ${title}`.slice(0, 1200);

      writes.push({
        updateOne: {
          filter: { sourceKey },
          update: {
            $setOnInsert: {
              recipient: recipientId,
              actor: toObjectId(operation.userId),
              document: doc._id,
              workspace: doc.workspace || undefined,
              type: 'document_activity',
              title,
              message,
              isRead: false,
              readAt: null,
              sourceKey,
              createdAt: timestamp,
              updatedAt: timestamp,
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (writes.length) {
    try {
      await Notification.bulkWrite(writes, { ordered: false });
    } catch (error) {
      // Concurrent list requests can race on the unique sourceKey index. Ignore
      // only duplicate-key races; all other persistence failures must surface.
      if (error?.code !== 11000 && !error?.writeErrors?.every((item) => item?.code === 11000)) throw error;
    }
  }
}

const NotificationController = {
  async list(req, res, next) {
    try {
      const rawUserId = getUserId(req);
      const recipientId = toObjectId(rawUserId);
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });

      // Keep the legacy document-activity backfill, but make it idempotent.
      await syncDocumentActivity(recipientId);

      const page = parseBoundedInt(req.query.page, 1, 1000000);
      const limit = parseBoundedInt(req.query.limit, DEFAULT_LIMIT, MAX_LIMIT);
      const query = { recipient: recipientId };

      if (String(req.query.unreadOnly).toLowerCase() === 'true') query.isRead = false;
      if (typeof req.query.type === 'string' && req.query.type.trim()) {
        query.type = req.query.type.trim().toLowerCase().slice(0, 60);
      }
      if (typeof req.query.q === 'string' && req.query.q.trim()) {
        const safeQuery = escapeRegex(req.query.q.trim().slice(0, 100));
        query.$or = [
          { title: { $regex: safeQuery, $options: 'i' } },
          { message: { $regex: safeQuery, $options: 'i' } },
          { type: { $regex: safeQuery, $options: 'i' } },
        ];
      }
      if (req.query.from || req.query.to) {
        query.createdAt = {};
        if (req.query.from && !Number.isNaN(new Date(req.query.from).getTime())) query.createdAt.$gte = new Date(req.query.from);
        if (req.query.to && !Number.isNaN(new Date(req.query.to).getTime())) query.createdAt.$lte = new Date(req.query.to);
        if (!Object.keys(query.createdAt).length) delete query.createdAt;
      }

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(query)
          .populate('actor', 'displayName username avatar name')
          .populate('document', 'title slug')
          .populate('workspace', 'name')
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Notification.countDocuments(query),
        Notification.countDocuments({ recipient: recipientId, isRead: false }),
      ]);

      return res.json({
        success: true,
        data: {
          notifications,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasMore: page * limit < total,
          },
          unreadCount,
        },
      });
    } catch (error) {
      return sendServerError(res, error, next);
    }
  },

  async getById(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      const notificationId = toObjectId(req.params.id);
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      if (!notificationId) return res.status(400).json({ success: false, message: 'Invalid notification ID.' });

      const notification = await Notification.findOne({ _id: notificationId, recipient: recipientId })
        .populate('actor', 'displayName username avatar name')
        .populate('document', 'title slug')
        .populate('workspace', 'name')
        .lean();
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
      return res.json({ success: true, data: notification });
    } catch (error) { return sendServerError(res, error, next); }
  },

  async markRead(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      const notificationId = toObjectId(req.params.id);
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      if (!notificationId) return res.status(400).json({ success: false, message: 'Invalid notification ID.' });

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: recipientId },
        { $set: { isRead: true, readAt: new Date() } },
        { new: true, runValidators: true },
      ).populate('actor', 'displayName username avatar name').populate('document', 'title slug');
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
      return res.json({ success: true, data: notification });
    } catch (error) { return sendServerError(res, error, next); }
  },

  async markUnread(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      const notificationId = toObjectId(req.params.id);
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      if (!notificationId) return res.status(400).json({ success: false, message: 'Invalid notification ID.' });

      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: recipientId },
        { $set: { isRead: false, readAt: null } },
        { new: true, runValidators: true },
      );
      if (!notification) return res.status(404).json({ success: false, message: 'Notification not found.' });
      return res.json({ success: true, data: notification });
    } catch (error) { return sendServerError(res, error, next); }
  },

  async markAllRead(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      const result = await Notification.updateMany(
        { recipient: recipientId, isRead: false },
        { $set: { isRead: true, readAt: new Date() } },
      );
      return res.json({ success: true, data: { modified: result.modifiedCount || 0 } });
    } catch (error) { return sendServerError(res, error, next); }
  },

  async unreadCount(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      const count = await Notification.countDocuments({ recipient: recipientId, isRead: false });
      return res.json({ success: true, data: { count } });
    } catch (error) { return sendServerError(res, error, next); }
  },

  async remove(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      const notificationId = toObjectId(req.params.id);
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      if (!notificationId) return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
      const result = await Notification.deleteOne({ _id: notificationId, recipient: recipientId });
      if (!result.deletedCount) return res.status(404).json({ success: false, message: 'Notification not found.' });
      return res.json({ success: true, data: { deleted: 1 }, message: 'Notification removed.' });
    } catch (error) { return sendServerError(res, error, next); }
  },

  async removeRead(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      const result = await Notification.deleteMany({ recipient: recipientId, isRead: true });
      return res.json({ success: true, data: { deleted: result.deletedCount || 0 } });
    } catch (error) { return sendServerError(res, error, next); }
  },

  async clearAll(req, res, next) {
    try {
      const recipientId = toObjectId(getUserId(req));
      if (!recipientId) return res.status(401).json({ success: false, message: 'Authentication required.' });
      const result = await Notification.deleteMany({ recipient: recipientId });
      return res.json({ success: true, data: { deleted: result.deletedCount || 0 } });
    } catch (error) { return sendServerError(res, error, next); }
  },
};

module.exports = NotificationController;
