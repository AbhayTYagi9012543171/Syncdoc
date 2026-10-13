import api, {
  clearAuthToken,
  getApiErrorMessage,
  getResponseData,
  setAuthToken,
} from "./api";

/* ============================================================
   SYNCDOC — AUTH SERVICE
   Centralized authentication API operations.
============================================================ */

/* ============================================================
   CONSTANTS
============================================================ */

const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
  REGISTER: "/auth/register",
  ME: "/auth/me",
  LOGOUT: "/auth/logout",
};

/* ============================================================
   RESPONSE HELPERS
============================================================ */

/**
 * Extract a user from common backend response formats.
 *
 * Supported:
 * {
 *   user: {...}
 * }
 *
 * {
 *   data: {
 *     user: {...}
 *   }
 * }
 *
 * {
 *   data: {
 *     data: {
 *       user: {...}
 *     }
 *   }
 * }
 */
function extractUser(data) {
  if (!data) {
    return null;
  }

  if (
    data.user &&
    typeof data.user === "object"
  ) {
    return data.user;
  }

  if (
    data.data?.user &&
    typeof data.data.user === "object"
  ) {
    return data.data.user;
  }

  if (
    data.data?.data?.user &&
    typeof data.data.data.user === "object"
  ) {
    return data.data.data.user;
  }

  return null;
}

/**
 * Extract JWT/access token from common backend
 * response formats.
 */
function extractToken(data) {
  if (!data) {
    return null;
  }

  const token =
    data.token ||
    data.accessToken ||
    data.data?.token ||
    data.data?.accessToken ||
    data.data?.data?.token ||
    data.data?.data?.accessToken ||
    null;

  return token
    ? String(token)
    : null;
}

/**
 * Normalize authentication response.
 *
 * This gives AuthContext a predictable structure
 * regardless of backend response nesting.
 */
function normalizeAuthResponse(response) {
  const data =
    getResponseData(response, {});

  return {
    data,
    user: extractUser(data),
    token: extractToken(data),
  };
}

/* ============================================================
   VALIDATION
============================================================ */

/**
 * Basic payload validation.
 *
 * Detailed validation should still happen on the backend.
 */
function validateLoginPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Login credentials are required."
    );
  }

  const email =
    typeof payload.email === "string"
      ? payload.email.trim()
      : "";

  const password =
    typeof payload.password === "string"
      ? payload.password
      : "";

  if (!email) {
    throw new Error(
      "Please enter your email address."
    );
  }

  if (!password) {
    throw new Error(
      "Please enter your password."
    );
  }

  return {
    ...payload,
    email,
    password,
  };
}

function validateRegisterPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error(
      "Registration details are required."
    );
  }

  const normalized = {
    ...payload,
    name:
      typeof payload.name === "string"
        ? payload.name.trim()
        : "",
    email:
      typeof payload.email === "string"
        ? payload.email.trim()
        : "",
    password:
      typeof payload.password === "string"
        ? payload.password
        : "",
  };

  if (!normalized.name) {
    throw new Error(
      "Please enter your name."
    );
  }

  if (!normalized.email) {
    throw new Error(
      "Please enter your email address."
    );
  }

  if (!normalized.password) {
    throw new Error(
      "Please enter a password."
    );
  }

  return normalized;
}

/* ============================================================
   AUTH SERVICE
============================================================ */

const authService = {
  /* ==========================================================
     LOGIN
  ========================================================== */

  async login(payload) {
    const credentials =
      validateLoginPayload(payload);

    try {
      const response = await api.post(
        AUTH_ENDPOINTS.LOGIN,
        credentials
      );

      const normalized =
        normalizeAuthResponse(response);

      /*
       * Save the token centrally when the backend
       * returns one.
       *
       * AuthContext can still decide when/how to
       * update the user state.
       */
      if (normalized.token) {
        setAuthToken(normalized.token);
      }

      return normalized.data;
    } catch (error) {
      error.authMessage =
        getApiErrorMessage(
          error,
          "Unable to sign in. Please check your credentials and try again."
        );

      throw error;
    }
  },

  /* ==========================================================
     REGISTER
  ========================================================== */

  async register(payload) {
    const registration =
      validateRegisterPayload(payload);

    try {
      const response = await api.post(
        AUTH_ENDPOINTS.REGISTER,
        registration
      );

      const normalized =
        normalizeAuthResponse(response);

      /*
       * Some backends automatically authenticate
       * a user after registration.
       *
       * If a token is returned, preserve it.
       */
      if (normalized.token) {
        setAuthToken(normalized.token);
      }

      return normalized.data;
    } catch (error) {
      error.authMessage =
        getApiErrorMessage(
          error,
          "Unable to create your account. Please try again."
        );

      throw error;
    }
  },

  /* ==========================================================
     CURRENT USER
  ========================================================== */

  async me() {
    try {
      const response = await api.get(
        AUTH_ENDPOINTS.ME
      );

      const normalized =
        normalizeAuthResponse(response);

      /*
       * Return the user when available.
       *
       * If your backend returns the user directly,
       * normalizeAuthResponse handles that too.
       */
      return (
        normalized.user ||
        normalized.data
      );
    } catch (error) {
      error.authMessage =
        getApiErrorMessage(
          error,
          "Unable to restore your session."
        );

      throw error;
    }
  },

  /* ==========================================================
     LOGOUT
  ========================================================== */

  async updateProfile(payload) {
    const response = await api.put("/auth/profile", payload);
    return getResponseData(response, null);
  },

  async updatePassword(payload) {
    const response = await api.put("/auth/password", payload);
    return getResponseData(response, null);
  },

  async logout() {
    try {
      const response = await api.post(
        AUTH_ENDPOINTS.LOGOUT
      );

      /*
       * Clear the client token after the server
       * logout request succeeds.
       */
      clearAuthToken();

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      /*
       * Even if the server is unavailable, clear
       * the local JWT so the client does not remain
       * apparently authenticated.
       */
      clearAuthToken();

      error.authMessage =
        getApiErrorMessage(
          error,
          "Unable to complete server logout."
        );

      throw error;
    }
  },
};

/* ============================================================
   OPTIONAL NAMED HELPERS
============================================================ */

export {
  extractToken,
  extractUser,
  normalizeAuthResponse,
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default authService;