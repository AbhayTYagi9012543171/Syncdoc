
const express = require('express');
const { auth } = require('../middleware/auth');
const ProfileController = require('../controllers/ProfileController');
const { upload } = require('../middleware/avatarUpload');

const router = express.Router();

router.get('/', auth, ProfileController.getMe);
router.patch('/', auth, ProfileController.updateMe);

router.post(
  '/avatar',
  auth,
  upload.single('avatar'),
  ProfileController.uploadAvatar
);

router.delete('/avatar', auth, ProfileController.removeAvatar);

module.exports = router;
