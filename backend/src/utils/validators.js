const Joi = require('joi');
const mongoose = require('mongoose');

/**
 * Validators utility for the application
 * Provides validation functions for various data types
 */
class Validators {
  /**
   * User validators
   */
  static user = {
    /**
     * Validate user registration data
     */
    register: (data) => {
      const schema = Joi.object({
        username: Joi.string()
          .alphanum()
          .min(3)
          .max(30)
          .required()
          .messages({
            'string.alphanum': 'Username can only contain letters and numbers',
            'string.min': 'Username must be at least 3 characters long',
            'string.max': 'Username cannot exceed 30 characters',
            'any.required': 'Username is required',
          }),
        email: Joi.string()
          .email()
          .required()
          .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
          }),
        password: Joi.string()
          .min(8)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
          .required()
          .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'Password is required',
          }),
        displayName: Joi.string()
          .max(50)
          .optional()
          .messages({
            'string.max': 'Display name cannot exceed 50 characters',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate user login data
     */
    login: (data) => {
      const schema = Joi.object({
        email: Joi.string()
          .email()
          .required()
          .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
          }),
        password: Joi.string()
          .required()
          .messages({
            'any.required': 'Password is required',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate user update data
     */
    update: (data) => {
      const schema = Joi.object({
        displayName: Joi.string()
          .max(50)
          .optional()
          .messages({
            'string.max': 'Display name cannot exceed 50 characters',
          }),
        avatar: Joi.string()
          .uri()
          .optional()
          .messages({
            'string.uri': 'Avatar must be a valid URL',
          }),
        preferences: Joi.object({
          theme: Joi.string()
            .valid('light', 'dark', 'system')
            .optional(),
          fontSize: Joi.number()
            .min(12)
            .max(24)
            .optional(),
          autosaveInterval: Joi.number()
            .min(5000)
            .max(60000)
            .optional(),
        }).optional(),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate password update
     */
    updatePassword: (data) => {
      const schema = Joi.object({
        currentPassword: Joi.string()
          .required()
          .messages({
            'any.required': 'Current password is required',
          }),
        newPassword: Joi.string()
          .min(8)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
          .required()
          .messages({
            'string.min': 'New password must be at least 8 characters long',
            'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'New password is required',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate forgot password
     */
    forgotPassword: (data) => {
      const schema = Joi.object({
        email: Joi.string()
          .email()
          .required()
          .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate reset password
     */
    resetPassword: (data) => {
      const schema = Joi.object({
        token: Joi.string()
          .required()
          .messages({
            'any.required': 'Reset token is required',
          }),
        newPassword: Joi.string()
          .min(8)
          .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
          .required()
          .messages({
            'string.min': 'New password must be at least 8 characters long',
            'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
            'any.required': 'New password is required',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },
  };

  /**
   * Document validators
   */
  static document = {
    /**
     * Validate document creation
     */
    create: (data) => {
      const schema = Joi.object({
        title: Joi.string()
          .min(1)
          .max(200)
          .required()
          .messages({
            'string.min': 'Title must be at least 1 character long',
            'string.max': 'Title cannot exceed 200 characters',
            'any.required': 'Title is required',
          }),
        workspaceId: Joi.string()
          .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
              return helpers.error('any.invalid');
            }
            return value;
          })
          .required()
          .messages({
            'any.invalid': 'Invalid workspace ID',
            'any.required': 'Workspace ID is required',
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters',
          }),
        ast: Joi.array()
          .optional()
          .messages({
            'array.base': 'AST must be an array',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate document update
     */
    update: (data) => {
      const schema = Joi.object({
        title: Joi.string()
          .min(1)
          .max(200)
          .optional()
          .messages({
            'string.min': 'Title must be at least 1 character long',
            'string.max': 'Title cannot exceed 200 characters',
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters',
          }),
        ast: Joi.array()
          .optional()
          .messages({
            'array.base': 'AST must be an array',
          }),
        version: Joi.number()
          .integer()
          .min(0)
          .optional()
          .messages({
            'number.base': 'Version must be a number',
            'number.integer': 'Version must be an integer',
            'number.min': 'Version must be at least 0',
          }),
        status: Joi.string()
          .valid('draft', 'review', 'published', 'archived')
          .optional()
          .messages({
            'any.only': 'Invalid status value',
          }),
        settings: Joi.object()
          .optional()
          .messages({
            'object.base': 'Settings must be an object',
          }),
        tags: Joi.array()
          .items(Joi.string().trim())
          .optional()
          .messages({
            'array.base': 'Tags must be an array',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate collaborator operation
     */
    collaborator: (data) => {
      const schema = Joi.object({
        userId: Joi.string()
          .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
              return helpers.error('any.invalid');
            }
            return value;
          })
          .required()
          .messages({
            'any.invalid': 'Invalid user ID',
            'any.required': 'User ID is required',
          }),
        role: Joi.string()
          .valid('viewer', 'editor', 'admin')
          .optional()
          .messages({
            'any.only': 'Invalid role. Must be viewer, editor, or admin',
          }),
        permissions: Joi.array()
          .items(Joi.string().valid('read', 'write', 'comment', 'share', 'delete'))
          .optional()
          .messages({
            'array.base': 'Permissions must be an array',
            'array.includes': 'Invalid permission value',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate version restore
     */
    restore: (data) => {
      const schema = Joi.object({
        versionNumber: Joi.number()
          .integer()
          .min(0)
          .required()
          .messages({
            'number.base': 'Version number must be a number',
            'number.integer': 'Version number must be an integer',
            'number.min': 'Version number must be at least 0',
            'any.required': 'Version number is required',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },
  };

  /**
   * Workspace validators
   */
  static workspace = {
    /**
     * Validate workspace creation
     */
    create: (data) => {
      const schema = Joi.object({
        name: Joi.string()
          .min(1)
          .max(100)
          .required()
          .messages({
            'string.min': 'Name must be at least 1 character long',
            'string.max': 'Name cannot exceed 100 characters',
            'any.required': 'Name is required',
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters',
          }),
        settings: Joi.object()
          .optional()
          .messages({
            'object.base': 'Settings must be an object',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate workspace update
     */
    update: (data) => {
      const schema = Joi.object({
        name: Joi.string()
          .min(1)
          .max(100)
          .optional()
          .messages({
            'string.min': 'Name must be at least 1 character long',
            'string.max': 'Name cannot exceed 100 characters',
          }),
        description: Joi.string()
          .max(500)
          .optional()
          .messages({
            'string.max': 'Description cannot exceed 500 characters',
          }),
        settings: Joi.object()
          .optional()
          .messages({
            'object.base': 'Settings must be an object',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate workspace member
     */
    member: (data) => {
      const schema = Joi.object({
        userId: Joi.string()
          .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
              return helpers.error('any.invalid');
            }
            return value;
          })
          .required()
          .messages({
            'any.invalid': 'Invalid user ID',
            'any.required': 'User ID is required',
          }),
        role: Joi.string()
          .valid('admin', 'member', 'viewer')
          .optional()
          .messages({
            'any.only': 'Invalid role. Must be admin, member, or viewer',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },

    /**
     * Validate ownership transfer
     */
    transfer: (data) => {
      const schema = Joi.object({
        newOwnerId: Joi.string()
          .custom((value, helpers) => {
            if (!mongoose.Types.ObjectId.isValid(value)) {
              return helpers.error('any.invalid');
            }
            return value;
          })
          .required()
          .messages({
            'any.invalid': 'Invalid user ID',
            'any.required': 'New owner ID is required',
          }),
      });

      return schema.validate(data, { abortEarly: false });
    },
  };

  /**
   * Common validators
   */
  static common = {
    /**
     * Validate MongoDB ObjectId
     */
    objectId: (value) => {
      return mongoose.Types.ObjectId.isValid(value);
    },

    /**
     * Validate email
     */
    email: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    },

    /**
     * Validate URL
     */
    url: (value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Validate phone number
     */
    phone: (value) => {
      const phoneRegex = /^\+?[\d\s-]{10,}$/;
      return phoneRegex.test(value);
    },

    /**
     * Validate slug
     */
    slug: (value) => {
      const slugRegex = /^[a-z0-9-]+$/;
      return slugRegex.test(value);
    },

    /**
     * Validate hex color
     */
    hexColor: (value) => {
      const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
      return hexRegex.test(value);
    },

    /**
     * Validate UUID
     */
    uuid: (value) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    },

    /**
     * Validate password strength
     */
    passwordStrength: (password) => {
      const criteria = {
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /\d/.test(password),
        hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      };

      const score = Object.values(criteria).filter(Boolean).length;
      
      return {
        score,
        criteria,
        isStrong: score >= 4,
        isModerate: score >= 3,
        isWeak: score < 3,
      };
    },

    /**
     * Validate date
     */
    date: (value) => {
      const date = new Date(value);
      return date instanceof Date && !isNaN(date);
    },

    /**
     * Validate age (minimum age)
     */
    age: (value, minAge = 18) => {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= minAge;
    },
  };

  /**
   * Custom validators
   */
  static custom = {
    /**
     * Check if value is not empty
     */
    notEmpty: (value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === 'string') return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === 'object') return Object.keys(value).length > 0;
      return true;
    },

    /**
     * Check if value is a valid JSON
     */
    isValidJson: (value) => {
      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    },

    /**
     * Check if array has unique values
     */
    arrayUnique: (array) => {
      return array.length === new Set(array).size;
    },

    /**
     * Check if value is in allowed range
     */
    inRange: (value, min, max) => {
      return value >= min && value <= max;
    },

    /**
     * Check if string contains only allowed characters
     */
    allowedChars: (value, allowedRegex) => {
      return allowedRegex.test(value);
    },
  };

  /**
   * Validate with custom error messages
   */
  static validateWithMessages = (schema, data, messages = {}) => {
    const result = schema.validate(data, { abortEarly: false, messages });
    if (result.error) {
      const errors = result.error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));
      return { valid: false, errors };
    }
    return { valid: true, value: result.value };
  };

  /**
   * Sanitize user input
   */
  static sanitize = {
    /**
     * Escape HTML
     */
    escapeHtml: (value) => {
      if (!value) return value;
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      };
      return String(value).replace(/[&<>"']/g, (m) => map[m]);
    },

    /**
     * Trim string
     */
    trim: (value) => {
      if (typeof value === 'string') {
        return value.trim();
      }
      return value;
    },

    /**
     * Lowercase string
     */
    toLowerCase: (value) => {
      if (typeof value === 'string') {
        return value.toLowerCase();
      }
      return value;
    },

    /**
     * Uppercase string
     */
    toUpperCase: (value) => {
      if (typeof value === 'string') {
        return value.toUpperCase();
      }
      return value;
    },

    /**
     * Remove special characters
     */
    removeSpecialChars: (value) => {
      if (typeof value === 'string') {
        return value.replace(/[^\w\s-]/g, '');
      }
      return value;
    },

    /**
     * Normalize email
     */
    normalizeEmail: (value) => {
      if (typeof value === 'string') {
        return value.toLowerCase().trim();
      }
      return value;
    },
  };

  /**
   * Get validation error summary
   */
  static getErrorSummary(error) {
    if (!error) return null;
    
    if (error.details) {
      return error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
        value: detail.context?.value,
      }));
    }
    
    if (error.errors) {
      return Object.entries(error.errors).map(([field, err]) => ({
        field,
        message: err.message,
        type: err.kind,
        value: err.value,
      }));
    }
    
    return [{
      field: 'general',
      message: error.message || 'Validation error',
      type: 'general',
    }];
  }

  /**
   * Check if validation passed
   */
  static isValid(result) {
    return result && (result.valid || !result.error);
  }

  /**
   * Get validation errors as object
   */
  static getErrorsAsObject(result) {
    if (!result.error) return null;
    
    const errors = {};
    result.error.details.forEach((detail) => {
      const path = detail.path.join('.');
      if (!errors[path]) {
        errors[path] = [];
      }
      errors[path].push(detail.message);
    });
    return errors;
  }
}

module.exports = Validators;