import api, { getApiErrorMessage, getResponseData } from "./api";

const SYSTEM_PATH = "/system";

const systemService = {
  async health(options = {}) {
    try {
      const response = await api.get(`${SYSTEM_PATH}/health`, { signal: options.signal });
      return getResponseData(response, null);
    } catch (error) {
      error.systemMessage = getApiErrorMessage(error, "Unable to check API health.");
      throw error;
    }
  },

  async status(options = {}) {
    try {
      const response = await api.get(`${SYSTEM_PATH}/status`, { signal: options.signal });
      return getResponseData(response, null);
    } catch (error) {
      error.systemMessage = getApiErrorMessage(error, "Unable to load system status.");
      throw error;
    }
  },

  async readiness(options = {}) {
    try {
      const response = await api.get(`${SYSTEM_PATH}/ready`, { signal: options.signal });
      return getResponseData(response, null);
    } catch (error) {
      error.systemMessage = getApiErrorMessage(error, "The service is not ready.");
      throw error;
    }
  },
};

export default systemService;
