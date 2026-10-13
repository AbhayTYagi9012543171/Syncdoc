/* ============================================================
   SYNCDOC — APPLICATION CONFIGURATION
============================================================ */

/**
 * Environment variable helper.
 *
 * Supports the current Create React App setup:
 *
 * REACT_APP_API_URL
 * REACT_APP_SOCKET_URL
 *
 * The Vite variables are also supported as a fallback so this
 * file can be used if the frontend is migrated back to Vite.
 */
function getEnv(name, viteName, fallback) {
  /* ----------------------------------------------------------
     Create React App
  ---------------------------------------------------------- */

  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env[name]
  ) {
    return process.env[name];
  }

  /* ----------------------------------------------------------
     Vite
  ---------------------------------------------------------- */

  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env[viteName]
  ) {
    return import.meta.env[viteName];
  }

  return fallback;
}

/* ============================================================
   URL NORMALIZATION
============================================================ */

/**
 * Remove unnecessary trailing slashes.
 */
function normalizeUrl(value) {
  if (!value) {
    return "";
  }

  return String(value).replace(/\/+$/, "");
}

/* ============================================================
   APPLICATION CONFIG
============================================================ */

const config = Object.freeze({
  /* ----------------------------------------------------------
     APPLICATION
  ---------------------------------------------------------- */

  appName: "SyncDoc",

  appVersion: "5.1.0",

  environment: getEnv(
    "REACT_APP_ENV",
    "VITE_ENV",
    "development"
  ),

  /* ----------------------------------------------------------
     API
  ---------------------------------------------------------- */

  apiUrl: normalizeUrl(
    getEnv(
      "REACT_APP_API_URL",
      "VITE_API_URL",
      "http://localhost:5000/api"
    )
  ),

  /* ----------------------------------------------------------
     SOCKET.IO
  ---------------------------------------------------------- */

  socketUrl: normalizeUrl(
    getEnv(
      "REACT_APP_SOCKET_URL",
      "VITE_SOCKET_URL",
      "http://localhost:5000"
    )
  ),

  /* ----------------------------------------------------------
     AUTH
  ---------------------------------------------------------- */

  tokenKey: "syncdoc_token",

  userKey: "syncdoc_user",

  workspaceKey: "syncdoc_active_workspace",

  /* ----------------------------------------------------------
     FEATURES
  ---------------------------------------------------------- */

  features: Object.freeze({
    collaboration: true,
    notifications: true,
    analytics: true,
    projects: true,
    workspaceManagement: true,
  }),
});

export default config;