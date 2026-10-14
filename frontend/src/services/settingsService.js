import api from "./api";

const unwrap = (response) => response?.data?.data ?? response?.data ?? null;

const settingsService = {
  async get() {
    try {
      return unwrap(await api.get("/settings"));
    } catch (error) {
      error.userMessage = error?.response?.data?.message || error?.message || "Unable to load settings.";
      throw error;
    }
  },
  async update(payload = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Settings payload must be an object.");
    }
    const body = {};
    if (payload.preferences !== undefined) body.preferences = payload.preferences;
    if (payload.notifications !== undefined) body.notifications = payload.notifications;
    if (!Object.keys(body).length) throw new Error("No settings were provided.");
    try {
      return unwrap(await api.patch("/settings", body));
    } catch (error) {
      error.userMessage = error?.response?.data?.message || error?.message || "Unable to save settings.";
      throw error;
    }
  },
};
export default settingsService;
