'use strict';

const Document = require('../models/Document');
const Workspace = require('../models/Workspace');
const User = require('../models/User');

const SearchController = {
  async global(req, res, next) {
    try {
      const userId = req.user.id;
      const q = String(req.query.q || '').trim();
      const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);

      if (q.length < 2) {
        return res.json({ success: true, data: { query: q, documents: [], workspaces: [], people: [] } });
      }

      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const [documents, workspaces, people] = await Promise.all([
        Document.find({ deletedAt: null, $or: [{ owner: userId }, { 'collaborators.user': userId }], $and: [{ $or: [{ title: rx }, { description: rx }, { tags: rx }] }] })
          .select('title description status updatedAt workspace owner')
          .sort({ updatedAt: -1 }).limit(limit).lean(),
        Workspace.find({ deletedAt: null, $or: [{ owner: userId }, { 'members.user': userId }], $and: [{ $or: [{ name: rx }, { description: rx }] }] })
          .select('name description updatedAt owner')
          .sort({ updatedAt: -1 }).limit(limit).lean(),
        User.find({ deletedAt: null, _id: { $ne: userId }, $or: [{ displayName: rx }, { username: rx }, { email: rx }] })
          .select('displayName username avatar role').limit(limit).lean(),
      ]);

      res.json({ success: true, data: { query: q, documents, workspaces, people } });
    } catch (error) { next(error); }
  },
};

module.exports = SearchController;
