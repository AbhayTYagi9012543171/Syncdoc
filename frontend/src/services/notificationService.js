import api, { getResponseData } from './api';

/* ============================================================
   SYNCDOC — NOTIFICATION SERVICE
   Centralized API operations for notifications.
============================================================ */

const BASE_PATH = '/notifications';

/* ============================================================
   HELPERS
============================================================ */

/**
 * Validate notification ID before making a request.
 */
function requireNotificationId(id) {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ''
  ) {
    throw new Error('Notification ID is required.');
  }

  return String(id).trim();
}

/**
 * Normalize pagination/query parameters.
 */
function normalizeParams(params = {}) {
  if (!params || typeof params !== 'object') {
    return {};
  }

  return {
    ...params,
  };
}

/* ============================================================
   NOTIFICATION SERVICE
============================================================ */

const notificationService = {
  /**
   * ----------------------------------------------------------
   * LIST NOTIFICATIONS
   * ----------------------------------------------------------
   *
   * Supported parameters may include:
   *
   * {
   *   page: 1,
   *   limit: 20,
   *   unreadOnly: true,
   *   sort: 'newest'
   * }
   */
  async list(params = {}) {
    const response = await api.get(BASE_PATH, {
      params: normalizeParams(params),
    });

    return getResponseData(response, []);
  },

  /**
   * ----------------------------------------------------------
   * GET SINGLE NOTIFICATION
   * ----------------------------------------------------------
   */
  async get(id) {
    const notificationId =
      requireNotificationId(id);

    const response = await api.get(
      `${BASE_PATH}/${notificationId}`
    );

    return getResponseData(response);
  },

  /**
   * ----------------------------------------------------------
   * MARK ONE NOTIFICATION AS READ
   * ----------------------------------------------------------
   */
  async markRead(id) {
    const notificationId =
      requireNotificationId(id);

    const response = await api.patch(
      `${BASE_PATH}/${notificationId}/read`
    );

    return getResponseData(response);
  },

  /**
   * ----------------------------------------------------------
   * MARK ONE NOTIFICATION AS UNREAD
   * ----------------------------------------------------------
   *
   * Only use this if the backend supports:
   *
   * PATCH /notifications/:id/unread
   */
  async markUnread(id) {
    const notificationId =
      requireNotificationId(id);

    const response = await api.patch(
      `${BASE_PATH}/${notificationId}/unread`
    );

    return getResponseData(response);
  },

  /**
   * ----------------------------------------------------------
   * MARK ALL NOTIFICATIONS AS READ
   * ----------------------------------------------------------
   */
  async markAllRead() {
    const response = await api.patch(
      `${BASE_PATH}/read-all`
    );

    return getResponseData(response);
  },

  /**
   * ----------------------------------------------------------
   * GET UNREAD NOTIFICATIONS
   * ----------------------------------------------------------
   */
  async unread(params = {}) {
    const response = await api.get(BASE_PATH, {
      params: {
        ...normalizeParams(params),
        unreadOnly: true,
      },
    });

    return getResponseData(response, []);
  },

  /**
   * ----------------------------------------------------------
   * GET UNREAD COUNT
   * ----------------------------------------------------------
   *
   * Requires backend support for:
   *
   * GET /notifications/unread-count
   */
  async unreadCount() {
    const response = await api.get(
      `${BASE_PATH}/unread-count`
    );

    return getResponseData(response, {
      count: 0,
    });
  },

  /**
   * ----------------------------------------------------------
   * DELETE NOTIFICATION
   * ----------------------------------------------------------
   *
   * Requires backend support for:
   *
   * DELETE /notifications/:id
   */
  async remove(id) {
    const notificationId =
      requireNotificationId(id);

    const response = await api.delete(
      `${BASE_PATH}/${notificationId}`
    );

    return getResponseData(response);
  },

  /**
   * ----------------------------------------------------------
   * DELETE ALL READ NOTIFICATIONS
   * ----------------------------------------------------------
   *
   * Requires backend support for:
   *
   * DELETE /notifications/read
   */
  async removeRead() {
    const response = await api.delete(
      `${BASE_PATH}/read`
    );

    return getResponseData(response);
  },

  /**
   * ----------------------------------------------------------
   * CLEAR ALL NOTIFICATIONS
   * ----------------------------------------------------------
   *
   * Requires backend support for:
   *
   * DELETE /notifications
   */
  async clearAll() {
    const response = await api.delete(
      BASE_PATH
    );

    return getResponseData(response);
  },
};

export default notificationService;