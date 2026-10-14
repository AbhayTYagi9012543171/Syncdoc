import "./WorkspacePremium.css";
import React, { useCallback, useMemo } from "react";
import { useWorkspace } from "../../context/WorkspaceContext";

/* ============================================================
   HELPERS
============================================================ */

const getWorkspaceId = (workspace) => {
  if (!workspace || typeof workspace !== "object") {
    return "";
  }

  return String(
    workspace.id ??
      workspace._id ??
      workspace.workspaceId ??
      ""
  ).trim();
};

const getWorkspaceName = (workspace) => {
  if (!workspace || typeof workspace !== "object") {
    return "My Workspace";
  }

  const name =
    workspace.name ??
    workspace.title ??
    workspace.workspaceName;

  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return "My Workspace";
};

const getWorkspacePlan = (workspace) => {
  if (!workspace || typeof workspace !== "object") {
    return "Professional";
  }

  const plan =
    workspace.plan ??
    workspace.subscription?.plan ??
    workspace.subscriptionPlan ??
    workspace.billing?.plan;

  if (typeof plan === "string" && plan.trim()) {
    return formatPlanName(plan);
  }

  return "Professional";
};

const formatPlanName = (plan) => {
  return String(plan)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getWorkspaceInitial = (name) => {
  if (!name) {
    return "W";
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return words[0][0].toUpperCase();
};

/* ============================================================
   COMPONENT
============================================================ */

export default function WorkspaceSwitcher({
  compact = false,
  className = "",
  disabled = false,
}) {
  const workspaceContext = useWorkspace() || {};

  const {
    workspace = null,
    workspaces = [],
    setWorkspace,
  } = workspaceContext;

  /* ==========================================================
     NORMALIZE WORKSPACES
  ========================================================== */

  const safeWorkspaces = useMemo(() => {
    if (!Array.isArray(workspaces)) {
      return [];
    }

    const normalized = workspaces
      .filter(
        (item) =>
          item &&
          typeof item === "object"
      )
      .map((item) => ({
        workspace: item,
        id: getWorkspaceId(item),
        name: getWorkspaceName(item),
      }))
      .filter((item) => item.id);

    /*
     * Prevent duplicate workspace IDs from producing
     * duplicate <option> elements.
     */
    const seen = new Set();

    return normalized.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
  }, [workspaces]);

  /* ==========================================================
     CURRENT WORKSPACE
  ========================================================== */

  const currentWorkspaceId = useMemo(
    () => getWorkspaceId(workspace),
    [workspace]
  );

  const currentWorkspaceName = useMemo(
    () => getWorkspaceName(workspace),
    [workspace]
  );

  const currentWorkspacePlan = useMemo(
    () => getWorkspacePlan(workspace),
    [workspace]
  );

  const workspaceInitial = useMemo(
    () => getWorkspaceInitial(currentWorkspaceName),
    [currentWorkspaceName]
  );

  /* ==========================================================
     CLASSES
  ========================================================== */

  const classes = [
    "workspace-switcher",
    compact ? "compact" : "",
    disabled ? "workspace-switcher-disabled" : "",
    safeWorkspaces.length <= 1
      ? "workspace-switcher-single"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ==========================================================
     WORKSPACE CHANGE
  ========================================================== */

  const handleChange = useCallback(
    (event) => {
      if (disabled) {
        return;
      }

      const selectedId = String(
        event.target.value || ""
      ).trim();

      if (!selectedId) {
        return;
      }

      const selectedWorkspace =
        safeWorkspaces.find(
          (item) => item.id === selectedId
        );

      if (
        !selectedWorkspace ||
        typeof setWorkspace !== "function"
      ) {
        return;
      }

      /*
       * Avoid unnecessary context updates when
       * the currently selected workspace is chosen.
       */
      if (selectedId === currentWorkspaceId) {
        return;
      }

      setWorkspace(selectedWorkspace.workspace);
    },
    [
      disabled,
      safeWorkspaces,
      setWorkspace,
      currentWorkspaceId,
    ]
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      className={classes}
      data-workspace-id={
        currentWorkspaceId || undefined
      }
      data-compact={compact ? "true" : "false"}
    >
      {/* ======================================================
          WORKSPACE ICON
      ====================================================== */}

      <div
        className="workspace-symbol"
        aria-hidden="true"
        title={currentWorkspaceName}
      >
        {workspaceInitial}
      </div>

      {/* ======================================================
          WORKSPACE INFORMATION
      ====================================================== */}

      <div className="workspace-switcher-text">
        <strong
          title={currentWorkspaceName}
        >
          {currentWorkspaceName}
        </strong>

        {!compact && (
          <small
            title={`${currentWorkspacePlan} plan`}
          >
            {currentWorkspacePlan}
          </small>
        )}
      </div>

      {/* ======================================================
          WORKSPACE SELECTOR
      ====================================================== */}

      {safeWorkspaces.length > 1 && (
        <select
          className="workspace-switcher-select"
          aria-label={`Current workspace: ${currentWorkspaceName}. Select workspace`}
          value={currentWorkspaceId}
          onChange={handleChange}
          disabled={disabled}
        >
          {safeWorkspaces.map(
            ({ id, name }) => (
              <option
                key={id}
                value={id}
              >
                {name}
              </option>
            )
          )}
        </select>
      )}

      {/* ======================================================
          SELECT INDICATOR
      ====================================================== */}

      {safeWorkspaces.length > 1 && (
        <span
          className="workspace-switcher-chevron"
          aria-hidden="true"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      )}
    </div>
  );
}