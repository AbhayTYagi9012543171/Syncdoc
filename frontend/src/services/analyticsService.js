import api, { getApiErrorMessage, getResponseData } from "./api";

const analyticsService = {
  async get(days = 30, options = {}) {
    const parsedDays = Number(days);
    if (!Number.isFinite(parsedDays) || parsedDays < 1) {
      throw new Error("Analytics range must be at least one day.");
    }
    try {
      const response = await api.get("/analytics", {
        params: { days: Math.min(Math.floor(parsedDays), 365) },
        signal: options.signal,
      });
      return getResponseData(response, null);
    } catch (error) {
      error.analyticsMessage = getApiErrorMessage(error, "Unable to load analytics.");
      throw error;
    }
  },
};

export default analyticsService;
