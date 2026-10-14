import axios from "axios";

/* ============================================================
   SYNCDOC — API CLIENT
   Centralized Axios configuration, authentication, error
   handling and response helpers.
============================================================ */

/* ============================================================
   CONFIGURATION
============================================================ */

const DEFAULT_API_URL = "http://localhost:5000/api";

const API_URL =
  process.env.REACT_APP_API_URL?.trim() ||
  DEFAULT_API_URL;

const TOKEN_KEY = "syncdoc_token";

const REQUEST_TIMEOUT = 15000;

/* ============================================================
   AXIOS INSTANCE
============================================================ */

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
    console.warn(
      "SyncDoc: unable to read authentication token.",
      error
    );

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
    console.warn(
      "SyncDoc: unable to update authentication token.",
      error
    );
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.warn(
      "SyncDoc: unable to clear authentication token.",
      error
    );
  }
}

/* ============================================================
   REQUEST ID
============================================================ */

function createRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sd-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ============================================================
   REQUEST INTERCEPTOR
============================================================ */

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();

    /*
     * Axios headers can be represented in different forms
     * depending on the Axios version.
     */
    if (!config.headers) {
      config.headers = {};
    }

    /*
     * Multipart uploads must not inherit the instance-wide JSON header.
     * Let the browser/Axios set Content-Type with the correct boundary.
     * Without this, Multer may receive a JSON request instead of a file
     * and respond with "No file uploaded" or a 400 error.
     */
    const isFormData =
      typeof FormData !== "undefined" &&
      config.data instanceof FormData;

    if (isFormData) {
      if (typeof config.headers.delete === "function") {
        config.headers.delete("Content-Type");
      } else {
        delete config.headers["Content-Type"];
        delete config.headers["content-type"];
      }
    } else if (
      config.data &&
      typeof config.data === "object" &&
      !(config.data instanceof URLSearchParams) &&
      typeof config.data !== "string"
    ) {
      if (typeof config.headers.set === "function") {
        config.headers.set("Content-Type", "application/json");
      } else if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    /*
     * Attach JWT and a traceable request ID.
     */
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (!config.headers["X-Request-ID"]) {
      config.headers["X-Request-ID"] = createRequestId();
    }

    /*
     * Useful request metadata for debugging.
     */
    if (process.env.NODE_ENV === "development") {
      config.metadata = {
        ...(config.metadata || {}),
        startedAt: Date.now(),
      };
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

/* ============================================================
   RESPONSE INTERCEPTOR
============================================================ */

api.interceptors.response.use(
  (response) => {
    /*
     * Development-only request timing.
     */
    if (
      process.env.NODE_ENV === "development" &&
      response.config?.metadata?.startedAt
    ) {
      const duration =
        Date.now() -
        response.config.metadata.startedAt;

      console.debug(
        `SyncDoc API: ${response.config.method?.toUpperCase()} ${response.config.url} — ${duration}ms`
      );
    }

    return response;
  },

  (error) => {
    const normalizedError =
      normalizeApiError(error);

    const status =
      normalizedError?.response?.status ||
      normalizedError?.status;

    /*
     * IMPORTANT:
     *
     * Do not automatically remove the token on 401.
     *
     * AuthContext is responsible for deciding whether the
     * current session should be cleared.
     */
    if (status === 401) {
      console.warn(
        `SyncDoc API: Unauthorized request — ${error?.config?.url || "unknown endpoint"
        }`
      );
    }

    if (status === 403) {
      console.warn(
        `SyncDoc API: Forbidden request — ${error?.config?.url || "unknown endpoint"
        }`
      );
    }

    return Promise.reject(normalizedError);
  }
);

/* ============================================================
   ERROR NORMALIZATION
============================================================ */

function normalizeApiError(error) {
  /*
   * No Axios error object.
   */
  if (!error) {
    return createApiError(
      "An unexpected error occurred.",
      null,
      null,
      null
    );
  }

  /*
   * Server responded with an HTTP error.
   */
  if (error.response) {
    const responseData =
      error.response.data;

    const message =
      extractErrorMessage(responseData) ||
      error.message ||
      "Request failed.";

    error.apiMessage = message;
    error.status = error.response.status;
    error.apiData = responseData;

    return error;
  }

  /*
   * Request was created but no response arrived.
   *
   * Usually:
   * - backend is offline
   * - wrong API URL
   * - CORS/network issue
   * - connection timeout
   */
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

  /*
   * Axios/configuration error.
   */
  error.apiMessage =
    error.message ||
    "An unexpected error occurred.";

  error.status = null;
  error.apiData = null;

  return error;
}

/* ============================================================
   ERROR MESSAGE EXTRACTION
============================================================ */

function extractErrorMessage(data) {
  if (!data) {
    return null;
  }

  /*
   * String response.
   */
  if (typeof data === "string") {
    return data.trim() || null;
  }

  if (typeof data !== "object") {
    return null;
  }

  /*
   * Common backend formats:
   *
   * {
   *   message: "Invalid credentials"
   * }
   *
   * {
   *   error: "Invalid credentials"
   * }
   *
   * {
   *   error: {
   *     message: "Invalid credentials"
   *   }
   * }
   */
  const directMessage =
    data.message ||
    data.error?.message ||
    data.error ||
    data.details?.message;

  if (typeof directMessage === "string") {
    return directMessage.trim() || null;
  }

  /*
   * Validation error formats.
   */
  if (Array.isArray(data.errors)) {
    const messages = data.errors
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

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

/* ============================================================
   CREATE GENERIC API ERROR
============================================================ */

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

/* ============================================================
   RESPONSE DATA HELPER
============================================================ */

/**
 * Extract the useful payload from an Axios response.
 *
 * Supports:
 *
 * response
 * response.data
 * response.data.data
 */
export function getResponseData(
  response,
  fallback = null
) {
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

/* ============================================================
   API MESSAGE HELPER
============================================================ */

export function getApiMessage(
  response,
  fallback = ""
) {
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

/* ============================================================
   ERROR MESSAGE HELPER
============================================================ */

export function getApiErrorMessage(
  error,
  fallback = "Something went wrong. Please try again."
) {
  if (!error) {
    return fallback;
  }

  return (
    error.apiMessage ||
    extractErrorMessage(
      error.response?.data
    ) ||
    error.response?.data?.message ||
    error.message ||
    fallback
  );
}

/* ============================================================
   STATUS HELPERS
============================================================ */

export function getApiErrorStatus(error) {
  return (
    error?.status ||
    error?.response?.status ||
    null
  );
}

export function isUnauthorizedError(error) {
  return (
    getApiErrorStatus(error) === 401
  );
}

export function isForbiddenError(error) {
  return (
    getApiErrorStatus(error) === 403
  );
}

export function isNotFoundError(error) {
  return (
    getApiErrorStatus(error) === 404
  );
}

export function isValidationError(error) {
  const status =
    getApiErrorStatus(error);

  return (
    status === 400 ||
    status === 422
  );
}

export function isNetworkError(error) {
  return Boolean(
    error &&
    !error.response &&
    error.request
  );
}

/* ============================================================
   CONFIGURATION HELPERS
============================================================ */

export function getApiBaseUrl() {
  return API_URL;
}

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default api;