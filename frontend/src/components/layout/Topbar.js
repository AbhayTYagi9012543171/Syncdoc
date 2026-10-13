import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Avatar from "../common/Avatar";
import NotificationBell from "../notifications/NotificationBell";
import { useAuth } from "../../context/AuthContext";

/* ============================================================
   SYNCDOC — TOPBAR
   Premium responsive application header
============================================================ */

const SEARCH_DEBOUNCE = 300;

/* ============================================================
   HELPERS
============================================================ */

function getUserName(user) {
  if (!user) return "User";

  return (
    user.name ||
    user.displayName ||
    user.username ||
    user.fullName ||
    user.email?.split("@")[0] ||
    "User"
  );
}

function getUserRole(user) {
  const role =
    user?.role ||
    user?.workspaceRole ||
    user?.permissions?.role;

  if (!role) return "Member";

  return String(role)
    .charAt(0)
    .toUpperCase() +
    String(role).slice(1);
}

function getInitials(name = "User") {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getPageContext(pathname = "") {
  if (
    pathname.startsWith("/documents/") ||
    pathname.includes("/editor")
  ) {
    return "Editor";
  }

  if (pathname.startsWith("/admin")) {
    return "Administration";
  }

  if (pathname.startsWith("/analytics")) {
    return "Analytics";
  }

  if (pathname.startsWith("/notifications")) {
    return "Activity";
  }

  if (pathname.startsWith("/settings")) {
    return "Settings";
  }

  if (pathname.startsWith("/projects")) {
    return "Projects";
  }

  if (pathname.startsWith("/workspace")) {
    return "Workspace";
  }

  if (pathname.startsWith("/documents")) {
    return "Documents";
  }

  return "Workspace";
}

function getSearchPlaceholder(context) {
  const placeholders = {
    Editor:
      "Search documents, comments, or people...",
    Administration:
      "Search users, documents, or projects...",
    Projects:
      "Search projects or documents...",
    Documents:
      "Search documents...",
    Analytics:
      "Search analytics...",
    default:
      "Search documents, people, projects...",
  };

  return (
    placeholders[context] ||
    placeholders.default
  );
}

/* ============================================================
   COMPONENT
============================================================ */

export default function Topbar({
  onMenuClick,
  onSearch,
  searchValue,
  className = "",
}) {
  const { user, logout } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const profileRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTimerRef = useRef(null);

  const [search, setSearch] = useState(
    searchValue ?? ""
  );

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  /* ==========================================================
     DERIVED VALUES
  ========================================================== */

  const userName = useMemo(
    () => getUserName(user),
    [user]
  );

  const userRole = useMemo(
    () => getUserRole(user),
    [user]
  );

  const initials = useMemo(
    () => getInitials(userName),
    [userName]
  );

  const context = useMemo(
    () =>
      getPageContext(
        location.pathname
      ),
    [location.pathname]
  );

  const placeholder = useMemo(
    () => getSearchPlaceholder(context),
    [context]
  );

  const classes = useMemo(
    () =>
      [
        "topbar",
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [className]
  );

  /* ==========================================================
     SYNC EXTERNAL SEARCH VALUE
  ========================================================== */

  useEffect(() => {
    if (searchValue !== undefined) {
      setSearch(searchValue);
    }
  }, [searchValue]);

  /* ==========================================================
     CLEANUP
  ========================================================== */

  useEffect(() => {
    return () => {
      if (searchTimerRef.current) {
        clearTimeout(
          searchTimerRef.current
        );
      }
    };
  }, []);

  /* ==========================================================
     KEYBOARD SHORTCUTS
  ========================================================== */

  useEffect(() => {
    const handleKeyDown = (event) => {
      const modifier =
        event.ctrlKey || event.metaKey;

      /* Ctrl/Cmd + K */
      if (
        modifier &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();

        searchInputRef.current?.focus();
        searchInputRef.current?.select();

        return;
      }

      /* Escape */
      if (event.key === "Escape") {
        setProfileOpen(false);

        if (
          document.activeElement ===
          searchInputRef.current
        ) {
          searchInputRef.current.blur();
        }
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  /* ==========================================================
     OUTSIDE CLICK
  ========================================================== */

  useEffect(() => {
    if (!profileOpen) return;

    const handleOutsideClick = (event) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(
          event.target
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [profileOpen]);

  /* ==========================================================
     CLOSE PROFILE ON ROUTE CHANGE
  ========================================================== */

  useEffect(() => {
    setProfileOpen(false);
  }, [location.pathname]);

  /* ==========================================================
     SEARCH
  ========================================================== */

  const triggerSearch = useCallback(
    (value) => {
      if (
        typeof onSearch !== "function"
      ) {
        return;
      }

      if (searchTimerRef.current) {
        clearTimeout(
          searchTimerRef.current
        );
      }

      searchTimerRef.current =
        setTimeout(() => {
          onSearch(value);
        }, SEARCH_DEBOUNCE);
    },
    [onSearch]
  );

  const handleSearchChange =
    useCallback(
      (event) => {
        const value =
          event.target.value;

        setSearch(value);
        triggerSearch(value);
      },
      [triggerSearch]
    );

  const handleSearchSubmit =
    useCallback(
      (event) => {
        event.preventDefault();

        const value =
          search.trim();

        if (!value) return;

        if (
          typeof onSearch ===
          "function"
        ) {
          onSearch(value);
          return;
        }

        navigate(
          `/documents?search=${encodeURIComponent(
            value
          )}`
        );
      },
      [
        navigate,
        onSearch,
        search,
      ]
    );

  const clearSearch =
    useCallback(() => {
      if (searchTimerRef.current) {
        clearTimeout(
          searchTimerRef.current
        );
      }

      setSearch("");
      onSearch?.("");

      searchInputRef.current?.focus();
    }, [onSearch]);

  /* ==========================================================
     PROFILE
  ========================================================== */

  const toggleProfile =
    useCallback(() => {
      setProfileOpen(
        (previous) => !previous
      );
    }, []);

  const closeProfile =
    useCallback(() => {
      setProfileOpen(false);
    }, []);

  /* ==========================================================
     LOGOUT
  ========================================================== */

  const handleLogout =
    useCallback(async () => {
      if (loggingOut) return;

      setLoggingOut(true);

      try {
        await logout?.();
      } catch (error) {
        console.error(
          "SyncDoc logout failed:",
          error
        );
      } finally {
        setProfileOpen(false);
        setLoggingOut(false);

        navigate("/login", {
          replace: true,
        });
      }
    }, [
      loggingOut,
      logout,
      navigate,
    ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <header
      className={classes}
      role="banner"
    >
      {/* ======================================================
          LEFT SECTION
      ====================================================== */}

      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu icon-btn"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          aria-controls="mobile-navigation"
          title="Open navigation"
        >
          <span aria-hidden="true">
            ☰
          </span>
        </button>

        <div
          className="topbar-context"
          aria-label={`Current area: ${context}`}
        >
          <span
            className="context-dot"
            aria-hidden="true"
          />

          <span className="topbar-context-label">
            {context}
          </span>
        </div>
      </div>

      {/* ======================================================
          GLOBAL SEARCH
      ====================================================== */}

      <form
        className={[
          "global-search",
          search
            ? "has-value"
            : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="search"
        onSubmit={
          handleSearchSubmit
        }
      >
        <span
          className="global-search-icon"
          aria-hidden="true"
        >
          ⌕
        </span>

        <input
          ref={searchInputRef}
          id="global-search"
          name="search"
          type="search"
          value={search}
          onChange={
            handleSearchChange
          }
          placeholder={placeholder}
          aria-label="Search SyncDoc"
          autoComplete="off"
          spellCheck="false"
        />

        {/* Clear */}
        {search && (
          <button
            type="button"
            className="search-clear icon-btn"
            onClick={
              clearSearch
            }
            aria-label="Clear search"
            title="Clear search"
          >
            ×
          </button>
        )}

        {/* Shortcut */}
        {!search && (
          <kbd
            className="search-shortcut"
            aria-label="Control K"
          >
            <span>
              Ctrl
            </span>
            <span>K</span>
          </kbd>
        )}
      </form>

      {/* ======================================================
          RIGHT SECTION
      ====================================================== */}

      <div className="topbar-actions">
        {/* Notifications */}
        <div className="topbar-action">
          <NotificationBell />
        </div>

        {/* ====================================================
            PROFILE MENU
        ==================================================== */}

        <div
          ref={profileRef}
          className="profile-menu"
        >
          <button
            type="button"
            className="profile-trigger"
            onClick={
              toggleProfile
            }
            aria-haspopup="menu"
            aria-expanded={
              profileOpen
            }
            aria-controls={
              profileOpen
                ? "profile-dropdown"
                : undefined
            }
          >
            <div className="profile-avatar-wrapper">
              <Avatar
                user={user}
                name={userName}
                size="sm"
                status="online"
              />

              <span
                className="profile-online-dot"
                aria-hidden="true"
              />
            </div>

            <span className="profile-name">
              {userName}
            </span>

            <span
              className={[
                "profile-chevron",
                profileOpen
                  ? "profile-chevron-open"
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-hidden="true"
            >
              ⌄
            </span>
          </button>

          {/* ==================================================
              DROPDOWN
          ================================================== */}

          {profileOpen && (
            <div
              id="profile-dropdown"
              className="profile-dropdown"
              role="menu"
              aria-label="Profile menu"
            >
              {/* User information */}
              <div className="profile-dropdown-head">
                <div className="profile-dropdown-avatar">
                  <Avatar
                    user={user}
                    name={userName}
                    size="md"
                    status="online"
                  />

                  <span
                    className="profile-avatar-fallback"
                    aria-hidden="true"
                  >
                    {initials}
                  </span>
                </div>

                <div className="profile-dropdown-user">
                  <strong
                    title={userName}
                  >
                    {userName}
                  </strong>

                  <small
                    title={
                      user?.email ||
                      "Workspace member"
                    }
                  >
                    {user?.email ||
                      "Workspace member"}
                  </small>

                  <span className="profile-role">
                    {userRole}
                  </span>
                </div>
              </div>

              <div className="profile-dropdown-divider" />

              {/* Profile */}
              <Link
                to="/profile"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={
                  closeProfile
                }
              >
                <span
                  className="profile-item-icon"
                  aria-hidden="true"
                >
                  ◉
                </span>

                <span>
                  My profile
                </span>
              </Link>

              {/* Documents */}
              <Link
                to="/documents"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={
                  closeProfile
                }
              >
                <span
                  className="profile-item-icon"
                  aria-hidden="true"
                >
                  ▤
                </span>

                <span>
                  Documents
                </span>
              </Link>

              {/* Workspace */}
              <Link
                to="/workspace"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={
                  closeProfile
                }
              >
                <span
                  className="profile-item-icon"
                  aria-hidden="true"
                >
                  ▦
                </span>

                <span>
                  Workspace
                </span>
              </Link>

              {/* Settings */}
              <Link
                to="/settings"
                className="profile-dropdown-item"
                role="menuitem"
                onClick={
                  closeProfile
                }
              >
                <span
                  className="profile-item-icon"
                  aria-hidden="true"
                >
                  ⚙
                </span>

                <span>
                  Settings
                </span>
              </Link>

              <div className="profile-dropdown-divider" />

              {/* Logout */}
              <button
                type="button"
                className="profile-dropdown-item profile-logout"
                role="menuitem"
                onClick={
                  handleLogout
                }
                disabled={
                  loggingOut
                }
              >
                <span
                  className="profile-item-icon"
                  aria-hidden="true"
                >
                  {loggingOut
                    ? "…"
                    : "↪"}
                </span>

                <span>
                  {loggingOut
                    ? "Signing out..."
                    : "Sign out"}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}