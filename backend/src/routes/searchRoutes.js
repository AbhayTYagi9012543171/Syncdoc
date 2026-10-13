'use strict';
const express = require('express');
const SearchController = require('../controllers/SearchController');
const { auth } = require('../middleware/auth');
const router = express.Router();
router.get('/', auth, SearchController.global);
module.exports = router;
