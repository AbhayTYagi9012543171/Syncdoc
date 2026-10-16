const express = require('express');

const router = express.Router();

const DocumentController = require('../controllers/DocumentController');

const {
  auth,
  checkDocumentAccess,
  checkDocumentEditPermission,
} = require('../middleware/auth');

const {
  documentValidation,
  commonValidation,
  validate,
} = require('../middleware/validation');

const { documentCreateLimiter } = require('../middleware/rateLimit');

// ============================================================
// CREATE DOCUMENT
// ============================================================

router.post(
  '/',
  auth,
  documentCreateLimiter,
  documentValidation.create,
  validate,
  DocumentController.create
);


// ============================================================
// TRASH / RESTORE
// ============================================================
router.get('/trash/list', auth, DocumentController.getTrash);

// ============================================================
// GET ALL DOCUMENTS
// ============================================================

router.get(
  '/',
  auth,
  commonValidation.pagination,
  commonValidation.search,
  validate,
  DocumentController.getAll
);


router.post('/:documentId/restore-trash', auth, commonValidation.documentId, validate, DocumentController.restore);

// ============================================================
// GET DOCUMENT BY ID
// ============================================================

router.get(
  '/:documentId',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentAccess,
  DocumentController.getById
);

// One editor initializes the empty Yjs room from the durable document HTML.
router.post(
  '/:documentId/collaboration/seed-claim',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentEditPermission,
  DocumentController.claimCollaborationSeed
);

// ============================================================
// UPDATE DOCUMENT
// ============================================================

router.put(
  '/:documentId',
  auth,
  commonValidation.documentId,
  documentValidation.update,
  validate,
  checkDocumentEditPermission,
  DocumentController.update
);

// ============================================================
// DELETE DOCUMENT
// ============================================================

router.delete(
  '/:documentId',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentAccess,
  DocumentController.delete
);

// ============================================================
// PERMANENT DELETE
// ============================================================

router.delete(
  '/:documentId/permanent',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentAccess,
  DocumentController.permanentDelete
);

// ============================================================
// DOCUMENT VERSIONS
// ============================================================

router.get(
  '/:documentId/versions',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentAccess,
  DocumentController.getVersions
);

// ============================================================
// RESTORE VERSION
// ============================================================

router.post(
  '/:documentId/restore',
  auth,
  commonValidation.documentId,
  documentValidation.restore,
  validate,
  checkDocumentEditPermission,
  DocumentController.restoreVersion
);

// ============================================================
// COLLABORATORS
// ============================================================

router.post(
  '/:documentId/collaborators',
  auth,
  commonValidation.documentId,
  documentValidation.collaborator,
  validate,
  checkDocumentAccess,
  DocumentController.addCollaborator
);

router.delete(
  '/:documentId/collaborators/:userId',
  auth,
  commonValidation.documentId,
  commonValidation.userId,
  validate,
  checkDocumentAccess,
  DocumentController.removeCollaborator
);

router.put(
  '/:documentId/collaborators/:userId',
  auth,
  commonValidation.documentId,
  commonValidation.userId,
  documentValidation.collaborator,
  validate,
  checkDocumentAccess,
  DocumentController.updateCollaborator
);

router.get(
  '/:documentId/collaborators',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentAccess,
  DocumentController.getCollaborators
);

// ============================================================
// DOCUMENT STATS
// ============================================================

router.get(
  '/:documentId/stats',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentAccess,
  DocumentController.getStats
);

// ============================================================
// EXPORT
// ============================================================

router.get(
  '/:documentId/export',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentAccess,
  DocumentController.exportDocument
);

// ============================================================
// APPLY OPERATION
// ============================================================

router.post(
  '/:documentId/operation',
  auth,
  commonValidation.documentId,
  validate,
  checkDocumentEditPermission,
  DocumentController.applyOperation
);

module.exports = router;