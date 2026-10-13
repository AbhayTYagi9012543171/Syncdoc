// src/models/User.js

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
      maxlength: [50, 'Display name cannot exceed 50 characters'],
    },

    avatar: {
      type: String,
      default: null,
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
      email: { type: Boolean, default: true },
      mentions: { type: Boolean, default: true },
      documentUpdates: { type: Boolean, default: true },
      workspaceActivity: { type: Boolean, default: true },
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
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

UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ 'activeSessions.documentId': 1 });
UserSchema.index({ role: 1 });

// ============================================================
// PRE-SAVE HOOK
// ============================================================

UserSchema.pre('save', async function (next) {
  try {
    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);

    this.password = await bcrypt.hash(this.password, salt);
    this.updatedAt = new Date();

    next();
  } catch (error) {
    next(error);
  }
});

// ============================================================
// PRE FIND-ONE-AND-UPDATE
// ============================================================

UserSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

// ============================================================
// VIRTUALS
// ============================================================

UserSchema.virtual('isOnline').get(function () {
  const sessions = this.activeSessions || [];

  return sessions.length > 0;
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
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.methods.generateAuthToken = function () {
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
  return jwt.sign(
    {
      id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET,
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

UserSchema.methods.updateSession = function (socketId, data) {
  if (!Array.isArray(this.activeSessions)) {
    this.activeSessions = [];
  }

  const session = this.activeSessions.find(
    (item) => item.socketId === socketId
  );

  if (session) {
    Object.assign(session, data);
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

  return user;
};

// ============================================================
// STATIC METHODS
// ============================================================

UserSchema.statics.findByCredentials = async function (
  email,
  password
) {
  const user = await this.findOne({ email }).select('+password');

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
  const user = await this.findOne({ email });

  return !!user;
};

UserSchema.statics.isUsernameTaken = async function (username) {
  const user = await this.findOne({ username });

  return !!user;
};

// ============================================================
// MODEL
// ============================================================

module.exports = mongoose.model('User', UserSchema);