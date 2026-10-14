'use strict';

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { auth } = require('../middleware/auth');

// Static paths must be registered before /:id to avoid route ambiguity.
router.get('/', auth, NotificationController.list);
router.get('/unread-count', auth, NotificationController.unreadCount);
router.patch('/read-all', auth, NotificationController.markAllRead);
router.delete('/read', auth, NotificationController.removeRead);
router.delete('/', auth, NotificationController.clearAll);

router.get('/:id', auth, NotificationController.getById);
router.patch('/:id/read', auth, NotificationController.markRead);
router.patch('/:id/unread', auth, NotificationController.markUnread);
router.delete('/:id', auth, NotificationController.remove);

module.exports = router;
