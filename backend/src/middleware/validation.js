const {
  body,
  param,
  query,
  validationResult,
} = require('express-validator');

const { APIError } = require('./errorHandler');

/* ============================================================
   VALIDATION ERROR HANDLER
============================================================ */

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = errors.array().map((err) => ({
    field: err.path || err.param || 'unknown',
    message: err.msg,
    value: err.value,
  }));

  console.error(
    '❌ VALIDATION FAILED:',
    extractedErrors
  );

  const error = new APIError(
    'Validation failed',
    400,
    'VALIDATION_ERROR',
    extractedErrors
  );

  /*
   * Keep the validation details available to
   * different versions of the global error handler.
   */
  error.errors = extractedErrors;
  error.details = extractedErrors;

  return next(error);
};

/* ============================================================
   USER VALIDATION
============================================================ */

const userValidation = {
  /* ----------------------------------------------------------
     REGISTER
  ---------------------------------------------------------- */

  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage(
        'Username must be between 3 and 30 characters'
      )
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        'Username can only contain letters, numbers, and underscores'
      )
      .notEmpty()
      .withMessage('Username is required'),

    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Please provide a valid email address'
      )
      .normalizeEmail()
      .notEmpty()
      .withMessage('Email is required'),

    body('password')
      .isLength({ min: 8 })
      .withMessage(
        'Password must be at least 8 characters'
      )
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      )
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      )
      .notEmpty()
      .withMessage('Password is required'),

    body('displayName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage(
        'Display name cannot exceed 50 characters'
      ),
  ],

  /* ----------------------------------------------------------
     LOGIN
  ---------------------------------------------------------- */

  login: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Please provide a valid email address'
      )
      .normalizeEmail()
      .notEmpty()
      .withMessage('Email is required'),

    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],

  /* ----------------------------------------------------------
     UPDATE PROFILE
  ---------------------------------------------------------- */

  updateProfile: [
    body('displayName')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage(
        'Display name cannot exceed 50 characters'
      ),

    body('avatar')
      .optional()
      .isURL()
      .withMessage(
        'Avatar must be a valid URL'
      ),

    body('preferences')
      .optional()
      .isObject()
      .withMessage(
        'Preferences must be an object'
      ),
  ],

  /* ----------------------------------------------------------
     UPDATE PASSWORD
  ---------------------------------------------------------- */

  updatePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage(
        'Current password is required'
      ),

    body('newPassword')
      .isLength({ min: 8 })
      .withMessage(
        'New password must be at least 8 characters'
      )
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      )
      .withMessage(
        'New password must contain at least one uppercase letter, one lowercase letter, and one number'
      )
      .notEmpty()
      .withMessage(
        'New password is required'
      ),
  ],

  /* ----------------------------------------------------------
     FORGOT PASSWORD
  ---------------------------------------------------------- */

  forgotPassword: [
    body('email')
      .trim()
      .isEmail()
      .withMessage(
        'Please provide a valid email address'
      )
      .normalizeEmail()
      .notEmpty()
      .withMessage('Email is required'),
  ],

  /* ----------------------------------------------------------
     RESET PASSWORD
  ---------------------------------------------------------- */

  resetPassword: [
    body('token')
      .notEmpty()
      .withMessage(
        'Reset token is required'
      ),

    body('newPassword')
      .isLength({ min: 8 })
      .withMessage(
        'Password must be at least 8 characters'
      )
      .matches(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      )
      .withMessage(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      )
      .notEmpty()
      .withMessage(
        'New password is required'
      ),
  ],
};

/* ============================================================
   DOCUMENT VALIDATION
============================================================ */

const documentValidation = {
  /* ----------------------------------------------------------
     CREATE DOCUMENT
  ---------------------------------------------------------- */

  create: [
    body('title')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage(
        'Title must be between 1 and 200 characters'
      )
      .notEmpty()
      .withMessage('Title is required'),

    body('workspaceId')
      .optional()
      .isMongoId()
      .withMessage(
        'Invalid workspace ID'
      ),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage(
        'Description cannot exceed 500 characters'
      ),

    /*
     * Tiptap AST
     *
     * editor.getJSON() returns:
     *
     * {
     *   type: "doc",
     *   content: [...]
     * }
     *
     * However, SyncDoc currently stores the document
     * AST as the `content` array:
     *
     * [
     *   {
     *     type: "paragraph",
     *     content: [...]
     *   }
     * ]
     *
     * Therefore accept an ARRAY here.
     */
    body('ast')
      .optional()
      .isArray()
      .withMessage(
        'AST must be an array'
      ),

    body('content')
      .optional()
      .isString()
      .withMessage(
        'Content must be a string'
      ),
  ],

  /* ----------------------------------------------------------
     UPDATE DOCUMENT
  ---------------------------------------------------------- */

  update: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage(
        'Title must be between 1 and 200 characters'
      ),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage(
        'Description cannot exceed 500 characters'
      ),

    /*
     * IMPORTANT
     *
     * Frontend sends:
     *
     * ast: json.content
     *
     * Example:
     *
     * [
     *   {
     *     type: "paragraph",
     *     content: [
     *       {
     *         type: "text",
     *         text: "Arya jain"
     *       }
     *     ]
     *   }
     * ]
     *
     * Therefore `isArray()` is required.
     */
    body('ast')
      .optional()
      .isArray()
      .withMessage(
        'AST must be an array'
      ),

    /*
     * Tiptap editor.getHTML()
     * always returns a string.
     */
    body('content')
      .optional()
      .isString()
      .withMessage(
        'Content must be a string'
      ),

    /*
     * Version is still supported for other API clients.
     *
     * Your current EditorPage does NOT send it,
     * which is completely fine.
     */
    body('version')
      .optional()
      .isInt({ min: 0 })
      .withMessage(
        'Version must be a non-negative integer'
      )
      .toInt(),

    body('status')
      .optional()
      .isIn([
        'draft',
        'review',
        'published',
        'archived',
      ])
      .withMessage(
        'Invalid status value'
      ),

    body('settings')
      .optional()
      .isObject()
      .withMessage(
        'Settings must be an object'
      ),

    body('tags')
      .optional()
      .isArray()
      .withMessage(
        'Tags must be an array'
      ),

    body('isPublished')
      .optional()
      .isBoolean()
      .withMessage(
        'isPublished must be a boolean'
      ),

    body('isArchived')
      .optional()
      .isBoolean()
      .withMessage(
        'isArchived must be a boolean'
      ),
  ],

  /* ----------------------------------------------------------
     COLLABORATOR
  ---------------------------------------------------------- */

  collaborator: [
    body('userId')
      .isMongoId()
      .withMessage('Invalid user ID')
      .notEmpty()
      .withMessage(
        'User ID is required'
      ),

    body('role')
      .optional()
      .isIn([
        'viewer',
        'editor',
        'admin',
      ])
      .withMessage(
        'Invalid role. Must be viewer, editor, or admin'
      ),

    body('permissions')
      .optional()
      .isArray()
      .withMessage(
        'Permissions must be an array'
      )
      .custom((permissions) => {
        const validPermissions = [
          'read',
          'write',
          'comment',
          'share',
          'delete',
        ];

        return permissions.every(
          (permission) =>
            validPermissions.includes(
              permission
            )
        );
      })
      .withMessage(
        'Invalid permissions'
      ),
  ],

  /* ----------------------------------------------------------
     RESTORE VERSION
  ---------------------------------------------------------- */

  restore: [
    body('versionNumber')
      .isInt({ min: 0 })
      .withMessage(
        'Version number must be a non-negative integer'
      )
      .notEmpty()
      .withMessage(
        'Version number is required'
      )
      .toInt(),
  ],
};

/* ============================================================
   WORKSPACE VALIDATION
============================================================ */

const workspaceValidation = {
  /* ----------------------------------------------------------
     CREATE
  ---------------------------------------------------------- */

  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage(
        'Name must be between 1 and 100 characters'
      )
      .notEmpty()
      .withMessage(
        'Name is required'
      ),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage(
        'Description cannot exceed 500 characters'
      ),

    body('settings')
      .optional()
      .isObject()
      .withMessage(
        'Settings must be an object'
      ),
  ],

  /* ----------------------------------------------------------
     UPDATE
  ---------------------------------------------------------- */

  update: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage(
        'Name must be between 1 and 100 characters'
      ),

    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage(
        'Description cannot exceed 500 characters'
      ),

    body('settings')
      .optional()
      .isObject()
      .withMessage(
        'Settings must be an object'
      ),
  ],

  /* ----------------------------------------------------------
     MEMBER
  ---------------------------------------------------------- */

  member: [
    body('userId')
      .isMongoId()
      .withMessage(
        'Invalid user ID'
      )
      .notEmpty()
      .withMessage(
        'User ID is required'
      ),

    body('role')
      .optional()
      .isIn([
        'admin',
        'member',
        'viewer',
      ])
      .withMessage(
        'Invalid role. Must be admin, member, or viewer'
      ),
  ],

  /* ----------------------------------------------------------
     TRANSFER
  ---------------------------------------------------------- */

  transfer: [
    body('newOwnerId')
      .isMongoId()
      .withMessage(
        'Invalid user ID'
      )
      .notEmpty()
      .withMessage(
        'New owner ID is required'
      ),
  ],
};

/* ============================================================
   COMMON VALIDATION
============================================================ */

const commonValidation = {
  /* ----------------------------------------------------------
     GENERIC ID
  ---------------------------------------------------------- */

  id: [
    param('id')
      .isMongoId()
      .withMessage(
        'Invalid ID format'
      ),
  ],

  /* ----------------------------------------------------------
     DOCUMENT ID
  ---------------------------------------------------------- */

  documentId: [
    param('documentId')
      .isMongoId()
      .withMessage(
        'Invalid document ID'
      ),
  ],

  /* ----------------------------------------------------------
     WORKSPACE ID
  ---------------------------------------------------------- */

  workspaceId: [
    param('workspaceId')
      .isMongoId()
      .withMessage(
        'Invalid workspace ID'
      ),
  ],

  /* ----------------------------------------------------------
     USER ID
  ---------------------------------------------------------- */

  userId: [
    param('userId')
      .isMongoId()
      .withMessage(
        'Invalid user ID'
      ),
  ],

  /* ----------------------------------------------------------
     PAGINATION
  ---------------------------------------------------------- */

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage(
        'Page must be a positive integer'
      )
      .toInt(),

    query('limit')
      .optional()
      .isInt({
        min: 1,
        max: 100,
      })
      .withMessage(
        'Limit must be between 1 and 100'
      )
      .toInt(),
  ],

  /* ----------------------------------------------------------
     SEARCH
  ---------------------------------------------------------- */

  search: [
    query('search')
      .optional()
      .trim()
      .isLength({ min: 1 })
      .withMessage(
        'Search query must not be empty'
      ),
  ],
};

/* ============================================================
   CUSTOM VALIDATORS
============================================================ */

const customValidators = {
  /* ----------------------------------------------------------
     MONGODB OBJECT ID
  ---------------------------------------------------------- */

  isValidObjectId: (value) => {
    const mongoose = require('mongoose');

    return mongoose.Types.ObjectId.isValid(
      value
    );
  },

  /* ----------------------------------------------------------
     JSON
  ---------------------------------------------------------- */

  isValidJSON: (value) => {
    if (typeof value !== 'string') {
      return false;
    }

    try {
      JSON.parse(value);
      return true;
    } catch {
      return false;
    }
  },

  /* ----------------------------------------------------------
     URL
  ---------------------------------------------------------- */

  isValidURL: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /* ----------------------------------------------------------
     EMAIL
  ---------------------------------------------------------- */

  isValidEmail: (value) => {
    if (typeof value !== 'string') {
      return false;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(value);
  },

  /* ----------------------------------------------------------
     PHONE
  ---------------------------------------------------------- */

  isValidPhone: (value) => {
    if (typeof value !== 'string') {
      return false;
    }

    const phoneRegex =
      /^\+?[\d\s-]{10,}$/;

    return phoneRegex.test(value);
  },

  /* ----------------------------------------------------------
     NON-EMPTY ARRAY
  ---------------------------------------------------------- */

  isNonEmptyArray: (value) => {
    return (
      Array.isArray(value) &&
      value.length > 0
    );
  },
};

/* ============================================================
   VALIDATION HELPERS
============================================================ */

const createValidationChain = (rules) => {
  return [...rules, validate];
};

const validateQuery = (rules) => {
  return [
    query(rules),
    validate,
  ];
};

const validateBody = (rules) => {
  return [
    body(rules),
    validate,
  ];
};

const validateParams = (rules) => {
  return [
    param(rules),
    validate,
  ];
};

/* ============================================================
   EXPORTS
============================================================ */

module.exports = {
  validate,

  userValidation,

  documentValidation,

  workspaceValidation,

  commonValidation,

  customValidators,

  createValidationChain,

  validateQuery,

  validateBody,

  validateParams,
};