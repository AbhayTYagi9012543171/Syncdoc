const express = require('express');

const router = express.Router();

const AuthController = require('../controllers/AuthController');

const {
  auth,
  loginRateLimiter,
  registerRateLimiter,
} = require('../middleware/auth');

// ============================================================
// REGISTER
// ============================================================

router.post(
  '/register',
  registerRateLimiter,
  AuthController.register
);

// ============================================================
// LOGIN
// ============================================================

router.post(
  '/login',
  loginRateLimiter,
  AuthController.login
);

// ============================================================
// REFRESH TOKEN
// ============================================================

router.post(
  '/refresh',
  AuthController.refreshToken
);

// ============================================================
// LOGOUT
// ============================================================

router.post(
  '/logout',
  auth,
  AuthController.logout
);

// ============================================================
// CURRENT USER
// ============================================================

router.get(
  '/me',
  auth,
  AuthController.getMe
);

// ============================================================
// UPDATE PASSWORD
// ============================================================

router.put(
  '/password',
  auth,
  AuthController.updatePassword
);

// ============================================================
// FORGOT PASSWORD
// ============================================================

router.post(
  '/forgot-password',
  AuthController.forgotPassword
);

// ============================================================
// RESET PASSWORD
// ============================================================

router.post(
  '/reset-password',
  AuthController.resetPassword
);

// ============================================================
// VERIFY EMAIL
// ============================================================

router.get(
  '/verify-email/:token',
  AuthController.verifyEmail
);

// ============================================================
// UPDATE PROFILE
// ============================================================

router.put(
  '/profile',
  auth,
  AuthController.updateProfile
);

module.exports = router;