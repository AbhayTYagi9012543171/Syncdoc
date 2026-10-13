import React, { useMemo } from "react";
import { NavLink, useLocation } from "react-router-dom";

import Avatar from "../common/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";

/* ============================================================
   SYNCDOC — SIDEBAR
   Responsive application navigation
============================================================ */

const mainNavigation = [
  {
    label: "Dashboard",
    path: "/dashboard",
    icon: "▣",
  },
  {
    label: "Documents",
    path: "/documents",
    icon: "▤",
  },
  {
    label: "Projects",
    path: "/projects",
    icon: "▦",
  },
];

const insightNavigation = [
  {
    label: "Workspace",
    path: "/workspace",
    icon: "◉",
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: "◌",
  },
];

const accountNavigation = [
  {
    label: "Notifications",
    path: "/notifications",
    icon: "♢",
  },
  {
    label: "Trash",
    path: "/trash",
    icon: "⌫",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "⚙",
  },
];

function getUserName(user) {
  if (!user) return "User";

  return (
    user.name ||
    user.displayName ||
    user.username ||
    user.fullName ||
    user.email ||
    "User"
  );
}

function getInitials(name = "User") {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "U";

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onClose,
  onToggle,
}) {
  const { user, logout } = useAuth();
  const { workspaces = [], currentWorkspace } = useWorkspace();

  const location = useLocation();

  const userName = useMemo(
    () => getUserName(user),
    [user]
  );

  const initials = useMemo(
    () => getInitials(userName),
    [userName]
  );

  const activeWorkspace =
    currentWorkspace ||
    workspaces?.[0] ||
    null;

  const renderNavigation = (items) =>
    items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        onClick={onClose}
        className={({ isActive }) =>
          `sidebar-nav-item ${isActive ? "active" : ""
          }`
        }
      >
        <span
          className="sidebar-nav-icon"
          aria-hidden="true"
        >
          {item.icon}
        </span>

        <span className="sidebar-nav-label">
          {item.label}
        </span>
      </NavLink>
    ));

  const handleLogout = async () => {
    try {
      await logout?.();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={onClose}
        />
      )}

      <aside
        id="mobile-navigation"
        className={[
          "sidebar",
          collapsed ? "sidebar-collapsed" : "",
          mobileOpen ? "sidebar-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* ==================================================
            BRAND
        ================================================== */}

        <div className="sidebar-brand">
          <NavLink
            to="/dashboard"
            className="sidebar-brand-link"
            onClick={onClose}
          >
            <span className="sidebar-brand-mark">
              S
            </span>

            {!collapsed && (
              <span className="sidebar-brand-name">
                SyncDoc
              </span>
            )}
          </NavLink>

          {onClose && (
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={onClose}
              aria-label="Close navigation"
            >
              ×
            </button>
          )}
        </div>

        {/* ==================================================
            WORKSPACE
        ================================================== */}

        <div className="sidebar-workspace">
          {!collapsed && (
            <div className="sidebar-section-label">
              WORKSPACE
            </div>
          )}

          <button
            type="button"
            className="workspace-selector"
            title={
              activeWorkspace?.name ||
              "My Workspace"
            }
          >
            <span className="workspace-selector-icon">
              W
            </span>

            {!collapsed && (
              <>
                <span className="workspace-selector-content">
                  <strong>
                    {activeWorkspace?.name ||
                      "My Workspace"}
                  </strong>

                  <small>
                    {activeWorkspace?.plan ||
                      "Professional"}
                  </small>
                </span>

                <span className="workspace-selector-arrow">
                  ⌄
                </span>
              </>
            )}
          </button>
        </div>

        {/* ==================================================
            NAVIGATION
        ================================================== */}

        <nav
          className="sidebar-navigation"
          aria-label="Main navigation"
        >
          {!collapsed && (
            <div className="sidebar-section-label">
              MAIN
            </div>
          )}

          <div className="sidebar-nav-group">
            {renderNavigation(mainNavigation)}
          </div>

          {!collapsed && (
            <div className="sidebar-section-label sidebar-section-spaced">
              INSIGHTS
            </div>
          )}

          <div className="sidebar-nav-group">
            {renderNavigation(insightNavigation)}
          </div>

          {!collapsed && (
            <div className="sidebar-section-label sidebar-section-spaced">
              ACCOUNT
            </div>
          )}

          <div className="sidebar-nav-group">
            {renderNavigation(accountNavigation)}
          </div>
        </nav>

        {/* ==================================================
            BOTTOM AREA
        ================================================== */}

        <div className="sidebar-bottom">
          {!collapsed && (
            <div className="sidebar-help">
              <div className="sidebar-help-icon">
                ?
              </div>

              <div className="sidebar-help-content">
                <strong>Need help?</strong>

                <span>
                  Visit the SyncDoc help center.
                </span>
              </div>
            </div>
          )}

          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <Avatar
                user={user}
                name={userName}
                size="md"
                status="online"
              />

              {!collapsed && (
                <div className="sidebar-user-details">
                  <strong title={userName}>
                    {userName}
                  </strong>

                  <span
                    title={
                      user?.email ||
                      "Workspace member"
                    }
                  >
                    {user?.email ||
                      "Workspace member"}
                  </span>
                </div>
              )}
            </div>

            {!collapsed && (
              <button
                type="button"
                className="sidebar-logout"
                onClick={handleLogout}
                title="Sign out"
                aria-label="Sign out"
              >
                ↪
              </button>
            )}
          </div>

          {/* ==================================================
              COLLAPSE
          ================================================== */}

          {onToggle && (
            <button
              type="button"
              className="sidebar-collapse"
              onClick={onToggle}
              aria-label={
                collapsed
                  ? "Expand sidebar"
                  : "Collapse sidebar"
              }
            >
              <span>
                {collapsed ? "→" : "←"}
              </span>

              {!collapsed && (
                <span>Collapse</span>
              )}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}