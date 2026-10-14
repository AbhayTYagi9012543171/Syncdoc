import api from "./api";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function unwrapResponse(response) {
  const body = response?.data;
  return body && Object.prototype.hasOwnProperty.call(body, "data")
    ? body.data
    : body ?? null;
}

function errorMessage(error, fallback) {
  const data = error?.response?.data;
  const serverMessage =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof data?.error?.message === "string" && data.error.message);

  if (serverMessage) return serverMessage;

  if (error?.response?.status === 401) {
    return "Your session has expired. Please sign in again.";
  }
  if (error?.response?.status === 403) {
    return "You do not have permission to make this change.";
  }
  if (error?.response?.status === 404) {
    return "The profile API route was not found. Restart the backend and confirm that profileRoutes is mounted at /api/profile.";
  }
  if (error?.response?.status === 413) {
    return "Your photo is too large. Choose an image no larger than 5 MB.";
  }
  if (error?.response?.status === 415) {
    return "Unsupported image format. Choose a JPG, PNG, WEBP, or GIF image.";
  }
  if (!error?.response && error?.request) {
    return "Unable to connect to SyncDoc. Check that the backend is running.";
  }

  return error?.apiMessage || error?.userMessage || error?.message || fallback;
}

function normalizeError(error, fallback) {
  const message = errorMessage(error, fallback);
  if (error && typeof error === "object") {
    error.userMessage = message;
  }

  if (process.env.NODE_ENV === "development") {
    console.error("SyncDoc profile request failed:", {
      method: error?.config?.method,
      url: error?.config?.url,
      status: error?.response?.status || error?.status || null,
      message,
      response: error?.response?.data || error?.apiData || null,
    });
  }

  return error instanceof Error ? error : new Error(message);
}

function validateAvatar(file) {
  if (!file) throw new Error("Please select a photo to upload.");
  if (typeof File !== "undefined" && !(file instanceof File)) {
    throw new Error("The selected upload is not a valid file.");
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG, WEBP, or GIF image. SVG is not supported.");
  }
  if (file.size <= 0) throw new Error("The selected image is empty.");
  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("Your profile photo must be 5 MB or smaller.");
  }
}

const profileService = {
  async get() {
    try {
      const response = await api.get("/profile");
      return unwrapResponse(response);
    } catch (error) {
      throw normalizeError(error, "Unable to load your profile.");
    }
  },

  async update(payload = {}) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Profile changes must be a valid object.");
    }

    const allowedFields = ["displayName", "bio", "avatar"];
    const body = Object.fromEntries(
      Object.entries(payload).filter(([key]) => allowedFields.includes(key))
    );

    if (!Object.keys(body).length) {
      throw new Error("There are no valid profile changes to save.");
    }

    if (Object.prototype.hasOwnProperty.call(body, "displayName")) {
      if (
        typeof body.displayName !== "string" ||
        body.displayName.trim().length < 2 ||
        body.displayName.trim().length > 50
      ) {
        throw new Error("Display name must be between 2 and 50 characters.");
      }
      body.displayName = body.displayName.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "bio")) {
      if (typeof body.bio !== "string" || body.bio.length > 500) {
        throw new Error("Your bio must be 500 characters or fewer.");
      }
      body.bio = body.bio.trim();
    }

    if (Object.prototype.hasOwnProperty.call(body, "avatar")) {
      if (body.avatar !== null && body.avatar !== "") {
        let parsed;
        try {
          parsed = new URL(body.avatar);
        } catch {
          throw new Error("Enter a valid HTTPS image URL.");
        }
        if (parsed.protocol !== "https:") {
          throw new Error("Profile photo URLs must use HTTPS.");
        }
        body.avatar = parsed.toString();
      } else {
        body.avatar = null;
      }
    }

    try {
      const response = await api.patch("/profile", body);
      return unwrapResponse(response);
    } catch (error) {
      throw normalizeError(error, "Unable to update your profile.");
    }
  },

  async uploadAvatar(file) {
    validateAvatar(file);

    const formData = new FormData();
    formData.append("avatar", file, file.name);

    try {
      // Do not manually set Content-Type. api.js removes its default JSON
      // header for FormData so the multipart boundary is generated correctly.
      const response = await api.post("/profile/avatar", formData);
      return unwrapResponse(response);
    } catch (error) {
      throw normalizeError(error, "Unable to upload your profile photo.");
    }
  },

  async removeAvatar() {
    try {
      const response = await api.delete("/profile/avatar");
      return unwrapResponse(response);
    } catch (error) {
      throw normalizeError(error, "Unable to remove your profile photo.");
    }
  },
};

export default profileService;
