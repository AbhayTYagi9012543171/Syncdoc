const multer = require('multer');

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_BYTES,
    files: 1,
    fields: 0,
    parts: 1,
  },
  fileFilter(_req, file, callback) {
    // MIME type is only an early filter. ProfileController independently
    // verifies the actual file signature before writing to disk.
    if (!ALLOWED_TYPES.has(file.mimetype)) {
      const error = new Error(
        'Upload a JPG, PNG, WEBP, or GIF image. SVG is not supported.'
      );
      error.status = 415;
      error.code = 'UNSUPPORTED_AVATAR_TYPE';
      return callback(error);
    }

    return callback(null, true);
  },
});

module.exports = {
  upload,
  MAX_AVATAR_BYTES,
};
