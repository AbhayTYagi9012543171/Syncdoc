'use strict';

const mongoose = require('mongoose');
const Document = require('../models/Document');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { logger } = require('../config/logger');

const asObjectId = (value) => {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
};
const percentChange = (current, previous) => {
  if (!previous) return current ? '+100%' : '0%';
  const value = Math.round(((current - previous) / previous) * 100);
  return `${value > 0 ? '+' : ''}${value}%`;
};
const countValue = (rows) => Number(rows?.[0]?.value || 0);
const safeName = (user) => user?.displayName || user?.username || user?.email || 'Workspace member';

const AnalyticsController = {
  async get(req, res, next) {
    try {
      const userId = asObjectId(req.user?.id || req.user?._id);
      if (!userId) return res.status(401).json({ success: false, message: 'A valid authenticated user is required.' });

      const requestedDays = Number.parseInt(req.query.days, 10);
      const days = Math.min(Math.max(Number.isFinite(requestedDays) ? requestedDays : 30, 7), 365);
      const now = new Date();
      const start = new Date(now.getTime() - days * 86400000);
      const previousStart = new Date(start.getTime() - days * 86400000);
      const base = { deletedAt: null, $or: [{ owner: userId }, { 'collaborators.user': userId }] };

      // Keep analytics scoped to documents the current user can access.
      const visibleDocs = await Document.find(base).select('_id').lean();
      const visibleDocumentIds = visibleDocs.map((doc) => doc._id);
      const empty = !visibleDocumentIds.length;
      const operationMatch = empty ? { _id: null } : { _id: { $in: visibleDocumentIds } };

      const [activeRows, previousActiveRows, docsCreated, previousDocsCreated, editsRows, previousEditsRows, topDocs, operations, auditRows, commentCount, previousCommentCount] = await Promise.all([
        empty ? Promise.resolve([]) : Document.aggregate([
          { $match: { ...operationMatch, 'operations.timestamp': { $gte: start, $lte: now } } }, { $unwind: '$operations' },
          { $match: { 'operations.timestamp': { $gte: start, $lte: now } } }, { $group: { _id: '$operations.userId' } }, { $count: 'value' },
        ]),
        empty ? Promise.resolve([]) : Document.aggregate([
          { $match: { ...operationMatch, 'operations.timestamp': { $gte: previousStart, $lt: start } } }, { $unwind: '$operations' },
          { $match: { 'operations.timestamp': { $gte: previousStart, $lt: start } } }, { $group: { _id: '$operations.userId' } }, { $count: 'value' },
        ]),
        empty ? Promise.resolve(0) : Document.countDocuments({ ...base, createdAt: { $gte: start, $lte: now } }),
        empty ? Promise.resolve(0) : Document.countDocuments({ ...base, createdAt: { $gte: previousStart, $lt: start } }),
        empty ? Promise.resolve([]) : Document.aggregate([
          { $match: operationMatch }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: start, $lte: now } } }, { $count: 'value' },
        ]),
        empty ? Promise.resolve([]) : Document.aggregate([
          { $match: operationMatch }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: previousStart, $lt: start } } }, { $count: 'value' },
        ]),
        empty ? Promise.resolve([]) : Document.aggregate([
          { $match: operationMatch }, { $project: { title: 1, updatedAt: 1, edits: { $size: { $filter: { input: { $ifNull: ['$operations', []] }, as: 'op', cond: { $and: [{ $gte: ['$$op.timestamp', start] }, { $lte: ['$$op.timestamp', now] }] } } } } } },
          { $sort: { edits: -1, updatedAt: -1 } }, { $limit: 8 },
        ]),
        empty ? Promise.resolve([]) : Document.aggregate([
          { $match: { ...operationMatch, 'operations.timestamp': { $gte: start, $lte: now } } }, { $unwind: '$operations' },
          { $match: { 'operations.timestamp': { $gte: start, $lte: now } } }, { $sort: { 'operations.timestamp': -1 } }, { $limit: 40 },
          { $lookup: { from: User.collection.name, localField: 'operations.userId', foreignField: '_id', as: 'actor' } },
          { $unwind: { path: '$actor', preserveNullAndEmptyArrays: true } },
          { $project: { _id: 1, title: 1, operation: '$operations', user: { _id: '$actor._id', displayName: '$actor.displayName', username: '$actor.username', email: '$actor.email', avatar: '$actor.avatar' } } },
        ]),
        empty ? Promise.resolve([]) : AuditLog.find({ document: { $in: visibleDocumentIds }, createdAt: { $gte: start, $lte: now } }).sort({ createdAt: -1 }).limit(30).populate('actor', 'displayName username email avatar').populate('document', 'title').lean(),
        empty ? Promise.resolve(0) : AuditLog.countDocuments({ document: { $in: visibleDocumentIds }, createdAt: { $gte: start, $lte: now }, action: /comment/i }),
        empty ? Promise.resolve(0) : AuditLog.countDocuments({ document: { $in: visibleDocumentIds }, createdAt: { $gte: previousStart, $lt: start }, action: /comment/i }),
      ]);

      const activeUsers = countValue(activeRows);
      const previousActiveUsers = countValue(previousActiveRows);
      const totalEdits = countValue(editsRows);
      const previousEdits = countValue(previousEditsRows);

      // Build a continuous timeline so days with zero events are visible too.
      const dailyRows = empty ? [] : await Document.aggregate([
        { $match: { ...operationMatch, 'operations.timestamp': { $gte: start, $lte: now } } }, { $unwind: '$operations' },
        { $match: { 'operations.timestamp': { $gte: start, $lte: now } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$operations.timestamp' } }, value: { $sum: 1 } } },
      ]);
      const activity = [];
      const bucketCount = days <= 31 ? days : Math.min(30, Math.ceil(days / 7));
      const bucketWidth = days / bucketCount;
      const startOfRange = new Date(start.toISOString().slice(0, 10) + 'T00:00:00.000Z');
      const bucketValues = Array(bucketCount).fill(0);
      for (const row of dailyRows) {
        const rowDay = new Date(`${row._id}T00:00:00.000Z`);
        const dayOffset = Math.floor((rowDay.getTime() - startOfRange.getTime()) / 86400000);
        const bucketIndex = Math.min(bucketCount - 1, Math.max(0, Math.floor(dayOffset / bucketWidth)));
        bucketValues[bucketIndex] += row.value;
      }
      for (let index = 0; index < bucketCount; index += 1) {
        const bucketEnd = new Date(startOfRange.getTime() + Math.min(days, (index + 1) * bucketWidth) * 86400000);
        const labelDate = new Date(bucketEnd.getTime() - 86400000);
        activity.push({ date: labelDate.toISOString().slice(0, 10), label: days <= 31 ? labelDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) : labelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: bucketValues[index] });
      }

      const operationActivity = operations.map((row) => ({
        id: `${row._id}-${row.operation?.timestamp ? new Date(row.operation.timestamp).getTime() : 'operation'}`,
        documentId: String(row._id), title: row.title || 'Untitled document', type: row.operation?.type || 'updated', action: row.operation?.type || 'updated',
        entityType: 'document', createdAt: row.operation?.timestamp || null,
        user: row.user ? { id: row.user._id ? String(row.user._id) : null, displayName: safeName(row.user), username: row.user.username, email: row.user.email, avatar: row.user.avatar } : null,
      }));
      const loggedActivity = auditRows.map((row) => ({
        id: String(row._id), documentId: row.document?._id ? String(row.document._id) : row.entityId || null,
        title: row.document?.title || row.metadata?.title || row.entityType || 'Workspace item',
        type: row.action || 'activity', action: row.action || 'activity', entityType: row.entityType || 'workspace',
        description: row.metadata?.description || '', createdAt: row.createdAt,
        user: row.actor ? { id: String(row.actor._id), displayName: safeName(row.actor), username: row.actor.username, email: row.actor.email, avatar: row.actor.avatar } : null,
      }));
      const recentActivity = [...operationActivity, ...loggedActivity].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 30);

      return res.json({ success: true, data: {
        period: days, generatedAt: now,
        stats: [
          { id: 'users', label: 'Active users', value: activeUsers, change: percentChange(activeUsers, previousActiveUsers), description: 'Unique editors in this period' },
          { id: 'documents', label: 'Documents created', value: docsCreated, change: percentChange(docsCreated, previousDocsCreated), description: 'Created in selected period' },
          { id: 'edits', label: 'Total edits', value: totalEdits, change: percentChange(totalEdits, previousEdits), description: 'Recorded document operations' },
          { id: 'comments', label: 'Comments', value: commentCount, change: percentChange(commentCount, previousCommentCount), description: 'Comment events from audit log' },
        ],
        activity,
        documents: topDocs.map((doc) => ({ id: String(doc._id), title: doc.title || 'Untitled document', edits: doc.edits || 0, updatedAt: doc.updatedAt || null })),
        recentActivity,
      } });
    } catch (error) {
      logger.error('Analytics error:', error);
      return next(error);
    }
  },
};

module.exports = AnalyticsController;
