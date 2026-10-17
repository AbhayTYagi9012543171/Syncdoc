
/* ============================================================
   SYNCDOC — APPLICATION CONFIGURATION
   Compatible with Create React App
   ============================================================ */

const PRODUCTION_API_URL =
  "https://syncdoc-backend-lufy.onrender.com/api";

const PRODUCTION_SOCKET_URL =
  "https://syncdoc-backend-lufy.onrender.com";

const DEVELOPMENT_API_URL =
  "http://localhost:5000/api";

const DEVELOPMENT_SOCKET_URL =
  "http://localhost:5000";

const isProduction =
  process.env.NODE_ENV === "production";

function normalizeUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getEnv(name, fallback) {
  const value = process.env[name];

  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

const apiUrl = normalizeUrl(
  getEnv(
    "REACT_APP_API_URL",
    isProduction
      ? PRODUCTION_API_URL
      : DEVELOPMENT_API_URL
  )
);

const socketUrl = normalizeUrl(
  getEnv(
    "REACT_APP_SOCKET_URL",
    isProduction
      ? PRODUCTION_SOCKET_URL
      : DEVELOPMENT_SOCKET_URL
  )
);

const yjsUrl = normalizeUrl(
  getEnv("REACT_APP_YJS_URL", `${socketUrl.replace(/^http/i, "ws")}/yjs`)
);

const config = Object.freeze({
  appName: "SyncDoc",
  appVersion: "6.2.0",

  environment: getEnv(
    "REACT_APP_ENV",
    process.env.NODE_ENV || "development"
  ),

  apiUrl,
  socketUrl,

  // The backend Yjs WebSocket endpoint is /yjs/:documentId.
  yjsUrl,

  tokenKey: "syncdoc_token",
  userKey: "syncdoc_user",
  workspaceKey: "syncdoc_active_workspace",

  features: Object.freeze({
    collaboration: true,
    notifications: true,
    analytics: true,
    projects: true,
    workspaceManagement: true,
  }),
});

export default config;
