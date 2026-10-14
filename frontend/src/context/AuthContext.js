
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

// ============================================================
// AUTH CONTEXT
// ============================================================

const AuthContext = createContext(null);

// ============================================================
// STORAGE KEYS
// ============================================================

const STORAGE_KEY = "syncdoc_user";
const TOKEN_KEY = "syncdoc_token";
const WORKSPACE_KEY = "syncdoc_active_workspace";

// ============================================================
// SHARED SESSION REQUEST
//
// Reuse an in-flight /auth/me request when StrictMode replays
// an effect. The request is shared only for the same token.
// ============================================================

let sessionRestorePromise = null;
let sessionRestoreToken = null;

function getCurrentUserOnce(token) {
  if (
    sessionRestorePromise &&
    sessionRestoreToken === token
  ) {
    return sessionRestorePromise;
  }

  sessionRestoreToken = token;

  const request = api.get("/auth/me");

  const sharedRequest = request.finally(() => {
    if (sessionRestorePromise === sharedRequest) {
      sessionRestorePromise = null;
      sessionRestoreToken = null;
    }
  });

  sessionRestorePromise = sharedRequest;

  return sharedRequest;
}

// ============================================================
// STORAGE HELPERS
// ============================================================

function getStorageItem(key) {
  try {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(
      `SyncDoc: unable to read localStorage key "${key}".`,
      error
    );

    return null;
  }
}

function setStorageItem(key, value) {
  try {
    if (typeof window === "undefined") {
      return false;
    }

    window.localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(
      `SyncDoc: unable to save localStorage key "${key}".`,
      error
    );

    return false;
  }
}

function removeStorageItem(key) {
  try {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(
      `SyncDoc: unable to remove localStorage key "${key}".`,
      error
    );
  }
}

// ============================================================
// USER STORAGE
// ============================================================

function getStoredUser() {
  const storedUser = getStorageItem(STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser);

    if (
      parsedUser &&
      typeof parsedUser === "object" &&
      !Array.isArray(parsedUser)
    ) {
      return parsedUser;
    }

    removeStorageItem(STORAGE_KEY);
    return null;
  } catch (error) {
    console.warn(
      "SyncDoc: invalid cached user data.",
      error
    );

    removeStorageItem(STORAGE_KEY);
    return null;
  }
}

function hasStoredToken() {
  const token = getStorageItem(TOKEN_KEY);

  return Boolean(token && token.trim());
}

// ============================================================
// API RESPONSE HELPERS
// ============================================================

function extractUser(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidates = [
    data.user,
    data.data?.user,
    data.data?.data?.user,
  ];

  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate === "object" &&
      !Array.isArray(candidate)
    ) {
      return candidate;
    }
  }

  // Support APIs that return the user object directly.
  if (
    !data.success &&
    !data.message &&
    !data.data &&
    !data.token &&
    !data.accessToken
  ) {
    return data;
  }

  return null;
}

function extractToken(data) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const candidates = [
    data.token,
    data.accessToken,
    data.data?.token,
    data.data?.accessToken,
    data.data?.data?.token,
    data.data?.data?.accessToken,
  ];

  for (const token of candidates) {
    if (
      typeof token === "string" &&
      token.trim()
    ) {
      return token.trim();
    }
  }

  return null;
}

// ============================================================
// ERROR HELPERS
// ============================================================

function getAuthErrorMessage(
  error,
  fallback = "Something went wrong. Please try again."
) {
  const responseData = error?.response?.data;

  if (typeof responseData?.message === "string") {
    return responseData.message;
  }

  if (typeof responseData?.error === "string") {
    return responseData.error;
  }

  if (
    typeof error?.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

// ============================================================
// AUTH STORAGE
// ============================================================

function clearAuthStorage() {
  removeStorageItem(TOKEN_KEY);
  removeStorageItem(STORAGE_KEY);
  removeStorageItem(WORKSPACE_KEY);
}

// ============================================================
// AUTH PROVIDER
// ============================================================

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(getStoredUser);
  const [loading, setLoading] = useState(true);

  // ----------------------------------------------------------
  // SET AUTHENTICATED USER
  // ----------------------------------------------------------

  const setAuthenticatedUser = useCallback((nextUser) => {
    if (
      nextUser &&
      typeof nextUser === "object" &&
      !Array.isArray(nextUser)
    ) {
      setStorageItem(
        STORAGE_KEY,
        JSON.stringify(nextUser)
      );

      setUserState(nextUser);
      return;
    }

    removeStorageItem(STORAGE_KEY);
    setUserState(null);
  }, []);

  // ----------------------------------------------------------
  // CLEAR SESSION
  // ----------------------------------------------------------

  const clearSession = useCallback(() => {
    clearAuthStorage();
    setUserState(null);
  }, []);

  // ----------------------------------------------------------
  // RESTORE SESSION
  // ----------------------------------------------------------

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const token = getStorageItem(TOKEN_KEY);

      if (!token || !token.trim()) {
        if (active) {
          setUserState(null);
          setLoading(false);
        }

        return;
      }

      try {
        const response = await getCurrentUserOnce(
          token.trim()
        );

        if (!active) {
          return;
        }

        // Ignore a response if the session changed while
        // the request was in progress.
        if (getStorageItem(TOKEN_KEY) !== token) {
          setUserState(getStoredUser());
          return;
        }

        const authenticatedUser = extractUser(
          response?.data
        );

        if (authenticatedUser) {
          setAuthenticatedUser(authenticatedUser);
        } else {
          console.warn(
            "SyncDoc: /auth/me returned no valid user."
          );
        }
      } catch (error) {
        if (!active) {
          return;
        }

        // Do not clear a newer session because an older
        // request returned an authentication error.
        if (getStorageItem(TOKEN_KEY) !== token) {
          return;
        }

        const status = error?.response?.status;

        if (status === 401) {
          console.warn(
            "SyncDoc: authentication token is invalid or expired."
          );

          clearSession();
        } else {
          // Keep the session intact during temporary
          // network errors or server failures.
          console.warn(
            "SyncDoc: unable to verify session.",
            getAuthErrorMessage(
              error,
              "Authentication server unavailable."
            )
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [clearSession, setAuthenticatedUser]);

  // ----------------------------------------------------------
  // LOGIN
  // ----------------------------------------------------------

  const login = useCallback(
    async (credentials) => {
      if (
        !credentials ||
        typeof credentials !== "object"
      ) {
        throw new Error(
          "Login credentials are required."
        );
      }

      const response = await api.post(
        "/auth/login",
        credentials
      );

      const data = response?.data || {};
      const token = extractToken(data);
      const authenticatedUser = extractUser(data);

      if (!token) {
        throw new Error(
          "Login response did not contain an authentication token."
        );
      }

      // Persist the token only after successful login.
      setStorageItem(TOKEN_KEY, token);

      if (authenticatedUser) {
        setAuthenticatedUser(authenticatedUser);
      } else {
        setUserState(null);
        removeStorageItem(STORAGE_KEY);
      }

      return response;
    },
    [setAuthenticatedUser]
  );

  // ----------------------------------------------------------
  // REGISTER
  // ----------------------------------------------------------

  const register = useCallback(async (payload) => {
    if (
      !payload ||
      typeof payload !== "object"
    ) {
      throw new Error(
        "Registration information is required."
      );
    }

    return api.post("/auth/register", payload);
  }, []);

  // ----------------------------------------------------------
  // LOGOUT
  // ----------------------------------------------------------

  const logout = useCallback(async () => {
    // Clear the local session immediately.
    clearSession();
  }, [clearSession]);

  // ----------------------------------------------------------
  // UPDATE USER
  // ----------------------------------------------------------

  const updateUser = useCallback((updates) => {
    setUserState((currentUser) => {
      if (
        !currentUser ||
        typeof currentUser !== "object"
      ) {
        return currentUser;
      }

      const nextUser = {
        ...currentUser,
        ...(updates || {}),
      };

      setStorageItem(
        STORAGE_KEY,
        JSON.stringify(nextUser)
      );

      return nextUser;
    });
  }, []);

  // ----------------------------------------------------------
  // AUTHENTICATION STATUS
  // ----------------------------------------------------------

  const isAuthenticated = Boolean(
    user && hasStoredToken()
  );

  const sessionStatus = loading
    ? "restoring"
    : isAuthenticated
      ? "authenticated"
      : "anonymous";

  // ----------------------------------------------------------
  // CONTEXT VALUE
  // ----------------------------------------------------------

  const value = useMemo(
    () => ({
      user,
      loading,
      isLoading: loading,
      isAuthenticated,
      sessionStatus,

      login,
      register,
      logout,

      // Backward-compatible API.
      setUser: setAuthenticatedUser,

      updateUser,
      clearSession,
    }),
    [
      user,
      loading,
      isAuthenticated,
      sessionStatus,
      login,
      register,
      logout,
      setAuthenticatedUser,
      updateUser,
      clearSession,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// USE AUTH
// ============================================================

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

// ============================================================
// DEFAULT EXPORT
// ============================================================

export default AuthContext;
