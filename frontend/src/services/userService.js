import api, { getApiErrorMessage, getResponseData } from "./api";

const BASE_PATH = "/users";

function requireId(id, label = "User ID") {
  if (id === undefined || id === null || String(id).trim() === "") {
    throw new Error(`${label} is required.`);
  }
  return encodeURIComponent(String(id).trim());
}

function normalizeParams(params = {}) {
  if (!params || typeof params !== "object" || Array.isArray(params)) return {};
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== "")
  );
}

async function request(action, fallbackMessage) {
  try {
    return await action();
  } catch (error) {
    error.userMessage = getApiErrorMessage(error, fallbackMessage);
    throw error;
  }
}

const userService = {
  async list(params = {}) {
    return request(async () => {
      const response = await api.get(BASE_PATH, { params: normalizeParams(params) });
      const data = getResponseData(response, {});
      if (Array.isArray(data)) return { users: data, pagination: {} };
      return {
        ...data,
        users: Array.isArray(data?.users) ? data.users : [],
        pagination: data?.pagination || {},
      };
    }, "Unable to load users.");
  },

  async get(id) {
    const userId = requireId(id);
    return request(async () => {
      const response = await api.get(`${BASE_PATH}/${userId}`);
      return getResponseData(response, null);
    }, "Unable to load this user.");
  },

  async stats() {
    return request(async () => {
      const response = await api.get(`${BASE_PATH}/stats`);
      return getResponseData(response, null);
    }, "Unable to load user statistics.");
  },

  async updateRole(id, role) {
    const userId = requireId(id);
    if (typeof role !== "string" || !role.trim()) {
      throw new Error("A user role is required.");
    }
    return request(async () => {
      const response = await api.put(`${BASE_PATH}/${userId}/role`, { role: role.trim() });
      return getResponseData(response, null);
    }, "Unable to update the user role.");
  },
};

export default userService;
