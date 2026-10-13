'use strict';

function ok(res, data = null, options = {}) {
  const {
    status = 200,
    message = null,
    meta = undefined,
  } = options;

  const payload = { success: true, data };
  if (message) payload.message = message;
  if (meta !== undefined) payload.meta = meta;
  if (res.req?.requestId) payload.requestId = res.req.requestId;

  return res.status(status).json(payload);
}

function created(res, data = null, options = {}) {
  return ok(res, data, { ...options, status: 201 });
}

function fail(res, status, message, options = {}) {
  const payload = {
    success: false,
    error: {
      code: options.code || 'API_ERROR',
      message,
    },
  };

  if (options.details !== undefined) payload.error.details = options.details;
  if (res.req?.requestId) payload.requestId = res.req.requestId;

  return res.status(status).json(payload);
}

module.exports = { ok, created, fail };
