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
      const normalized = normalizeParams(params);

      // The backend's documented maximum page size is 100. Clamp older
      // callers (for example limit: 500) so the Admin Console does not
      // repeatedly trigger a validation 400.
      if (normalized.limit !== undefined) {
        const requestedLimit = Number(normalized.limit);
        normalized.limit = Number.isFinite(requestedLimit)
          ? Math.min(100, Math.max(1, Math.trunc(requestedLimit)))
          : 20;
      }
      if (normalized.page !== undefined) {
        const requestedPage = Number(normalized.page);
        normalized.page = Number.isFinite(requestedPage)
          ? Math.max(1, Math.trunc(requestedPage))
          : 1;
      }

      const response = await api.get(BASE_PATH, { params: normalized });
      let data = getResponseData(response, {});
      // Normalize both { users, pagination } and legacy nested { data: ... }
      // responses without assuming every deployment is on the same revision.
      for (let depth = 0; depth < 3 && data && !Array.isArray(data) && !Array.isArray(data.users) && data.data; depth += 1) {
        data = data.data;
      }
      if (Array.isArray(data)) return { users: data, pagination: {} };
      return {
        ...(data && typeof data === "object" ? data : {}),
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
