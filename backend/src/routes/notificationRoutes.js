'use strict';

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/NotificationController');
const { auth } = require('../middleware/auth');

router.get('/', auth, NotificationController.list);
router.get('/unread-count', auth, NotificationController.unreadCount);
router.patch('/read-all', auth, NotificationController.markAllRead);
router.delete('/read', auth, NotificationController.removeRead);
router.delete('/', auth, NotificationController.clearAll);

router.patch('/:id/read', auth, NotificationController.markRead);
router.patch('/:id/unread', auth, NotificationController.markUnread);
router.delete('/:id', auth, NotificationController.remove);

module.exports = router;
