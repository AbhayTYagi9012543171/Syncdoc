'use strict';

const express = require('express');
const SettingsController = require('../controllers/SettingsController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, SettingsController.get);
router.put('/', auth, SettingsController.update);

module.exports = router;
