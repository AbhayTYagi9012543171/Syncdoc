const express = require('express');
const DashboardController = require('../controllers/DashboardController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.get('/', auth, DashboardController.get);

module.exports = router;
