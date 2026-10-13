const mongoose = require('mongoose');
const Document = require('../models/Document');
const User = require('../models/User');
const { logger } = require('../config/logger');

function oid(value) { return new mongoose.Types.ObjectId(String(value)); }
function pct(current, previous) {
  if (!previous) return current ? '+100%' : '0%';
  const n = Math.round(((current - previous) / previous) * 100);
  return `${n >= 0 ? '+' : ''}${n}%`;
}

const AnalyticsController = {
  async get(req, res, next) {
    try {
      const userId = oid(req.user.id);
      const days = Math.min(Math.max(Number(req.query.days) || 30, 7), 365);
      const now = new Date();
      const start = new Date(now); start.setDate(start.getDate() - days);
      const previousStart = new Date(start); previousStart.setDate(previousStart.getDate() - days);
      const base = { deletedAt: null, $or: [{ owner: userId }, { 'collaborators.user': userId }] };

      const [activeUsers, previousActiveUsers, docs, previousDocs, edits, previousEdits, comments, previousComments, topDocs, activity] = await Promise.all([
        Document.aggregate([{ $match: { ...base, 'operations.timestamp': { $gte: start, $lte: now } } }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: start, $lte: now } } }, { $group: { _id: '$operations.userId' } }, { $count: 'value' }]),
        Document.aggregate([{ $match: { ...base, 'operations.timestamp': { $gte: previousStart, $lt: start } } }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: previousStart, $lt: start } } }, { $group: { _id: '$operations.userId' } }, { $count: 'value' }]),
        Document.countDocuments({ ...base, createdAt: { $gte: start, $lte: now } }),
        Document.countDocuments({ ...base, createdAt: { $gte: previousStart, $lt: start } }),
        Document.aggregate([{ $match: base }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: start, $lte: now } } }, { $count: 'value' }]),
        Document.aggregate([{ $match: base }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: previousStart, $lt: start } } }, { $count: 'value' }]),
        Document.countDocuments({ ...base, 'comments.0': { $exists: true } }),
        Document.countDocuments({ ...base, 'comments.0': { $exists: true } }),
        Document.aggregate([{ $match: base }, { $project: { title: 1, updatedAt: 1, edits: { $size: { $ifNull: ['$operations', []] } }, owner: 1 } }, { $sort: { edits: -1, updatedAt: -1 } }, { $limit: 5 }]),
        Document.aggregate([{ $match: base }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: start, $lte: now } } }, { $sort: { 'operations.timestamp': -1 } }, { $limit: 20 }, { $lookup: { from: 'users', localField: 'operations.userId', foreignField: '_id', as: 'user' } }, { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } }, { $project: { _id: 1, title: 1, operation: '$operations', user: { displayName: '$user.displayName', username: '$user.username', avatar: '$user.avatar' } } }]),
      ]);

      const active = activeUsers[0]?.value || 0;
      const prevActive = previousActiveUsers[0]?.value || 0;
      const totalEdits = edits[0]?.value || 0;
      const prevEdits = previousEdits[0]?.value || 0;

      const buckets = [];
      const bucketCount = days <= 31 ? days : Math.ceil(days / 7);
      const bucketSize = days <= 31 ? 1 : 7;
      for (let i = bucketCount - 1; i >= 0; i -= 1) {
        const from = new Date(now); from.setDate(from.getDate() - (i + 1) * bucketSize);
        const to = new Date(now); to.setDate(to.getDate() - i * bucketSize);
        buckets.push({ from, to });
      }
      const chart = await Promise.all(buckets.map(async (bucket) => {
        const row = await Document.aggregate([{ $match: base }, { $unwind: '$operations' }, { $match: { 'operations.timestamp': { $gte: bucket.from, $lt: bucket.to } } }, { $count: 'value' }]);
        return { label: bucket.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: row[0]?.value || 0 };
      }));

      res.json({ success: true, data: {
        period: days,
        generatedAt: now,
        stats: [
          { id: 'users', label: 'Active users', value: active, change: pct(active, prevActive), description: 'Unique editors', icon: '◉' },
          { id: 'documents', label: 'Documents created', value: docs, change: pct(docs, previousDocs), description: 'Created in period', icon: '▤' },
          { id: 'edits', label: 'Total edits', value: totalEdits, change: pct(totalEdits, prevEdits), description: 'Recorded operations', icon: '✎' },
          { id: 'comments', label: 'Comments', value: comments, change: pct(comments, previousComments), description: 'Comment records', icon: '◌' },
        ],
        activity: chart,
        documents: topDocs.map(d => ({ id: String(d._id), title: d.title || 'Untitled document', edits: d.edits || 0, views: 0, comments: 0 })),
        recentActivity: activity.map(item => ({ id: `${item._id}-${item.operation?.timestamp?.getTime?.() || Date.now()}`, documentId: String(item._id), title: item.title, type: item.operation?.type, createdAt: item.operation?.timestamp, user: item.user })),
      }});
    } catch (error) {
      logger.error('Analytics error:', error);
      next(error);
    }
  },
};
module.exports = AnalyticsController;
