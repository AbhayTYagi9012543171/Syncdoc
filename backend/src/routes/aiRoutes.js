"use strict";

const express = require("express");
const router = express.Router();
const AIAssistantController = require("../controllers/AIAssistantController");
const { auth, checkDocumentAccess } = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimit");

router.post("/documents/:documentId/assist", auth, aiLimiter, checkDocumentAccess, AIAssistantController.assist);

module.exports = router;
