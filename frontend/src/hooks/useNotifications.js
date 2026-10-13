import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import notificationService from "../services/notificationService";

/* ============================================================
   CONSTANTS
============================================================ */

const TOKEN_KEY = "syncdoc_token";

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely get a notification ID.
 */
function getNotificationId(notification) {
  if (
    !notification ||
    typeof notification !== "object"
  ) {
    return "";
  }

  return String(
    notification.id ||
    notification._id ||
    notification.notificationId ||
    ""
  );
}

/**
 * Extract notifications from different backend
 * response structures.
 *
 * Supported examples:
 *
 * { notifications: [] }
 * { data: { notifications: [] } }
 * { data: [] }
 * []
 */
function extractNotifications(response) {
  const data =
    response?.data ?? response;

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data?.notifications
    )
  ) {
    return data.notifications;
  }

  if (
    Array.isArray(
      data?.data?.notifications
    )
  ) {
    return data.data.notifications;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

/**
 * Normalize notification data so the UI receives
 * predictable values.
 */
function normalizeNotification(
  notification
) {
  if (
    !notification ||
    typeof notification !== "object"
  ) {
    return null;
  }

  return {
    ...notification,

    id:
      notification.id ||
      notification._id ||
      notification.notificationId ||
      "",

    title:
      typeof notification.title === "string" &&
        notification.title.trim()
        ? notification.title
        : "Notification",

    message:
      typeof notification.message === "string"
        ? notification.message
        : typeof notification.body === "string"
          ? notification.body
          : "",

    isRead: Boolean(
      notification.isRead ??
      notification.read ??
      notification.readAt
    ),
  };
}

/**
 * Normalize a notification list.
 */
function normalizeNotifications(
  notifications
) {
  if (!Array.isArray(notifications)) {
    return [];
  }

  return notifications
    .map(normalizeNotification)
    .filter(Boolean);
}

/**
 * Check whether the user has an authentication token.
 */
function hasAuthToken() {
  try {
    return Boolean(
      localStorage.getItem(TOKEN_KEY)
    );
  } catch {
    return false;
  }
}

/**
 * Detect cancelled requests.
 */
function isCanceledError(error) {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
}

/* ============================================================
   HOOK
============================================================ */

export default function useNotifications({
  autoLoad = true,
} = {}) {
  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [loading, setLoading] =
    useState(Boolean(autoLoad));

  const [markingAllRead, setMarkingAllRead] =
    useState(false);

  const [markingReadId, setMarkingReadId] =
    useState(null);

  const [removingId, setRemovingId] =
    useState(null);

  const [error, setError] =
    useState(null);

  const mountedRef = useRef(true);

  const requestIdRef = useRef(0);

  /* ==========================================================
     MOUNT / UNMOUNT
  ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ==========================================================
     LOAD NOTIFICATIONS
  ========================================================== */

  const load = useCallback(
    async ({
      showLoading = true,
    } = {}) => {
      const requestId =
        ++requestIdRef.current;

      /*
       * Do not make protected API calls when
       * the user is logged out.
       */
      if (!hasAuthToken()) {
        if (!mountedRef.current) {
          return [];
        }

        setNotifications([]);
        setError(null);

        if (showLoading) {
          setLoading(false);
        }

        return [];
      }

      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      try {
        const response =
          await notificationService.list();

        const nextNotifications =
          normalizeNotifications(
            extractNotifications(response)
          );

        /*
         * Ignore stale API responses.
         */
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return nextNotifications;
        }

        setNotifications(
          nextNotifications
        );

        setError(null);

        return nextNotifications;
      } catch (err) {
        if (
          !mountedRef.current ||
          isCanceledError(err)
        ) {
          return [];
        }

        console.error(
          "SyncDoc: failed to load notifications:",
          err
        );

        setNotifications([]);
        setError(err);

        return [];
      } finally {
        if (
          mountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    []
  );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return undefined;
    }

    load();

    return undefined;
  }, [autoLoad, load]);

  /* ==========================================================
     MARK ONE NOTIFICATION AS READ
  ========================================================== */

  const markAsRead = useCallback(
    async (notification) => {
      const id =
        getNotificationId(
          notification
        );

      if (!id) {
        return false;
      }

      /*
       * Already read.
       */
      if (
        notification?.isRead ||
        notification?.read
      ) {
        return true;
      }

      setMarkingReadId(id);
      setError(null);

      /*
       * Optimistic update.
       */
      setNotifications((previous) =>
        previous.map((item) =>
          getNotificationId(item) === id
            ? {
              ...item,
              isRead: true,
              read: true,
              readAt:
                item.readAt ||
                new Date().toISOString(),
            }
            : item
        )
      );

      try {
        /*
         * Support common service method names.
         */
        if (
          typeof notificationService.markRead ===
          "function"
        ) {
          await notificationService.markRead(
            id
          );
        } else if (
          typeof notificationService.read ===
          "function"
        ) {
          await notificationService.read(id);
        } else if (
          typeof notificationService.update ===
          "function"
        ) {
          await notificationService.update(
            id,
            {
              isRead: true,
            }
          );
        }

        return true;
      } catch (err) {
        console.error(
          "SyncDoc: failed to mark notification as read:",
          err
        );

        /*
         * Roll back if the backend update fails.
         */
        if (mountedRef.current) {
          setNotifications((previous) =>
            previous.map((item) =>
              getNotificationId(item) === id
                ? {
                  ...item,
                  isRead: false,
                  read: false,
                }
                : item
            )
          );

          setError(err);
        }

        return false;
      } finally {
        if (mountedRef.current) {
          setMarkingReadId(null);
        }
      }
    },
    []
  );

  /* ==========================================================
     MARK ALL AS READ
  ========================================================== */

  const markAllRead = useCallback(
    async () => {
      setMarkingAllRead(true);
      setError(null);

      /*
       * Save previous state for rollback.
       */
      let previousNotifications = [];

      setNotifications((previous) => {
        previousNotifications =
          previous;

        return previous.map((item) => ({
          ...item,
          isRead: true,
          read: true,
          readAt:
            item.readAt ||
            new Date().toISOString(),
        }));
      });

      try {
        if (
          typeof notificationService.markAllRead ===
          "function"
        ) {
          await notificationService.markAllRead();
        } else if (
          typeof notificationService.markAllAsRead ===
          "function"
        ) {
          await notificationService.markAllAsRead();
        }

        return true;
      } catch (err) {
        console.error(
          "SyncDoc: failed to mark all notifications as read:",
          err
        );

        /*
         * Roll back optimistic update.
         */
        if (mountedRef.current) {
          setNotifications(
            previousNotifications
          );

          setError(err);
        }

        return false;
      } finally {
        if (mountedRef.current) {
          setMarkingAllRead(false);
        }
      }
    },
    []
  );

  /* ==========================================================
     REMOVE NOTIFICATION
  ========================================================== */

  const removeNotification =
    useCallback(
      async (notification) => {
        const id =
          getNotificationId(
            notification
          );

        if (!id) {
          return false;
        }

        let previousNotifications =
          [];

        setRemovingId(id);
        setError(null);

        /*
         * Optimistic removal.
         */
        setNotifications((previous) => {
          previousNotifications =
            previous;

          return previous.filter(
            (item) =>
              getNotificationId(item) !==
              id
          );
        });

        try {
          if (
            typeof notificationService.remove ===
            "function"
          ) {
            await notificationService.remove(
              id
            );
          } else if (
            typeof notificationService.delete ===
            "function"
          ) {
            await notificationService.delete(
              id
            );
          }

          return true;
        } catch (err) {
          console.error(
            "SyncDoc: failed to remove notification:",
            err
          );

          if (mountedRef.current) {
            setNotifications(
              previousNotifications
            );

            setError(err);
          }

          return false;
        } finally {
          if (mountedRef.current) {
            setRemovingId(null);
          }
        }
      },
      []
    );

  /* ==========================================================
     ADD NOTIFICATION
     Useful for Socket.io / real-time events.
  ========================================================== */

  const addNotification =
    useCallback(
      (notification) => {
        const normalized =
          normalizeNotification(
            notification
          );

        if (!normalized) {
          return;
        }

        const id =
          getNotificationId(
            normalized
          );

        setNotifications((previous) => {
          /*
           * Prevent duplicate notifications.
           */
          if (
            id &&
            previous.some(
              (item) =>
                getNotificationId(item) ===
                id
            )
          ) {
            return previous;
          }

          return [
            normalized,
            ...previous,
          ];
        });
      },
      []
    );

  /* ==========================================================
     UPDATE NOTIFICATION
     Useful for Socket.io / live updates.
  ========================================================== */

  const updateNotification =
    useCallback(
      (notificationId, updates) => {
        if (!notificationId) {
          return;
        }

        if (
          !updates ||
          typeof updates !== "object"
        ) {
          return;
        }

        setNotifications((previous) =>
          previous.map((item) =>
            getNotificationId(item) ===
              String(notificationId)
              ? {
                ...item,
                ...updates,
              }
              : item
          )
        );
      },
      []
    );

  /* ==========================================================
     CLEAR NOTIFICATIONS
  ========================================================== */

  const clearNotifications =
    useCallback(() => {
      setNotifications([]);
      setError(null);
    }, []);

  /* ==========================================================
     DERIVED STATE
  ========================================================== */

  const unreadNotifications =
    useMemo(
      () =>
        notifications.filter(
          (notification) =>
            !Boolean(
              notification.isRead ??
              notification.read
            )
        ),
      [notifications]
    );

  const unreadCount =
    unreadNotifications.length;

  const notificationCount =
    notifications.length;

  const hasNotifications =
    notificationCount > 0;

  const hasUnread =
    unreadCount > 0;

  /* ==========================================================
     RETURN API
  ========================================================== */

  return useMemo(
    () => ({
      /* ----------------------------------------------
         Data
      ---------------------------------------------- */

      notifications,

      unreadNotifications,

      notificationCount,

      unreadCount,

      hasNotifications,

      hasUnread,

      /* ----------------------------------------------
         Loading
      ---------------------------------------------- */

      loading,

      markingAllRead,

      markingReadId,

      removingId,

      isMarkingAllRead:
        markingAllRead,

      isMarkingRead:
        Boolean(markingReadId),

      isRemoving:
        Boolean(removingId),

      /* ----------------------------------------------
         Error
      ---------------------------------------------- */

      error,

      /* ----------------------------------------------
         API actions
      ---------------------------------------------- */

      load,

      reload: load,

      markAsRead,

      markAllRead,

      removeNotification,

      addNotification,

      updateNotification,

      clearNotifications,
    }),
    [
      notifications,
      unreadNotifications,
      notificationCount,
      unreadCount,
      hasNotifications,
      hasUnread,
      loading,
      markingAllRead,
      markingReadId,
      removingId,
      error,
      load,
      markAsRead,
      markAllRead,
      removeNotification,
      addNotification,
      updateNotification,
      clearNotifications,
    ]
  );
}