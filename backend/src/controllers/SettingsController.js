'use strict';

const { ok } = require('../utils/apiResponse');

const ALLOWED_THEMES = new Set(['light', 'dark', 'system']);

function sanitizePreferences(input = {}) {
  const preferences = {};

  if (ALLOWED_THEMES.has(input.theme)) preferences.theme = input.theme;
  if (typeof input.compactMode === 'boolean') preferences.compactMode = input.compactMode;
  if (typeof input.reducedMotion === 'boolean') preferences.reducedMotion = input.reducedMotion;
  if (Number.isFinite(Number(input.fontSize))) preferences.fontSize = Math.min(24, Math.max(12, Number(input.fontSize)));
  if (Number.isFinite(Number(input.autosaveInterval))) preferences.autosaveInterval = Math.min(60000, Math.max(5000, Number(input.autosaveInterval)));

  return preferences;
}

const SettingsController = {
  async get(req, res, next) {
    try {
      return ok(res, {
        preferences: req.user.preferences || {},
        notifications: req.user.notificationPreferences || {},
      });
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const user = req.user;
      const preferences = sanitizePreferences(req.body.preferences || req.body);

      user.preferences = { ...(user.preferences?.toObject?.() || user.preferences || {}), ...preferences };

      if (req.body.notifications && typeof req.body.notifications === 'object') {
        const allowed = ['email', 'mentions', 'documentUpdates', 'workspaceActivity'];
        const current = user.notificationPreferences?.toObject?.() || user.notificationPreferences || {};
        user.notificationPreferences = {
          ...current,
          ...Object.fromEntries(allowed
            .filter((key) => typeof req.body.notifications[key] === 'boolean')
            .map((key) => [key, req.body.notifications[key]])),
        };
      }

      await user.save();

      return ok(res, {
        preferences: user.preferences,
        notifications: user.notificationPreferences,
      }, { message: 'Settings updated successfully.' });
    } catch (error) {
      next(error);
    }
  },
};

module.exports = SettingsController;
