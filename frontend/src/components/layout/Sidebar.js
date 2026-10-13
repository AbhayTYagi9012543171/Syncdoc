
import React, { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

import Avatar from "../common/Avatar";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import "./SidebarPremium.css";

const navigationGroups = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: "▦" },
      { label: "Documents", path: "/documents", icon: "▤" },
      { label: "Projects", path: "/projects", icon: "◇" },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { label: "Workspace", path: "/workspace", icon: "◉" },
      { label: "Analytics", path: "/analytics", icon: "⌁" },
    ],
  },
  {
    title: "ACCOUNT",
    items: [
      { label: "Notifications", path: "/notifications", icon: "♧" },
      { label: "Trash", path: "/trash", icon: "⌫" },
      { label: "Settings", path: "/settings", icon: "⚙" },
    ],
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

function getWorkspaceId(workspace) {
  return String(
    workspace?.id ||
      workspace?._id ||
      workspace?.workspaceId ||
      ""
  );
}

function getInitials(name = "User") {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onClose,
  onToggle,
}) {
  const { user, logout } = useAuth();

  const {
    workspaces = [],
    currentWorkspace,
    activeWorkspace,
    selectWorkspace,
    loading: workspaceLoading,
  } = useWorkspace();

  const location = useLocation();
  const workspaceMenuRef = useRef(null);

  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const userName = useMemo(() => getUserName(user), [user]);

  const selectedWorkspace =
    currentWorkspace || activeWorkspace || workspaces[0] || null;

  const selectedWorkspaceId = getWorkspaceId(selectedWorkspace);

  const workspaceName =
    selectedWorkspace?.name ||
    selectedWorkspace?.title ||
    selectedWorkspace?.workspaceName ||
    "My Workspace";

  const workspacePlan =
    selectedWorkspace?.plan || "Professional";

  useEffect(() => {
    setWorkspaceMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!workspaceMenuOpen) return undefined;

    const handleOutsideClick = (event) => {
      if (
        workspaceMenuRef.current &&
        !workspaceMenuRef.current.contains(event.target)
      ) {
        setWorkspaceMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setWorkspaceMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [workspaceMenuOpen]);

  const handleWorkspaceSelect = (workspace) => {
    if (typeof selectWorkspace === "function") {
      selectWorkspace(workspace);
    }

    setWorkspaceMenuOpen(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await logout?.();
    } catch (error) {
      console.error("SyncDoc logout failed:", error);
      setLogoutError("Sign out failed. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleNavigation = () => {
    onClose?.();
    setWorkspaceMenuOpen(false);
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="sidebar-premium-overlay"
          aria-label="Close navigation menu"
          onClick={onClose}
        />
      )}

      <aside
        id="mobile-navigation"
        className={[
          "sidebar-premium",
          collapsed ? "is-collapsed" : "",
          mobileOpen ? "is-mobile-open" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label="Application sidebar"
      >
        {/* Brand */}
        <div className="sp-brand-row">
          <NavLink
            to="/dashboard"
            className="sp-brand"
            onClick={handleNavigation}
            aria-label="SyncDoc dashboard"
          >
            <span className="sp-brand-mark">S</span>

            {!collapsed && (
              <span className="sp-brand-copy">
                <strong>SyncDoc</strong>
                <small>WORKSPACE</small>
              </span>
            )}
          </NavLink>

          {onClose && (
            <button
              type="button"
              className="sp-icon-button sp-mobile-close"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              ×
            </button>
          )}
        </div>

        {/* Workspace selector */}
        <div className="sp-workspace-area" ref={workspaceMenuRef}>
          {!collapsed && (
            <div className="sp-section-label">YOUR WORKSPACE</div>
          )}

          <button
            type="button"
            className={`sp-workspace-trigger ${
              workspaceMenuOpen ? "is-open" : ""
            }`}
            onClick={() => setWorkspaceMenuOpen((open) => !open)}
            aria-expanded={workspaceMenuOpen}
            aria-haspopup="listbox"
            title={workspaceName}
          >
            <span className="sp-workspace-avatar" aria-hidden="true">
              {getInitials(workspaceName)}
            </span>

            {!collapsed && (
              <>
                <span className="sp-workspace-copy">
                  <strong>{workspaceName}</strong>
                  <small>{workspacePlan}</small>
                </span>

                <span className="sp-chevron" aria-hidden="true">
                  {workspaceMenuOpen ? "⌃" : "⌄"}
                </span>
              </>
            )}
          </button>

          {workspaceMenuOpen && !collapsed && (
            <div
              className="sp-workspace-menu"
              role="listbox"
              aria-label="Choose workspace"
            >
              <div className="sp-menu-heading">
                <span>Switch workspace</span>
                <span className="sp-workspace-count">
                  {workspaces.length}
                </span>
              </div>

              {workspaceLoading && (
                <div className="sp-menu-message">
                  Loading workspaces…
                </div>
              )}

              {!workspaceLoading && workspaces.length === 0 && (
                <div className="sp-menu-message">
                  No workspaces available.
                </div>
              )}

              {!workspaceLoading &&
                workspaces.map((workspace) => {
                  const id = getWorkspaceId(workspace);
                  const name =
                    workspace.name ||
                    workspace.title ||
                    workspace.workspaceName ||
                    "My Workspace";
                  const isSelected = id === selectedWorkspaceId;

                  return (
                    <button
                      key={id || name}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={`sp-workspace-option ${
                        isSelected ? "is-selected" : ""
                      }`}
                      onClick={() => handleWorkspaceSelect(workspace)}
                    >
                      <span className="sp-option-avatar">
                        {getInitials(name)}
                      </span>

                      <span className="sp-option-copy">
                        <strong>{name}</strong>
                        <small>{workspace.plan || "Workspace"}</small>
                      </span>

                      {isSelected && (
                        <span className="sp-selected-check">✓</span>
                      )}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sp-navigation" aria-label="Main navigation">
          {navigationGroups.map((group) => (
            <section className="sp-nav-section" key={group.title}>
              {!collapsed && (
                <div className="sp-section-label">{group.title}</div>
              )}

              <div className="sp-nav-list">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={handleNavigation}
                    title={collapsed ? item.label : undefined}
                    aria-label={item.label}
                    className={({ isActive }) =>
                      `sp-nav-link ${isActive ? "is-active" : ""}`
                    }
                  >
                    <span className="sp-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="sp-nav-label">{item.label}</span>
                    )}

                    {!collapsed && item.path === "/notifications" && (
                      <span className="sp-nav-dot" aria-label="Notifications" />
                    )}

                    <span className="sp-nav-tooltip" aria-hidden="true">
                      {item.label}
                    </span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="sp-bottom">
          {!collapsed && (
            <a
              className="sp-help-card"
              href="mailto:support@syncdoc.app"
              onClick={onClose}
            >
              <span className="sp-help-icon" aria-hidden="true">?</span>

              <span className="sp-help-copy">
                <strong>Need a hand?</strong>
                <small>Contact our support team</small>
              </span>

              <span className="sp-help-arrow" aria-hidden="true">↗</span>
            </a>
          )}

          {logoutError && (
            <p className="sp-logout-error" role="alert">
              {logoutError}
            </p>
          )}

          <div className="sp-user-card">
            <Avatar
              user={user}
              name={userName}
              size="md"
              status="online"
            />

            {!collapsed && (
              <div className="sp-user-copy">
                <strong title={userName}>{userName}</strong>
                <small title={user?.email || ""}>
                  {user?.email || "Workspace member"}
                </small>
              </div>
            )}

            {!collapsed && (
              <button
                type="button"
                className="sp-logout-button"
                onClick={handleLogout}
                disabled={loggingOut}
                title={loggingOut ? "Signing out…" : "Sign out"}
                aria-label={loggingOut ? "Signing out" : "Sign out"}
              >
                {loggingOut ? (
                  <span className="sp-button-spinner" />
                ) : (
                  "↗"
                )}
              </button>
            )}
          </div>

          {onToggle && (
            <button
              type="button"
              className="sp-collapse-button"
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
            >
              <span className="sp-collapse-icon" aria-hidden="true">
                {collapsed ? "→" : "←"}
              </span>

              {!collapsed && <span>Collapse sidebar</span>}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
