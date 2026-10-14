
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [
        /^[a-zA-Z0-9_]+$/,
        'Username can only contain letters, numbers, and underscores',
      ],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\S+@\S+\.\S+$/,
        'Please provide a valid email address',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },

    displayName: {
      type: String,
      required: [true, 'Display name is required'],
      trim: true,
      minlength: [2, 'Display name must be at least 2 characters'],
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },

    // Profile photo URL or relative URL.
    // Uploaded photo files are managed by ProfileController.
    avatar: {
      type: String,
      default: null,
      trim: true,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },

    role: {
      type: String,
      enum: ['admin', 'user', 'guest'],
      default: 'user',
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
      default: null,
    },

    activeSessions: {
      type: [
        {
          socketId: {
            type: String,
            required: true,
          },

          documentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Document',
            default: null,
          },

          cursor: {
            row: Number,
            column: Number,
            nodeId: String,
          },

          lastActive: {
            type: Date,
            default: Date.now,
          },

          ipAddress: {
            type: String,
            default: null,
          },

          userAgent: {
            type: String,
            default: null,
          },
        },
      ],
      default: [],
    },

    preferences: {
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },

      compactMode: {
        type: Boolean,
        default: false,
      },

      reducedMotion: {
        type: Boolean,
        default: false,
      },

      fontSize: {
        type: Number,
        min: 12,
        max: 24,
        default: 16,
      },

      autosaveInterval: {
        type: Number,
        min: 5000,
        max: 60000,
        default: 30000,
      },
    },

    notificationPreferences: {
      email: {
        type: Boolean,
        default: true,
      },
      mentions: {
        type: Boolean,
        default: true,
      },
      documentUpdates: {
        type: Boolean,
        default: true,
      },
      workspaceActivity: {
        type: Boolean,
        default: true,
      },
    },

    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,

    toJSON: {
      virtuals: true,
    },

    toObject: {
      virtuals: true,
    },
  }
);

// ============================================================
// INDEXES
// ============================================================

// `unique: true` already creates unique indexes for these fields.
// Do not add duplicate non-unique indexes for the same fields.

UserSchema.index({ 'activeSessions.documentId': 1 });
UserSchema.index({ role: 1 });

// ============================================================
// PRE-SAVE HOOK: PASSWORD HASHING
// ============================================================

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ============================================================
// PRE-UPDATE HOOK
// ============================================================

UserSchema.pre('findOneAndUpdate', function () {
  this.set({ updatedAt: new Date() });
});

// ============================================================
// VIRTUALS
// ============================================================

UserSchema.virtual('isOnline').get(function () {
  return Array.isArray(this.activeSessions) &&
    this.activeSessions.length > 0;
});

UserSchema.virtual('documentCount', {
  ref: 'Document',
  localField: '_id',
  foreignField: 'owner',
  count: true,
});

// ============================================================
// INSTANCE METHODS
// ============================================================

UserSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) {
    throw new Error(
      'Password is not selected. Query the user with .select("+password").'
    );
  }

  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function () {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }

  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRY || '7d',
    }
  );
};

UserSchema.methods.generateRefreshToken = function () {
  const secret =
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('Refresh token signing secret is not configured.');
  }

  return jwt.sign(
    {
      id: this._id,
    },
    secret,
    {
      expiresIn: '30d',
    }
  );
};

// ============================================================
// SESSION METHODS
// ============================================================

UserSchema.methods.addSession = function (
  socketId,
  documentId = null,
  ipAddress = null,
  userAgent = null
) {
  if (!Array.isArray(this.activeSessions)) {
    this.activeSessions = [];
  }

  this.activeSessions.push({
    socketId,
    documentId,
    ipAddress,
    userAgent,
    lastActive: new Date(),
  });

  return this.save();
};

UserSchema.methods.removeSession = function (socketId) {
  if (!Array.isArray(this.activeSessions)) {
    this.activeSessions = [];
  }

  this.activeSessions = this.activeSessions.filter(
    (session) => session.socketId !== socketId
  );

  return this.save();
};

UserSchema.methods.updateSession = function (socketId, data = {}) {
  if (!Array.isArray(this.activeSessions)) {
    this.activeSessions = [];
  }

  const session = this.activeSessions.find(
    (item) => item.socketId === socketId
  );

  if (session) {
    // Only update supported session fields.
    const allowedFields = [
      'documentId',
      'cursor',
      'ipAddress',
      'userAgent',
    ];

    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        session[key] = data[key];
      }
    }

    session.lastActive = new Date();
  }

  return this.save();
};

// ============================================================
// JSON SERIALIZATION
// ============================================================

UserSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;
  delete user.activeSessions;
  delete user.__v;

  return user;
};

// ============================================================
// STATIC METHODS
// ============================================================

UserSchema.statics.findByCredentials = async function (
  email,
  password
) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  const user = await this.findOne({
    email: normalizedEmail,
    deletedAt: null,
  }).select('+password');

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    throw new Error('Invalid email or password');
  }

  return user;
};

UserSchema.statics.isEmailTaken = async function (email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  return Boolean(
    await this.exists({
      email: normalizedEmail,
      deletedAt: null,
    })
  );
};

UserSchema.statics.isUsernameTaken = async function (username) {
  const normalizedUsername = String(username || '').trim();

  return Boolean(
    await this.exists({
      username: normalizedUsername,
      deletedAt: null,
    })
  );
};

// ============================================================
// MODEL EXPORT
// ============================================================

module.exports =
  mongoose.models.User || mongoose.model('User', UserSchema);
