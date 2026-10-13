import api, { getResponseData } from "./api";

const BASE_PATH = "/settings";

const settingsService = {
  async get() {
    const response = await api.get(BASE_PATH);
    return getResponseData(response, {
      preferences: {},
      notifications: {},
    });
  },

  async update({ preferences = {}, notifications = {} } = {}) {
    const response = await api.put(BASE_PATH, {
      preferences,
      notifications,
    });
    return getResponseData(response, null);
  },
};

export default settingsService;
