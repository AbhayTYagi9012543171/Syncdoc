'use strict';

const crypto = require('crypto');

module.exports = function requestContext(req, res, next) {
  const incoming = req.get('X-Request-ID');
  const requestId = incoming && /^[A-Za-z0-9._:-]{8,128}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    if (req.app.get('logger')) {
      req.app.get('logger').info('HTTP request completed', {
        requestId,
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(elapsedMs * 100) / 100,
        userId: req.user?._id || req.user?.id || null,
      });
    }
  });

  next();
};
