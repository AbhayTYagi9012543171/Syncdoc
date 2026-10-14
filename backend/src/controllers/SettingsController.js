const User = require("../models/User");

const DEFAULT_PREFERENCES = { theme: "system", compactMode: false, reducedMotion: false };
const DEFAULT_NOTIFICATIONS = { email: true, mentions: true, documentUpdates: true, workspaceActivity: true };
const THEMES = new Set(["light", "dark", "system"]);

const userIdFrom = (req) => req.user?._id || req.user?.id || req.userId || null;
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const plain = (value) => value?.toObject?.() || value || {};

function serialize(user) {
  return {
    preferences: { ...DEFAULT_PREFERENCES, ...plain(user.preferences) },
    notifications: { ...DEFAULT_NOTIFICATIONS, ...plain(user.notificationPreferences) },
  };
}

exports.getSettings = async (req, res, next) => {
  try {
    const id = userIdFrom(req);
    if (!id) return fail(res, 401, "Authentication required.");
    const user = await User.findOne({ _id: id, deletedAt: null }).select("preferences notificationPreferences");
    if (!user) return fail(res, 404, "Account not found.");
    return res.json({ success: true, data: serialize(user) });
  } catch (error) { return next(error); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const id = userIdFrom(req);
    if (!id) return fail(res, 401, "Authentication required.");
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return fail(res, 400, "Request body must be an object.");
    if (Object.keys(body).some((key) => !["preferences", "notifications"].includes(key))) {
      return fail(res, 400, "Unsupported settings field.");
    }

    const updates = {};
    if (body.preferences !== undefined) {
      const p = body.preferences;
      if (!p || typeof p !== "object" || Array.isArray(p)) return fail(res, 400, "preferences must be an object.");
      const allowed = ["theme", "compactMode", "reducedMotion"];
      if (Object.keys(p).some((key) => !allowed.includes(key))) return fail(res, 400, "Unsupported appearance preference.");
      if (p.theme !== undefined) {
        if (!THEMES.has(p.theme)) return fail(res, 400, "Theme must be light, dark, or system.");
        updates["preferences.theme"] = p.theme;
      }
      for (const key of ["compactMode", "reducedMotion"]) {
        if (p[key] !== undefined) {
          if (typeof p[key] !== "boolean") return fail(res, 400, `preferences.${key} must be boolean.`);
          updates[`preferences.${key}`] = p[key];
        }
      }
    }

    if (body.notifications !== undefined) {
      const n = body.notifications;
      const allowed = ["email", "mentions", "documentUpdates", "workspaceActivity"];
      if (!n || typeof n !== "object" || Array.isArray(n)) return fail(res, 400, "notifications must be an object.");
      if (Object.keys(n).some((key) => !allowed.includes(key))) return fail(res, 400, "Unsupported notification preference.");
      for (const key of allowed) {
        if (n[key] !== undefined) {
          if (typeof n[key] !== "boolean") return fail(res, 400, `notifications.${key} must be boolean.`);
          updates[`notificationPreferences.${key}`] = n[key];
        }
      }
    }

    if (!Object.keys(updates).length) return fail(res, 400, "No valid settings were provided.");
    const user = await User.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { $set: { ...updates, updatedAt: new Date() } },
      { new: true, runValidators: true, projection: "preferences notificationPreferences" }
    );
    if (!user) return fail(res, 404, "Account not found.");
    return res.json({ success: true, message: "Settings saved.", data: serialize(user) });
  } catch (error) { return next(error); }
};
