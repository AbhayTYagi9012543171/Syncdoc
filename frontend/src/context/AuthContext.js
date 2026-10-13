import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import api from "../services/api";

/* ============================================================
   AUTH CONTEXT
============================================================ */

const AuthContext = createContext(null);

/* ============================================================
   STORAGE KEYS
============================================================ */

const STORAGE_KEY = "syncdoc_user";
const TOKEN_KEY = "syncdoc_token";
const WORKSPACE_KEY = "syncdoc_active_workspace";

/* ============================================================
   STORAGE HELPERS
============================================================ */

/**
 * Safely read localStorage.
 */
function getStorageItem(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(
      `SyncDoc: unable to read localStorage key "${key}".`,
      error
    );

    return null;
  }
}

/**
 * Safely write localStorage.
 */
function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(
      `SyncDoc: unable to save localStorage key "${key}".`,
      error
    );

    return false;
  }
}

/**
 * Safely remove localStorage item.
 */
function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(
      `SyncDoc: unable to remove localStorage key "${key}".`,
      error
    );
  }
}

/* ============================================================
   USER STORAGE
============================================================ */

/**
 * Safely parse cached authenticated user.
 */
function getStoredUser() {
  const storedUser =
    getStorageItem(STORAGE_KEY);

  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser =
      JSON.parse(storedUser);

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

/* ============================================================
   API RESPONSE HELPERS
============================================================ */

/**
 * Extract user from common backend response structures.
 *
 * Supported:
 *
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

  /*
   * Some APIs return the user object directly.
   */
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

/**
 * Extract JWT/access token.
 */
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

/* ============================================================
   ERROR HELPERS
============================================================ */

/**
 * Extract a useful API error message.
 */
function getAuthErrorMessage(
  error,
  fallback = "Something went wrong. Please try again."
) {
  const responseData =
    error?.response?.data;

  if (
    typeof responseData?.message ===
    "string"
  ) {
    return responseData.message;
  }

  if (
    typeof responseData?.error ===
    "string"
  ) {
    return responseData.error;
  }

  if (
    typeof error?.message ===
    "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

/* ============================================================
   AUTH STORAGE
============================================================ */

/**
 * Clear all SyncDoc authentication data.
 */
function clearAuthStorage() {
  removeStorageItem(TOKEN_KEY);
  removeStorageItem(STORAGE_KEY);
  removeStorageItem(WORKSPACE_KEY);
}

/**
 * Check whether a token currently exists.
 */
function hasStoredToken() {
  const token =
    getStorageItem(TOKEN_KEY);

  return Boolean(
    typeof token === "string" &&
    token.trim()
  );
}

/* ============================================================
   AUTH PROVIDER
============================================================ */

export function AuthProvider({
  children,
}) {
  /* ==========================================================
     STATE
  ========================================================== */

  const [user, setUserState] =
    useState(getStoredUser);

  const [loading, setLoading] =
    useState(true);

  /* ==========================================================
     AUTHENTICATED USER
  ========================================================== */

  const setAuthenticatedUser =
    useCallback((nextUser) => {
      if (
        nextUser &&
        typeof nextUser === "object" &&
        !Array.isArray(nextUser)
      ) {
        setUserState(nextUser);

        setStorageItem(
          STORAGE_KEY,
          JSON.stringify(nextUser)
        );

        return;
      }

      setUserState(null);
      removeStorageItem(STORAGE_KEY);
    }, []);

  /* ==========================================================
     CLEAR SESSION
  ========================================================== */

  const clearSession =
    useCallback(() => {
      clearAuthStorage();
      setUserState(null);
    }, []);

  /* ==========================================================
     RESTORE SESSION
  ========================================================== */

  useEffect(() => {
    let mounted = true;

    const restoreSession =
      async () => {
        const token =
          getStorageItem(TOKEN_KEY);

        /*
         * No token means there is no
         * authenticated session.
         */
        if (!token) {
          if (mounted) {
            setUserState(null);
            setLoading(false);
          }

          return;
        }

        try {
          /*
           * /auth/me should be protected by
           * the JWT middleware on the backend.
           */
          const response =
            await api.get("/auth/me");

          if (!mounted) {
            return;
          }

          const data =
            response?.data || {};

          const authenticatedUser =
            extractUser(data);

          if (
            authenticatedUser &&
            typeof authenticatedUser ===
            "object"
          ) {
            setAuthenticatedUser(
              authenticatedUser
            );
          } else {
            /*
             * Token exists but backend did not
             * return a valid user.
             *
             * Keep the token because this may
             * be a backend response-shape issue.
             */
            console.warn(
              "SyncDoc: /auth/me returned no valid user."
            );
          }
        } catch (error) {
          if (!mounted) {
            return;
          }

          const status =
            error?.response?.status;

          /*
           * 401 means the token is invalid,
           * expired, or unauthorized.
           */
          if (status === 401) {
            console.warn(
              "SyncDoc: authentication token is invalid or expired."
            );

            clearSession();
          } else {
            /*
             * Do not destroy a potentially valid
             * session because of a temporary
             * network/server error.
             */
            console.warn(
              "SyncDoc: unable to verify session.",
              getAuthErrorMessage(
                error,
                "Authentication server unavailable."
              )
            );
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [
    clearSession,
    setAuthenticatedUser,
  ]);

  /* ==========================================================
     LOGIN
  ========================================================== */

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

      try {
        const response =
          await api.post(
            "/auth/login",
            credentials
          );

        const data =
          response?.data || {};

        const token =
          extractToken(data);

        const authenticatedUser =
          extractUser(data);

        /*
         * JWT token is mandatory.
         */
        if (!token) {
          throw new Error(
            "Login succeeded but no authentication token was returned by the server."
          );
        }

        /*
         * Save token first.
         */
        setStorageItem(
          TOKEN_KEY,
          token
        );

        /*
         * Save user if returned.
         */
        if (
          authenticatedUser &&
          typeof authenticatedUser ===
          "object"
        ) {
          setAuthenticatedUser(
            authenticatedUser
          );
        } else {
          /*
           * Token exists but user wasn't returned.
           *
           * The /auth/me request on the next
           * application load can recover it.
           */
          setUserState(null);
          removeStorageItem(STORAGE_KEY);
        }

        return response;
      } catch (error) {
        /*
         * Do not leave half-authenticated
         * state after a failed login.
         */
        if (
          !extractToken(
            error?.response?.data
          )
        ) {
          removeStorageItem(TOKEN_KEY);
        }

        console.error(
          "SyncDoc login failed:",
          getAuthErrorMessage(
            error,
            "Unable to sign in."
          )
        );

        throw error;
      }
    },
    [setAuthenticatedUser]
  );

  /* ==========================================================
     REGISTER
  ========================================================== */

  const register = useCallback(
    async (payload) => {
      if (
        !payload ||
        typeof payload !== "object"
      ) {
        throw new Error(
          "Registration information is required."
        );
      }

      try {
        const response =
          await api.post(
            "/auth/register",
            payload
          );

        return response;
      } catch (error) {
        console.error(
          "SyncDoc registration failed:",
          getAuthErrorMessage(
            error,
            "Unable to create your account."
          )
        );

        throw error;
      }
    },
    []
  );

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logout = useCallback(
    async () => {
      /*
       * Clear local session immediately so
       * protected UI disappears without delay.
       */
      clearSession();

      /*
       * If your backend later provides
       * POST /auth/logout, it can be called
       * here without affecting local logout.
       */
    },
    [clearSession]
  );

  /* ==========================================================
     UPDATE USER
  ========================================================== */

  const updateUser =
    useCallback(
      (updates) => {
        setUserState(
          (currentUser) => {
            if (
              !currentUser ||
              typeof currentUser !==
              "object"
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
          }
        );
      },
      []
    );

  /* ==========================================================
     AUTHENTICATION STATUS
  ========================================================== */

  const isAuthenticated =
    Boolean(
      user && hasStoredToken()
    );

  /* ==========================================================
     CONTEXT VALUE
  ========================================================== */

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated,

      login,
      register,
      logout,

      /*
       * Backward-compatible API.
       *
       * Existing components can still use:
       *
       * setUser(...)
       */
      setUser:
        setAuthenticatedUser,

      /*
       * More explicit API for partial
       * user updates.
       */
      updateUser,

      /*
       * Useful for manual session cleanup.
       */
      clearSession,
    }),
    [
      user,
      loading,
      isAuthenticated,
      login,
      register,
      logout,
      setAuthenticatedUser,
      updateUser,
      clearSession,
    ]
  );

  /* ==========================================================
     PROVIDER
  ========================================================== */

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ============================================================
   USE AUTH
============================================================ */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default AuthContext;