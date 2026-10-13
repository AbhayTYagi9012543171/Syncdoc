const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { auth, authorize } = require('../middleware/auth');
const { userValidation, commonValidation } = require('../middleware/validation');
const { validate } = require('../middleware/validation');

/**
 * @route   GET /api/v1/users
 * @desc    Get all users (admin only)
 * @access  Private/Admin
 */
router.get(
  '/',
  auth,
  authorize('admin'),
  commonValidation.pagination,
  commonValidation.search,
  validate,
  UserController.getAllUsers
);

/**
 * @route   GET /api/v1/users/search
 * @desc    Search users
 * @access  Private
 */
router.get(
  '/search',
  auth,
  commonValidation.search,
  validate,
  UserController.searchUsers
);

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics (admin only)
 * @access  Private/Admin
 */
router.get(
  '/stats',
  auth,
  authorize('admin'),
  UserController.getUserStats
);

/**
 * @route   PUT /api/v1/users/bulk
 * @desc    Bulk update users (admin only)
 * @access  Private/Admin
 */
router.put(
  '/bulk',
  auth,
  authorize('admin'),
  UserController.bulkUpdateUsers
);

/**
 * @route   GET /api/v1/users/:userId
 * @desc    Get user by ID
 * @access  Private
 */
router.get(
  '/:userId',
  auth,
  commonValidation.userId,
  validate,
  UserController.getUserById
);

/**
 * @route   PUT /api/v1/users/:userId/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put(
  '/:userId/profile',
  auth,
  commonValidation.userId,
  userValidation.updateProfile,
  validate,
  UserController.updateProfile
);

/**
 * @route   PUT /api/v1/users/:userId/role
 * @desc    Update user role (admin only)
 * @access  Private/Admin
 */
router.put(
  '/:userId/role',
  auth,
  authorize('admin'),
  commonValidation.userId,
  validate,
  UserController.updateUserRole
);

/**
 * @route   DELETE /api/v1/users/:userId
 * @desc    Delete user account (soft delete)
 * @access  Private
 */
router.delete(
  '/:userId',
  auth,
  commonValidation.userId,
  validate,
  UserController.deleteUser
);

/**
 * @route   DELETE /api/v1/users/:userId/permanent
 * @desc    Permanently delete user (admin only)
 * @access  Private/Admin
 */
router.delete(
  '/:userId/permanent',
  auth,
  authorize('admin'),
  commonValidation.userId,
  validate,
  UserController.permanentDeleteUser
);

/**
 * @route   GET /api/v1/users/:userId/documents
 * @desc    Get user's documents
 * @access  Private
 */
router.get(
  '/:userId/documents',
  auth,
  commonValidation.userId,
  commonValidation.pagination,
  validate,
  UserController.getUserDocuments
);

/**
 * @route   GET /api/v1/users/:userId/workspaces
 * @desc    Get user's workspaces
 * @access  Private
 */
router.get(
  '/:userId/workspaces',
  auth,
  commonValidation.userId,
  validate,
  UserController.getUserWorkspaces
);

/**
 * @route   GET /api/v1/users/:userId/activity
 * @desc    Get user activity
 * @access  Private
 */
router.get(
  '/:userId/activity',
  auth,
  commonValidation.userId,
  validate,
  UserController.getUserActivity
);

/**
 * @route   GET /api/v1/users/:userId/sessions
 * @desc    Get user sessions
 * @access  Private
 */
router.get(
  '/:userId/sessions',
  auth,
  commonValidation.userId,
  validate,
  UserController.getUserSessions
);

/**
 * @route   DELETE /api/v1/users/:userId/sessions/:socketId
 * @desc    Terminate a specific session
 * @access  Private
 */
router.delete(
  '/:userId/sessions/:socketId',
  auth,
  commonValidation.userId,
  validate,
  UserController.terminateSession
);

/**
 * @route   DELETE /api/v1/users/:userId/sessions
 * @desc    Terminate all sessions
 * @access  Private
 */
router.delete(
  '/:userId/sessions',
  auth,
  commonValidation.userId,
  validate,
  UserController.terminateAllSessions
);

/**
 * @route   GET /api/v1/users/:userId/preferences
 * @desc    Get user preferences
 * @access  Private
 */
router.get(
  '/:userId/preferences',
  auth,
  commonValidation.userId,
  validate,
  UserController.getUserPreferences
);

/**
 * @route   PUT /api/v1/users/:userId/preferences
 * @desc    Update user preferences
 * @access  Private
 */
router.put(
  '/:userId/preferences',
  auth,
  commonValidation.userId,
  userValidation.updateProfile,
  validate,
  UserController.updateUserPreferences
);

module.exports = router;