
import api from "./api";

const ALLOWED_THEMES = new Set(["light", "dark", "system"]);

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

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null;
}

function isPlainObject(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function pickAllowed(source, allowedKeys) {
  const result = {};

  for (const key of allowedKeys) {
    if (
      Object.prototype.hasOwnProperty.call(source, key) &&
      source[key] !== undefined
    ) {
      result[key] = source[key];
    }
  }

  return result;
}

function normalizePreferences(value = {}) {
  if (!isPlainObject(value)) {
    return {
      theme: "system",
      compactMode: false,
      reducedMotion: false,
      fontSize: 16,
      autosaveInterval: 30000,
    };
  }

  return {
    theme: ALLOWED_THEMES.has(value.theme) ? value.theme : "system",
    compactMode:
      typeof value.compactMode === "boolean"
        ? value.compactMode
        : false,
    reducedMotion:
      typeof value.reducedMotion === "boolean"
        ? value.reducedMotion
        : false,
    fontSize:
      Number.isInteger(value.fontSize) &&
      value.fontSize >= 12 &&
      value.fontSize <= 24
        ? value.fontSize
        : 16,
    autosaveInterval:
      Number.isInteger(value.autosaveInterval) &&
      value.autosaveInterval >= 5000 &&
      value.autosaveInterval <= 60000
        ? value.autosaveInterval
        : 30000,
  };
}

function normalizeNotifications(value = {}) {
  const defaults = {
    email: true,
    mentions: true,
    documentUpdates: true,
    workspaceActivity: true,
  };

  if (!isPlainObject(value)) {
    return defaults;
  }

  return Object.fromEntries(
    NOTIFICATION_KEYS.map((key) => [
      key,
      typeof value[key] === "boolean" ? value[key] : defaults[key],
    ])
  );
}

function attachUserMessage(error, fallback) {
  if (error?.response?.data?.message) {
    error.userMessage = error.response.data.message;
  } else if (error?.response?.data?.error) {
    error.userMessage = error.response.data.error;
  } else {
    error.userMessage = error?.message || fallback;
  }

  return error;
}

const settingsService = {
  async get() {
    try {
      const result = unwrap(await api.get("/settings"));

      // Support both { preferences, notifications } and older
      // responses wrapped in { data: { preferences, notifications } }.
      const data = result?.data ?? result ?? {};

      return {
        ...data,
        preferences: normalizePreferences(data.preferences),
        notifications: normalizeNotifications(data.notifications),
      };
    } catch (error) {
      throw attachUserMessage(error, "Unable to load settings.");
    }
  },

  async update(payload = {}) {
    if (!isPlainObject(payload)) {
      throw new Error("Settings payload must be an object.");
    }

    const body = {};

    if (payload.preferences !== undefined) {
      if (!isPlainObject(payload.preferences)) {
        throw new Error("Appearance preferences must be an object.");
      }

      body.preferences = pickAllowed(
        payload.preferences,
        PREFERENCE_KEYS
      );

      if (Object.keys(body.preferences).length === 0) {
        throw new Error("No supported appearance preferences were provided.");
      }
    }

    if (payload.notifications !== undefined) {
      if (!isPlainObject(payload.notifications)) {
        throw new Error("Notification preferences must be an object.");
      }

      body.notifications = pickAllowed(
        payload.notifications,
        NOTIFICATION_KEYS
      );

      if (Object.keys(body.notifications).length === 0) {
        throw new Error("No supported notification preferences were provided.");
      }
    }

    if (Object.keys(body).length === 0) {
      throw new Error("No settings were provided.");
    }

    try {
      const result = unwrap(await api.patch("/settings", body));
      const data = result?.data ?? result ?? {};

      return {
        ...data,
        preferences: normalizePreferences(data.preferences),
        notifications: normalizeNotifications(data.notifications),
      };
    } catch (error) {
      throw attachUserMessage(error, "Unable to save settings.");
    }
  },
};

export default settingsService;
