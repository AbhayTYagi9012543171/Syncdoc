'use strict';

const mongoose = require('mongoose');
const { ok } = require('../utils/apiResponse');

const SystemController = {
  async health(req, res) {
    return ok(res, {
      status: 'healthy',
      service: 'syncdoc-api',
      version: process.env.APP_VERSION || '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  },


  async status(req, res) {
    const memory = process.memoryUsage();
    return ok(res, {
      service: 'syncdoc-api',
      status: mongoose.connection.readyState === 1 ? 'operational' : 'degraded',
      version: process.env.APP_VERSION || '5.0.0',
      node: process.version,
      environment: process.env.NODE_ENV || 'development',
      uptimeSeconds: Math.round(process.uptime()),
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: {
        rssMb: Math.round(memory.rss / 1024 / 1024),
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      },
      realtime: 'socket.io + yjs',
      timestamp: new Date().toISOString(),
    });
  },

  async readiness(req, res) {
    const databaseReady = mongoose.connection.readyState === 1;
    const ready = databaseReady;

    return res.status(ready ? 200 : 503).json({
      success: ready,
      data: {
        ready,
        checks: { database: databaseReady ? 'up' : 'down' },
      },
      timestamp: new Date().toISOString(),
    });
  },
};

module.exports = SystemController;
