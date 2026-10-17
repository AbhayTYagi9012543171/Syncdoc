
import axios from "axios";
import config from "../config";

/* ============================================================
   SYNCDOC — CENTRALIZED API CLIENT
   ============================================================ */

const API_URL = String(config.apiUrl).replace(/\/+$/, "");
const TOKEN_KEY = config.tokenKey || "syncdoc_token";
const REQUEST_TIMEOUT = 15000;

const api = axios.create({
  baseURL: API_URL,
  timeout: REQUEST_TIMEOUT,
  withCredentials: true,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

/* ============================================================
   TOKEN HELPERS
   ============================================================ */

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.warn("SyncDoc: unable to read token.", error);
    return null;
  }
}

export function setAuthToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, String(token));
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (error) {
    console.warn("SyncDoc: unable to update token.", error);
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.warn("SyncDoc: unable to clear token.", error);
  }
}

/* ============================================================
   REQUEST ID
   ============================================================ */

function createRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `sd-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/* ============================================================
   REQUEST INTERCEPTOR
   ============================================================ */

api.interceptors.request.use(
  (requestConfig) => {
    const token = getAuthToken();

    if (!requestConfig.headers) {
      requestConfig.headers = {};
    }

    // Allow the browser/Axios to set the multipart boundary.
    const isFormData =
      typeof FormData !== "undefined" &&
      requestConfig.data instanceof FormData;

    if (isFormData) {
      if (typeof requestConfig.headers.delete === "function") {
        requestConfig.headers.delete("Content-Type");
      } else {
        delete requestConfig.headers["Content-Type"];
        delete requestConfig.headers["content-type"];
      }
    } else if (
      requestConfig.data &&
      typeof requestConfig.data === "object" &&
      !(requestConfig.data instanceof URLSearchParams)
    ) {
      if (typeof requestConfig.headers.set === "function") {
        requestConfig.headers.set(
          "Content-Type",
          "application/json"
        );
      } else {
        requestConfig.headers["Content-Type"] =
          "application/json";
      }
    }

    if (token) {
      requestConfig.headers.Authorization = `Bearer ${token}`;
    }

    if (!requestConfig.headers["X-Request-ID"]) {
      requestConfig.headers["X-Request-ID"] = createRequestId();
    }

    if (process.env.NODE_ENV === "development") {
      requestConfig.metadata = {
        ...(requestConfig.metadata || {}),
        startedAt: Date.now(),
      };
    }

    return requestConfig;
  },
  (error) => Promise.reject(error)
);

/* ============================================================
   ERROR HELPERS
   ============================================================ */

function extractErrorMessage(data) {
  if (!data) return null;

  if (typeof data === "string") {
    return data.trim() || null;
  }

  if (typeof data !== "object") {
    return null;
  }

  const directMessage =
    data.message ||
    data.error?.message ||
    data.error ||
    data.details?.message;

  if (typeof directMessage === "string") {
    return directMessage.trim() || null;
  }

  if (Array.isArray(data.errors)) {
    const messages = data.errors
      .map((item) => {
        if (typeof item === "string") return item;

        return (
          item?.message ||
          item?.msg ||
          item?.error ||
          null
        );
      })
      .filter(Boolean);

    if (messages.length) {
      return messages.join(", ");
    }
  }

  return null;
}

function createApiError(
  message,
  status = null,
  data = null,
  code = null
) {
  const error = new Error(message);

  error.apiMessage = message;
  error.status = status;
  error.apiData = data;
  error.code = code;

  return error;
}

function normalizeApiError(error) {
  if (!error) {
    return createApiError(
      "An unexpected error occurred."
    );
  }

  if (error.response) {
    error.apiMessage =
      extractErrorMessage(error.response.data) ||
      error.message ||
      "Request failed.";

    error.status = error.response.status;
    error.apiData = error.response.data;

    const retryAfterHeader = error.response.headers?.['retry-after'];
    const retryAfterBody = error.response.data?.error?.retryAfter ?? error.response.data?.retryAfter;
    const retryAfterSeconds = Number(retryAfterHeader ?? retryAfterBody);
    if (error.status === 429 && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
      error.retryAfterSeconds = Math.min(Math.ceil(retryAfterSeconds), 60 * 60);
    }

    return error;
  }

  if (error.request) {
    const isTimeout =
      error.code === "ECONNABORTED" ||
      error.code === "ETIMEDOUT";

    error.apiMessage = isTimeout
      ? "The request timed out. Please try again."
      : "Unable to connect to the SyncDoc server.";

    error.status = null;
    error.apiData = null;

    return error;
  }

  error.apiMessage =
    error.message || "An unexpected error occurred.";

  error.status = null;
  error.apiData = null;

  return error;
}

/* ============================================================
   RESPONSE INTERCEPTOR
   ============================================================ */

api.interceptors.response.use(
  (response) => {
    if (
      process.env.NODE_ENV === "development" &&
      response.config?.metadata?.startedAt
    ) {
      const duration =
        Date.now() - response.config.metadata.startedAt;

      console.debug(
        `SyncDoc API: ${response.config.method?.toUpperCase()} ` +
        `${response.config.url} — ${duration}ms`
      );
    }

    return response;
  },
  (error) => {
    const normalizedError = normalizeApiError(error);

    const status =
      normalizedError?.status ||
      normalizedError?.response?.status;

    // AuthContext remains responsible for clearing the session.
    if (status === 401) {
      console.warn(
        `SyncDoc API: Unauthorized request — ${
          error?.config?.url || "unknown endpoint"
        }`
      );
    }

    if (status === 403) {
      console.warn(
        `SyncDoc API: Forbidden request — ${
          error?.config?.url || "unknown endpoint"
        }`
      );
    }

    return Promise.reject(normalizedError);
  }
);

/* ============================================================
   RESPONSE HELPERS
   ============================================================ */

export function getResponseData(response, fallback = null) {
  if (response == null) {
    return fallback;
  }

  const body =
    response?.data !== undefined
      ? response.data
      : response;

  if (
    body &&
    typeof body === "object" &&
    body.data !== undefined
  ) {
    return body.data;
  }

  return body ?? fallback;
}

export function getApiMessage(response, fallback = "") {
  if (!response) {
    return fallback;
  }

  const data =
    response?.data !== undefined
      ? response.data
      : response;

  return (
    data?.message ||
    data?.data?.message ||
    fallback
  );
}

export function getApiErrorMessage(
  error,
  fallback = "Something went wrong. Please try again."
) {
  if (!error) {
    return fallback;
  }

  return (
    error.apiMessage ||
    extractErrorMessage(error.response?.data) ||
    error.response?.data?.message ||
    error.message ||
    fallback
  );
}

export function getApiErrorStatus(error) {
  return (
    error?.status ||
    error?.response?.status ||
    null
  );
}

export function isUnauthorizedError(error) {
  return getApiErrorStatus(error) === 401;
}

export function isForbiddenError(error) {
  return getApiErrorStatus(error) === 403;
}

export function isNotFoundError(error) {
  return getApiErrorStatus(error) === 404;
}

export function isValidationError(error) {
  const status = getApiErrorStatus(error);
  return status === 400 || status === 422;
}

export function isNetworkError(error) {
  return Boolean(
    error &&
    !error.response &&
    error.request
  );
}

export function getApiBaseUrl() {
  return API_URL;
}

export default api;
