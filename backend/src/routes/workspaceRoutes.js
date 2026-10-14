
const express = require('express');
const router = express.Router();
const WorkspaceController = require('../controllers/WorkspaceController');
const { auth, authorize, checkWorkspaceMembership } = require('../middleware/auth');
const { workspaceValidation, commonValidation } = require('../middleware/validation');
const { validate } = require('../middleware/validation');

// Ensure the workspace listing is freshly evaluated for each request.
// This is scoped to GET /workspaces and does not alter caching for other routes.
const preventWorkspaceCaching = (req, res, next) => {
  res.set({
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
    Expires: '0',
  });

  // Ignore conditional request headers on this endpoint so it won't return 304.
  delete req.headers['if-none-match'];
  delete req.headers['if-modified-since'];

  return next();
};

router.post(
  '/',
  auth,
  workspaceValidation.create,
  validate,
  WorkspaceController.create
);

router.get(
  '/',
  auth,
  preventWorkspaceCaching,
  commonValidation.pagination,
  commonValidation.search,
  validate,
  WorkspaceController.getAll
);

router.get(
  '/search',
  auth,
  commonValidation.search,
  validate,
  WorkspaceController.searchWorkspaces
);

router.get(
  '/my',
  auth,
  WorkspaceController.getUserWorkspaces
);

router.get(
  '/:workspaceId',
  auth,
  commonValidation.workspaceId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.getById
);

router.put(
  '/:workspaceId',
  auth,
  commonValidation.workspaceId,
  workspaceValidation.update,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.update
);

router.delete(
  '/:workspaceId',
  auth,
  commonValidation.workspaceId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.delete
);

router.post(
  '/:workspaceId/members',
  auth,
  commonValidation.workspaceId,
  workspaceValidation.member,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.addMember
);

router.delete(
  '/:workspaceId/members/:userId',
  auth,
  commonValidation.workspaceId,
  commonValidation.userId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.removeMember
);

router.put(
  '/:workspaceId/members/:userId',
  auth,
  commonValidation.workspaceId,
  commonValidation.userId,
  workspaceValidation.member,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.updateMemberRole
);

router.get(
  '/:workspaceId/members',
  auth,
  commonValidation.workspaceId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.getMembers
);

router.get(
  '/:workspaceId/documents',
  auth,
  commonValidation.workspaceId,
  commonValidation.pagination,
  commonValidation.search,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.getDocuments
);

router.get(
  '/:workspaceId/stats',
  auth,
  commonValidation.workspaceId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.getStats
);

router.post(
  '/:workspaceId/transfer',
  auth,
  commonValidation.workspaceId,
  workspaceValidation.transfer,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.transferOwnership
);

router.post(
  '/:workspaceId/archive',
  auth,
  commonValidation.workspaceId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.archiveWorkspace
);

router.post(
  '/:workspaceId/unarchive',
  auth,
  commonValidation.workspaceId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.unarchiveWorkspace
);

router.post(
  '/:workspaceId/leave',
  auth,
  commonValidation.workspaceId,
  validate,
  checkWorkspaceMembership,
  WorkspaceController.leaveWorkspace
);

module.exports = router;
