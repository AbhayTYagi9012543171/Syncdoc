const express = require("express");
const { auth } = require("../middleware/auth");
const controller = require("../controllers/SettingsController");

const router = express.Router();
router.use(auth);
router.get("/", controller.getSettings);
router.patch("/", controller.updateSettings);
module.exports = router;
