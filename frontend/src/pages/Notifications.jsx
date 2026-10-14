import "./pages-premium.css";

import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import NotificationItem from "../components/notifications/NotificationItem";
import Button from "../components/common/Button";
import useNotifications from "../hooks/useNotifications";

/* ============================================================
   CONSTANTS
============================================================ */

const FILTERS = {
  ALL: "all",
  UNREAD: "unread",
  READ: "read",
};

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely extract a notification ID.
 */
function getNotificationId(notification, index = 0) {
  if (!notification || typeof notification !== "object") {
    return `notification-${index}`;
  }

  const id =
    notification.id ||
    notification._id ||
    notification.notificationId;

  return id
    ? String(id)
    : `notification-${index}`;
}

/**
 * Determine whether a notification has been read.
 */
function isNotificationRead(notification) {
  if (!notification || typeof notification !== "object") {
    return false;
  }

  return Boolean(
    notification.isRead === true ||
      notification.read === true ||
      notification.readAt
  );
}

/**
 * Build searchable notification text.
 */
function getNotificationSearchText(notification) {
  if (!notification || typeof notification !== "object") {
    return "";
  }

  return [
    notification.title,
    notification.text,
    notification.message,
    notification.description,
    notification.type,
    notification.action,
    notification.name,

    notification.actor?.displayName,
    notification.actor?.username,
    notification.actor?.name,
    notification.actor?.email,

    notification.user?.displayName,
    notification.user?.username,
    notification.user?.name,
    notification.user?.email,
  ]
    .filter(
      (value) =>
        value !== null &&
        value !== undefined
    )
    .map(String)
    .join(" ")
    .toLowerCase();
}

/**
 * Normalize API error messages.
 */
function getNotificationErrorMessage(error) {
  if (!error) {
    return "Unable to complete the request.";
  }

  const status =
    error?.response?.status;

  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.errors?.[0]?.message ||
    error?.message;

  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You do not have permission to perform this action.";
  }

  if (status === 404) {
    return "The notification service could not be found.";
  }

  if (status >= 500) {
    return "The server encountered an error. Please try again.";
  }

  return (
    message ||
    "Something went wrong. Please try again."
  );
}

/* ============================================================
   LOADING SKELETON
============================================================ */

function NotificationSkeleton() {
  return (
    <div
      className="notification-skeleton"
      aria-hidden="true"
    >
      <span className="notification-skeleton-avatar" />

      <div className="notification-skeleton-content">
        <span
          className="
            notification-skeleton-line
            notification-skeleton-line-long
          "
        />

        <span
          className="
            notification-skeleton-line
            notification-skeleton-line-medium
          "
        />

        <span
          className="
            notification-skeleton-line
            notification-skeleton-line-small
          "
        />
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyNotifications({
  filter,
  hasSearch,
}) {
  let title = "No notifications yet";
  let description =
    "New workspace activity, mentions and updates will appear here.";
  let icon = "◎";

  if (hasSearch) {
    title = "No matching notifications";
    description =
      "Try a different search term or clear your search.";
    icon = "⌕";
  } else if (filter === FILTERS.UNREAD) {
    title = "You're all caught up";
    description =
      "You don't have any unread workspace activity.";
    icon = "✓";
  } else if (filter === FILTERS.READ) {
    title = "No read notifications";
    description =
      "Notifications you have already read will appear here.";
    icon = "✓";
  }

  return (
    <div className="notification-empty">
      <div
        className="notification-empty-icon"
        aria-hidden="true"
      >
        {icon}
      </div>

      <h2>{title}</h2>

      <p>{description}</p>
    </div>
  );
}

/* ============================================================
   ERROR STATE
============================================================ */

function NotificationError({
  message,
  onRetry,
  loading,
}) {
  return (
    <div
      className="notification-error"
      role="alert"
      aria-live="assertive"
    >
      <div
        className="notification-error-icon"
        aria-hidden="true"
      >
        !
      </div>

      <div className="notification-error-content">
        <strong>
          Unable to load notifications
        </strong>

        <p>
          {message ||
            "Something went wrong while loading your notifications. Please try again."}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={loading}
      >
        {loading ? "Retrying..." : "Try again"}
      </Button>
    </div>
  );
}

/* ============================================================
   NOTIFICATIONS PAGE
============================================================ */

export default function Notifications() {
  const {
    notifications = [],
    loading = false,
    error = null,
    reload,
    markAllRead,
  } = useNotifications();

  /* ==========================================================
     LOCAL STATE
  ========================================================== */

  const [filter, setFilter] =
    useState(FILTERS.ALL);

  const [search, setSearch] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState("");

  const [actionError, setActionError] =
    useState("");

  /* ==========================================================
     NORMALIZE DATA
  ========================================================== */

  const normalizedNotifications =
    useMemo(() => {
      if (!Array.isArray(notifications)) {
        return [];
      }

      return notifications.filter(
        (notification) =>
          notification &&
          typeof notification === "object"
      );
    }, [notifications]);

  /* ==========================================================
     COUNTS
  ========================================================== */

  const totalCount =
    normalizedNotifications.length;

  const unreadCount =
    useMemo(
      () =>
        normalizedNotifications.filter(
          (notification) =>
            !isNotificationRead(
              notification
            )
        ).length,
      [normalizedNotifications]
    );

  const readCount =
    Math.max(
      totalCount - unreadCount,
      0
    );

  /* ==========================================================
     FILTERED NOTIFICATIONS
  ========================================================== */

  const filteredNotifications =
    useMemo(() => {
      let result = [
        ...normalizedNotifications,
      ];

      /* ------------------------------------------------------
         FILTER
      ------------------------------------------------------ */

      if (filter === FILTERS.UNREAD) {
        result = result.filter(
          (notification) =>
            !isNotificationRead(
              notification
            )
        );
      }

      if (filter === FILTERS.READ) {
        result = result.filter(
          (notification) =>
            isNotificationRead(
              notification
            )
        );
      }

      /* ------------------------------------------------------
         SEARCH
      ------------------------------------------------------ */

      const query =
        search.trim().toLowerCase();

      if (query) {
        result = result.filter(
          (notification) =>
            getNotificationSearchText(
              notification
            ).includes(query)
        );
      }

      return result;
    }, [
      normalizedNotifications,
      filter,
      search,
    ]);

  /* ==========================================================
     SEARCH STATE
  ========================================================== */

  const hasSearch =
    search.trim().length > 0;

  const hasActiveFilter =
    filter !== FILTERS.ALL;

  const showingFilteredResults =
    hasSearch || hasActiveFilter;

  /* ==========================================================
     ERROR MESSAGE
  ========================================================== */

  const errorMessage =
    useMemo(() => {
      if (actionError) {
        return actionError;
      }

      if (!error) {
        return "";
      }

      return getNotificationErrorMessage(
        error
      );
    }, [
      actionError,
      error,
    ]);

  /* ==========================================================
     FILTER CHANGE
  ========================================================== */

  const handleFilterChange =
    useCallback((nextFilter) => {
      if (
        !Object.values(FILTERS).includes(
          nextFilter
        )
      ) {
        return;
      }

      setFilter(nextFilter);
      setActionError("");
    }, []);

  /* ==========================================================
     SEARCH CHANGE
  ========================================================== */

  const handleSearchChange =
    useCallback((event) => {
      setSearch(
        event.target.value
      );

      setActionError("");
    }, []);

  /* ==========================================================
     CLEAR SEARCH
  ========================================================== */

  const handleClearSearch =
    useCallback(() => {
      setSearch("");
      setActionError("");
    }, []);

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  const handleClearFilters =
    useCallback(() => {
      setSearch("");
      setFilter(FILTERS.ALL);
      setActionError("");
    }, []);

  /* ==========================================================
     MARK ALL READ
  ========================================================== */

  const handleMarkAllRead =
    useCallback(async () => {
      if (
        unreadCount === 0 ||
        typeof markAllRead !== "function"
      ) {
        return;
      }

      if (actionLoading) {
        return;
      }

      setActionLoading("mark-read");
      setActionError("");

      try {
        await markAllRead();
      } catch (markError) {
        console.error(
          "SyncDoc: failed to mark notifications as read:",
          markError
        );

        setActionError(
          getNotificationErrorMessage(
            markError
          )
        );
      } finally {
        setActionLoading("");
      }
    }, [
      unreadCount,
      markAllRead,
      actionLoading,
    ]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(async () => {
      if (
        typeof reload !== "function" ||
        actionLoading
      ) {
        return;
      }

      setActionLoading("refresh");
      setActionError("");

      try {
        await reload();
      } catch (refreshError) {
        console.error(
          "SyncDoc: failed to refresh notifications:",
          refreshError
        );

        setActionError(
          getNotificationErrorMessage(
            refreshError
          )
        );
      } finally {
        setActionLoading("");
      }
    }, [
      reload,
      actionLoading,
    ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className="page notifications-page"
      aria-labelledby="notifications-title"
    >
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <header className="page-heading notifications-heading">
        <div className="page-heading-content">
          <div className="eyebrow-row">
            <span className="eyebrow">
              ACTIVITY
            </span>

            {unreadCount > 0 && (
              <span
                className="
                  notification-count-badge
                "
              >
                {unreadCount} unread
              </span>
            )}
          </div>

          <h1 id="notifications-title">
            Notifications
          </h1>

          <p>
            Stay up to date with activity across
            your SyncDoc workspace.
          </p>
        </div>

        <div className="notification-header-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={
              loading ||
              actionLoading !== ""
            }
            aria-label="Refresh notifications"
          >
            <span
              aria-hidden="true"
              className={
                actionLoading === "refresh"
                  ? "is-spinning"
                  : ""
              }
            >
              ↻
            </span>

            {actionLoading === "refresh"
              ? "Refreshing..."
              : "Refresh"}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={
              loading ||
              unreadCount === 0 ||
              actionLoading !== ""
            }
          >
            {actionLoading ===
            "mark-read"
              ? "Marking..."
              : unreadCount > 0
              ? "Mark all read"
              : "All caught up"}
          </Button>
        </div>
      </header>

      {/* ======================================================
          ACTION ERROR
      ====================================================== */}

      {actionError &&
        !error && (
          <div
            className="documents-alert"
            role="alert"
            aria-live="assertive"
          >
            <div>
              <strong>
                Unable to complete request
              </strong>

              <span>
                {actionError}
              </span>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setActionError("")
              }
            >
              Dismiss
            </Button>
          </div>
        )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <section
        className="notification-summary"
        aria-label="Notification summary"
      >
        <div className="notification-summary-item">
          <span
            className="notification-summary-icon"
            aria-hidden="true"
          >
            ◎
          </span>

          <div>
            <strong>
              {totalCount}
            </strong>

            <span>Total</span>
          </div>
        </div>

        <div className="notification-summary-item">
          <span
            className="notification-summary-icon"
            aria-hidden="true"
          >
            ●
          </span>

          <div>
            <strong>
              {unreadCount}
            </strong>

            <span>Unread</span>
          </div>
        </div>

        <div className="notification-summary-item">
          <span
            className="notification-summary-icon"
            aria-hidden="true"
          >
            ✓
          </span>

          <div>
            <strong>
              {readCount}
            </strong>

            <span>Read</span>
          </div>
        </div>
      </section>

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <section
        className="notification-toolbar"
        aria-label="Notification controls"
      >
        <div
          className="notification-tabs"
          role="tablist"
          aria-label="Notification filters"
        >
          <button
            type="button"
            role="tab"
            id="notifications-tab-all"
            aria-selected={
              filter === FILTERS.ALL
            }
            aria-controls="notifications-panel"
            tabIndex={
              filter === FILTERS.ALL
                ? 0
                : -1
            }
            className={
              filter === FILTERS.ALL
                ? "notification-tab active"
                : "notification-tab"
            }
            onClick={() =>
              handleFilterChange(
                FILTERS.ALL
              )
            }
          >
            All

            <span>{totalCount}</span>
          </button>

          <button
            type="button"
            role="tab"
            id="notifications-tab-unread"
            aria-selected={
              filter ===
              FILTERS.UNREAD
            }
            aria-controls="notifications-panel"
            tabIndex={
              filter ===
              FILTERS.UNREAD
                ? 0
                : -1
            }
            className={
              filter ===
              FILTERS.UNREAD
                ? "notification-tab active"
                : "notification-tab"
            }
            onClick={() =>
              handleFilterChange(
                FILTERS.UNREAD
              )
            }
          >
            Unread

            {unreadCount > 0 && (
              <span>
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            id="notifications-tab-read"
            aria-selected={
              filter === FILTERS.READ
            }
            aria-controls="notifications-panel"
            tabIndex={
              filter === FILTERS.READ
                ? 0
                : -1
            }
            className={
              filter === FILTERS.READ
                ? "notification-tab active"
                : "notification-tab"
            }
            onClick={() =>
              handleFilterChange(
                FILTERS.READ
              )
            }
          >
            Read

            {readCount > 0 && (
              <span>
                {readCount}
              </span>
            )}
          </button>
        </div>

        <div className="notification-search">
          <span
            aria-hidden="true"
            className="notification-search-icon"
          >
            ⌕
          </span>

          <input
            type="search"
            value={search}
            onChange={
              handleSearchChange
            }
            placeholder="Search notifications..."
            aria-label="Search notifications"
            autoComplete="off"
          />

          {hasSearch && (
            <button
              type="button"
              className="notification-search-clear"
              onClick={
                handleClearSearch
              }
              aria-label="Clear notification search"
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* ======================================================
          CONTENT CARD
      ====================================================== */}

      <section
        id="notifications-panel"
        className="notification-page card"
        role="tabpanel"
        aria-labelledby={
          filter === FILTERS.ALL
            ? "notifications-tab-all"
            : filter ===
              FILTERS.UNREAD
            ? "notifications-tab-unread"
            : "notifications-tab-read"
        }
      >
        {/* ====================================================
            LOADING
        ==================================================== */}

        {loading && (
          <div
            className="notification-list"
            aria-label="Loading notifications"
            aria-busy="true"
          >
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
            <NotificationSkeleton />
          </div>
        )}

        {/* ====================================================
            ERROR
        ==================================================== */}

        {!loading &&
          error && (
            <NotificationError
              message={errorMessage}
              onRetry={handleRefresh}
              loading={
                actionLoading ===
                "refresh"
              }
            />
          )}

        {/* ====================================================
            EMPTY
        ==================================================== */}

        {!loading &&
          !error &&
          filteredNotifications.length ===
            0 && (
            <EmptyNotifications
              filter={filter}
              hasSearch={hasSearch}
            />
          )}

        {/* ====================================================
            LIST
        ==================================================== */}

        {!loading &&
          !error &&
          filteredNotifications.length >
            0 && (
            <div
              className="notification-list"
              role="list"
              aria-label="Notifications"
            >
              {filteredNotifications.map(
                (
                  notification,
                  index
                ) => {
                  const id =
                    getNotificationId(
                      notification,
                      index
                    );

                  const read =
                    isNotificationRead(
                      notification
                    );

                  return (
                    <div
                      key={`${id}-${index}`}
                      className={
                        read
                          ? "notification-list-item is-read"
                          : "notification-list-item is-unread"
                      }
                      role="listitem"
                    >
                      <NotificationItem
                        notification={
                          notification
                        }
                      />
                    </div>
                  );
                }
              )}
            </div>
          )}

        {/* ====================================================
            SEARCH / FILTER RESULT FOOTER
        ==================================================== */}

        {!loading &&
          !error &&
          filteredNotifications.length >
            0 &&
          showingFilteredResults && (
            <div className="notification-results-info">
              <span>
                Showing{" "}
                <strong>
                  {
                    filteredNotifications.length
                  }
                </strong>{" "}
                of{" "}
                <strong>
                  {totalCount}
                </strong>{" "}
                notification
                {totalCount === 1
                  ? ""
                  : "s"}
              </span>

              <button
                type="button"
                className="notification-search-clear"
                onClick={
                  handleClearFilters
                }
              >
                Clear filters
              </button>
            </div>
          )}
      </section>

      {/* ======================================================
          SCREEN READER STATUS
      ====================================================== */}

      <span
        className="sr-only"
        aria-live="polite"
      >
        {unreadCount > 0
          ? `${unreadCount} unread notifications.`
          : "No unread notifications."}

        {" "}

        {showingFilteredResults &&
          `${filteredNotifications.length} notifications currently shown.`}
      </span>
    </main>
  );
}

