'use strict';

const express = require('express');
const SystemController = require('../controllers/SystemController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/health', SystemController.health);
router.get('/status', auth, SystemController.status);
router.get('/ready', SystemController.readiness);

module.exports = router;
