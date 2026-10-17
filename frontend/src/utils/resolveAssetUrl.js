import config from "../config";

const API_URL = String(config.apiUrl || "").trim().replace(/\/+$/, "");
const BACKEND_ORIGIN = API_URL.replace(/\/api\/?$/i, "");

/** Resolve stored/local upload URLs to the configured API host. */
export function resolveAssetUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";

  const input = value.trim();

  // Older database records may contain URLs from local development.
  // Keep the configured backend origin, but normalize legacy upload paths.
  const normalizeUploadPath = (pathname) => {
    if (/^\/uploads\/profile-avatars\//i.test(pathname)) {
      return `/api${pathname}`;
    }
    return pathname;
  };

  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(?:\/|$)/i.test(input)) {
    try {
      const oldUrl = new URL(input);
      const pathname = normalizeUploadPath(oldUrl.pathname);
      return `${BACKEND_ORIGIN}${pathname}${oldUrl.search}${oldUrl.hash}`;
    } catch {
      return "";
    }
  }

  if (/^(https?:|data:|blob:)/i.test(input)) return input;
  if (input.startsWith("//")) return `${window.location.protocol}${input}`;
  if (input.startsWith("/")) {
    return `${BACKEND_ORIGIN}${normalizeUploadPath(input)}`;
  }
  const relativePath = `/${input.replace(/^\/+/, "")}`;
  return `${BACKEND_ORIGIN}${normalizeUploadPath(relativePath)}`;
}

export default resolveAssetUrl;
