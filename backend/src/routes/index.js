const express = require('express');

const router = express.Router();

const authRoutes = require('./authRoutes');
const documentRoutes = require('./documentRoutes');
const userRoutes = require('./userRoutes');
const workspaceRoutes = require('./workspaceRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const notificationRoutes = require('./notificationRoutes');
const settingsRoutes = require('./settingsRoutes');
const systemRoutes = require('./systemRoutes');
const searchRoutes = require('./searchRoutes');

// ============================================================
// SYSTEM / HEALTH
// ============================================================

router.use('/system', systemRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'syncdoc-api',
      version: process.env.APP_VERSION || '2.0.0',
    },
    timestamp: new Date().toISOString(),
    requestId: req.requestId,
  });
});

// ============================================================
// TEST
// ============================================================

router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// AUTH
// ============================================================

router.use('/auth', authRoutes);

// ============================================================
// DOCUMENTS
// ============================================================

router.use('/documents', documentRoutes);

// ============================================================
// USERS
// ============================================================

router.use('/users', userRoutes);

// ============================================================
// DASHBOARD
// ============================================================

router.use('/dashboard', dashboardRoutes);

router.use('/analytics', analyticsRoutes);

router.use('/notifications', notificationRoutes);
router.use('/settings', settingsRoutes);
router.use('/search', searchRoutes);

// ============================================================
// WORKSPACES
// ============================================================

router.use('/workspaces', workspaceRoutes);

module.exports = router;