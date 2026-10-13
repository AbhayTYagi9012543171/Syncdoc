'use strict';

const AuditLog = require('../models/AuditLog');

async function recordAudit(req, event = {}) {
  try {
    await AuditLog.create({
      actor: req.user?._id || req.user?.id || null,
      workspace: event.workspace || null,
      document: event.document || null,
      action: event.action || 'unknown',
      entityType: event.entityType || 'unknown',
      entityId: event.entityId ? String(event.entityId) : null,
      metadata: event.metadata || {},
      requestId: req.requestId || null,
      ip: req.ip || null,
      userAgent: req.get('user-agent') || null,
    });
  } catch (error) {
    // Audit logging must never break the primary request.
    if (req.app.get('logger')) {
      req.app.get('logger').warn('Audit log write failed', {
        error: error.message,
        requestId: req.requestId,
      });
    }
  }
}

module.exports = { recordAudit };
