
const express = require('express');
const path = require('path');

const router = express.Router();

// ============================================================
// ROUTE IMPORTS
// ============================================================

const authRoutes = require('./authRoutes');
const documentRoutes = require('./documentRoutes');
const userRoutes = require('./userRoutes');
const profileRoutes = require('./profileRoutes');
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
// AUTHENTICATION
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
// PROFILE API
// ============================================================

// GET    /api/profile
// PATCH  /api/profile
// POST   /api/profile/avatar
// DELETE /api/profile/avatar

router.use('/profile', profileRoutes);

// ============================================================
// PROFILE AVATAR STATIC FILES
// ============================================================

// Physical directory:
// backend/uploads/profile-avatars/
//
// Public URL when this router is mounted at /api:
// /api/uploads/profile-avatars/<filename>
//
// The directory must match the directory used by
// ProfileController.js when saving uploaded images.

const avatarDirectory = path.resolve(
  __dirname,
  '../../uploads/profile-avatars'
);

router.use(
  '/uploads/profile-avatars',
  express.static(avatarDirectory, {
    index: false,
    dotfiles: 'deny',
    fallthrough: true,
    maxAge: '1d',
    immutable: true,

    setHeaders(res) {
      // Allow images to be embedded by the frontend on
      // localhost:3000 while the backend runs on localhost:5000.
      res.setHeader(
        'Cross-Origin-Resource-Policy',
        'cross-origin'
      );

      res.setHeader(
        'X-Content-Type-Options',
        'nosniff'
      );

      // Allow cross-origin image requests without credentials.
      res.setHeader(
        'Access-Control-Allow-Origin',
        'http://localhost:3000'
      );
    },
  })
);

// ============================================================
// DASHBOARD
// ============================================================

router.use('/dashboard', dashboardRoutes);

// ============================================================
// ANALYTICS
// ============================================================

router.use('/analytics', analyticsRoutes);

// ============================================================
// NOTIFICATIONS
// ============================================================

router.use('/notifications', notificationRoutes);

// ============================================================
// SETTINGS
// ============================================================

router.use('/settings', settingsRoutes);

// ============================================================
// SEARCH
// ============================================================

router.use('/search', searchRoutes);

// ============================================================
// WORKSPACES
// ============================================================

router.use('/workspaces', workspaceRoutes);

// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
