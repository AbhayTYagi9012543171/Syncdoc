const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/AnalyticsController');
const { auth } = require('../middleware/auth');
router.get('/', auth, AnalyticsController.get);
module.exports = router;
