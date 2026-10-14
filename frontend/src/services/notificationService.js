
import api, { getResponseData } from "./api";

/* ============================================================
   SYNCDOC — NOTIFICATION SERVICE
   Centralized API operations for notifications.
============================================================ */

const BASE_PATH = "/notifications";

// Share identical GET requests while they are in flight.
// Completed requests are not cached by this Map.
const inFlightRequests = new Map();

/* ============================================================
   HELPERS
============================================================ */

function requireNotificationId(id) {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error("Notification ID is required.");
  }

  return String(id).trim();
}

function normalizeParams(params = {}) {
  if (!params || typeof params !== "object") {
    return {};
  }

  return { ...params };
}

function makeRequestKey(url, params = {}) {
  const normalized = Object.keys(params)
    .sort()
    .map((key) => [key, params[key]]);

  return `${url}:${JSON.stringify(normalized)}`;
}

/**
 * Reuse an identical GET request if it is already running.
 * Remove it after success or failure so future refreshes work.
 */
function getOnce(url, params = {}, fallback = undefined) {
  const key = makeRequestKey(url, params);

  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }

  const request = api
    .get(url, { params })
    .then((response) => getResponseData(response, fallback))
    .finally(() => {
      if (inFlightRequests.get(key) === request) {
        inFlightRequests.delete(key);
      }
    });

  inFlightRequests.set(key, request);

  return request;
}

/* ============================================================
   NOTIFICATION SERVICE
============================================================ */

const notificationService = {
  /**
   * GET /notifications
   */
  list(params = {}) {
    return getOnce(
      BASE_PATH,
      normalizeParams({ limit: 100, ...params }),
      []
    );
  },

  /**
   * GET /notifications/:id
   */
  get(id) {
    const notificationId = requireNotificationId(id);

    return getOnce(
      `${BASE_PATH}/${encodeURIComponent(notificationId)}`
    );
  },

  /**
   * PATCH /notifications/:id/read
   */
  async markRead(id) {
    const notificationId = requireNotificationId(id);

    const response = await api.patch(
      `${BASE_PATH}/${encodeURIComponent(notificationId)}/read`
    );

    return getResponseData(response);
  },

  /**
   * PATCH /notifications/:id/unread
   * Requires backend support.
   */
  async markUnread(id) {
    const notificationId = requireNotificationId(id);

    const response = await api.patch(
      `${BASE_PATH}/${encodeURIComponent(notificationId)}/unread`
    );

    return getResponseData(response);
  },

  /**
   * PATCH /notifications/read-all
   */
  async markAllRead() {
    const response = await api.patch(
      `${BASE_PATH}/read-all`
    );

    return getResponseData(response);
  },

  /**
   * GET /notifications?unreadOnly=true
   */
  unread(params = {}) {
    return getOnce(
      BASE_PATH,
      {
        ...normalizeParams(params),
        unreadOnly: true,
      },
      []
    );
  },

  /**
   * GET /notifications/unread-count
   * Requires backend support.
   */
  unreadCount() {
    return getOnce(
      `${BASE_PATH}/unread-count`,
      {},
      { count: 0 }
    );
  },

  /**
   * DELETE /notifications/:id
   */
  async remove(id) {
    const notificationId = requireNotificationId(id);

    const response = await api.delete(
      `${BASE_PATH}/${encodeURIComponent(notificationId)}`
    );

    return getResponseData(response);
  },

  /**
   * DELETE /notifications/read
   * Requires backend support.
   */
  async removeRead() {
    const response = await api.delete(
      `${BASE_PATH}/read`
    );

    return getResponseData(response);
  },

  /**
   * DELETE /notifications
   * Requires backend support.
   */
  async clearAll() {
    const response = await api.delete(BASE_PATH);

    return getResponseData(response);
  },
};

export default notificationService;
