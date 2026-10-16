
const User = require("../models/User");

const DEFAULT_PREFERENCES = {
  theme: "system",
  compactMode: false,
  reducedMotion: false,
  fontSize: 16,
  autosaveInterval: 30000,
};

const DEFAULT_NOTIFICATIONS = {
  email: true,
  mentions: true,
  documentUpdates: true,
  workspaceActivity: true,
};

const THEMES = new Set(["light", "dark", "system"]);

const PREFERENCE_KEYS = [
  "theme",
  "compactMode",
  "reducedMotion",
  "fontSize",
  "autosaveInterval",
];

const NOTIFICATION_KEYS = [
  "email",
  "mentions",
  "documentUpdates",
  "workspaceActivity",
];

function userIdFrom(req) {
  return req.user?._id || req.user?.id || req.userId || null;
}

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function plain(value) {
  return value?.toObject?.() || value || {};
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function serialize(user) {
  const preferences = plain(user.preferences);
  const notifications = plain(user.notificationPreferences);

  return {
    preferences: {
      ...DEFAULT_PREFERENCES,
      ...preferences,
    },
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      ...notifications,
    },
  };
}

function validatePreferences(preferences, updates) {
  if (!isPlainObject(preferences)) {
    return "preferences must be an object.";
  }

  if (Object.keys(preferences).some(
    (key) => !PREFERENCE_KEYS.includes(key)
  )) {
    return "Unsupported appearance preference.";
  }

  if (preferences.theme !== undefined) {
    if (
      typeof preferences.theme !== "string" ||
      !THEMES.has(preferences.theme)
    ) {
      return "Theme must be light, dark, or system.";
    }

    updates["preferences.theme"] = preferences.theme;
  }

  for (const key of ["compactMode", "reducedMotion"]) {
    if (preferences[key] !== undefined) {
      if (typeof preferences[key] !== "boolean") {
        return `preferences.${key} must be boolean.`;
      }

      updates[`preferences.${key}`] = preferences[key];
    }
  }

  if (preferences.fontSize !== undefined) {
    const value = preferences.fontSize;

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 12 ||
      value > 24
    ) {
      return "preferences.fontSize must be an integer from 12 to 24.";
    }

    updates["preferences.fontSize"] = value;
  }

  if (preferences.autosaveInterval !== undefined) {
    const value = preferences.autosaveInterval;

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 5000 ||
      value > 60000
    ) {
      return "preferences.autosaveInterval must be between 5000 and 60000 milliseconds.";
    }

    updates["preferences.autosaveInterval"] = value;
  }

  return null;
}

function validateNotifications(notifications, updates) {
  if (!isPlainObject(notifications)) {
    return "notifications must be an object.";
  }

  if (Object.keys(notifications).some(
    (key) => !NOTIFICATION_KEYS.includes(key)
  )) {
    return "Unsupported notification preference.";
  }

  for (const key of NOTIFICATION_KEYS) {
    if (notifications[key] !== undefined) {
      if (typeof notifications[key] !== "boolean") {
        return `notifications.${key} must be boolean.`;
      }

      updates[`notificationPreferences.${key}`] =
        notifications[key];
    }
  }

  return null;
}

exports.getSettings = async (req, res, next) => {
  try {
    const id = userIdFrom(req);

    if (!id) {
      return fail(res, 401, "Authentication required.");
    }

    const user = await User.findOne({
      _id: id,
      deletedAt: null,
    }).select("preferences notificationPreferences");

    if (!user) {
      return fail(res, 404, "Account not found.");
    }

    return res.status(200).json({
      success: true,
      data: serialize(user),
    });
  } catch (error) {
    return next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const id = userIdFrom(req);

    if (!id) {
      return fail(res, 401, "Authentication required.");
    }

    const body = req.body;

    if (!isPlainObject(body)) {
      return fail(res, 400, "Request body must be an object.");
    }

    const allowedSections = ["preferences", "notifications"];

    if (
      Object.keys(body).some(
        (key) => !allowedSections.includes(key)
      )
    ) {
      return fail(res, 400, "Unsupported settings field.");
    }

    const updates = {};

    if (body.preferences !== undefined) {
      const error = validatePreferences(body.preferences, updates);

      if (error) {
        return fail(res, 400, error);
      }
    }

    if (body.notifications !== undefined) {
      const error = validateNotifications(body.notifications, updates);

      if (error) {
        return fail(res, 400, error);
      }
    }

    if (Object.keys(updates).length === 0) {
      return fail(res, 400, "No valid settings were provided.");
    }

    updates.updatedAt = new Date();

    const user = await User.findOneAndUpdate(
      {
        _id: id,
        deletedAt: null,
      },
      {
        $set: updates,
      },
      {
        new: true,
        runValidators: true,
        select: "preferences notificationPreferences",
      }
    );

    if (!user) {
      return fail(res, 404, "Account not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Settings saved successfully.",
      data: serialize(user),
    });
  } catch (error) {
    return next(error);
  }
};
