import "./WorkspacePremium.css";
import React, { useCallback, useMemo } from "react";
import Avatar from "../common/Avatar";

/* ============================================================
   SYNCDOC — WORKSPACE CARD
============================================================ */

/* ============================================================
   HELPERS
============================================================ */

const isObject = (value) =>
  value !== null && typeof value === "object";

/**
 * Safely convert a value to a string.
 */
const toString = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
};

/**
 * Get workspace ID from different API response shapes.
 */
const getWorkspaceId = (workspace) => {
  if (!isObject(workspace)) {
    return "";
  }

  return toString(
    workspace.id ||
      workspace._id ||
      workspace.workspaceId ||
      workspace.workspace_id
  );
};

/**
 * Get workspace display name.
 */
const getWorkspaceName = (workspace) => {
  if (!isObject(workspace)) {
    return "My Workspace";
  }

  const name =
    workspace.name ||
    workspace.title ||
    workspace.workspaceName ||
    workspace.workspace_name;

  return toString(name) || "My Workspace";
};

/**
 * Get workspace member collection.
 */
const getMembers = (workspace) => {
  if (!isObject(workspace)) {
    return [];
  }

  if (Array.isArray(workspace.members)) {
    return workspace.members;
  }

  if (Array.isArray(workspace.collaborators)) {
    return workspace.collaborators;
  }

  if (Array.isArray(workspace.users)) {
    return workspace.users;
  }

  return [];
};

/**
 * Get member count.
 */
const getMemberCount = (workspace, members = []) => {
  if (!isObject(workspace)) {
    return members.length;
  }

  if (Array.isArray(workspace.members)) {
    return workspace.members.length;
  }

  if (Array.isArray(workspace.collaborators)) {
    return workspace.collaborators.length;
  }

  if (Array.isArray(workspace.users)) {
    return workspace.users.length;
  }

  const numericCount =
    workspace.memberCount ??
    workspace.membersCount ??
    workspace.userCount;

  if (
    typeof numericCount === "number" &&
    Number.isFinite(numericCount) &&
    numericCount >= 0
  ) {
    return numericCount;
  }

  return members.length;
};

/**
 * Get document count.
 */
const getDocumentCount = (workspace) => {
  if (!isObject(workspace)) {
    return 0;
  }

  if (Array.isArray(workspace.documents)) {
    return workspace.documents.length;
  }

  const numericCount =
    workspace.documentCount ??
    workspace.documentsCount ??
    workspace.docsCount;

  if (
    typeof numericCount === "number" &&
    Number.isFinite(numericCount) &&
    numericCount >= 0
  ) {
    return numericCount;
  }

  return 0;
};

/**
 * Get actual user object from a workspace member.
 *
 * Supported shapes:
 *
 * {
 *   user: {...},
 *   role: "editor"
 * }
 *
 * {
 *   _id,
 *   username,
 *   avatar
 * }
 *
 * "user-id"
 */
const getMemberUser = (member) => {
  if (!member) {
    return null;
  }

  if (typeof member === "string") {
    return member;
  }

  if (!isObject(member)) {
    return null;
  }

  if (member.user) {
    return member.user;
  }

  if (member.profile) {
    return member.profile;
  }

  return member;
};

/**
 * Get stable member key.
 */
const getMemberKey = (member, index) => {
  if (typeof member === "string") {
    return `${member}-${index}`;
  }

  if (!isObject(member)) {
    return `member-${index}`;
  }

  const user = getMemberUser(member);

  return toString(
    member.id ||
      member._id ||
      member.userId ||
      member.user_id ||
      user?.id ||
      user?._id ||
      user?.userId ||
      `member-${index}`
  );
};

/**
 * Get readable name for a member.
 */
const getMemberName = (member) => {
  const user = getMemberUser(member);

  if (typeof user === "string") {
    return user;
  }

  if (!isObject(user)) {
    return "Workspace member";
  }

  return (
    user.displayName ||
    user.name ||
    user.username ||
    user.email ||
    "Workspace member"
  );
};

/**
 * Generate workspace initials.
 *
 * "My Workspace" -> MW
 * "Design Team" -> DT
 * "Workspace" -> W
 */
const getWorkspaceInitials = (name) => {
  const cleanName = toString(name);

  if (!cleanName) {
    return "W";
  }

  const words = cleanName
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
};

/* ============================================================
   COMPONENT
============================================================ */

export default function WorkspaceCard({
  workspace,
  onOpen,
  className = "",
  disabled = false,
}) {
  /* ----------------------------------------------------------
     WORKSPACE DATA
  ---------------------------------------------------------- */

  const workspaceId = useMemo(
    () => getWorkspaceId(workspace),
    [workspace]
  );

  const workspaceName = useMemo(
    () => getWorkspaceName(workspace),
    [workspace]
  );

  const members = useMemo(
    () => getMembers(workspace),
    [workspace]
  );

  const memberCount = useMemo(
    () => getMemberCount(workspace, members),
    [workspace, members]
  );

  const documentCount = useMemo(
    () => getDocumentCount(workspace),
    [workspace]
  );

  const workspaceInitials = useMemo(
    () => getWorkspaceInitials(workspaceName),
    [workspaceName]
  );

  /* ----------------------------------------------------------
     VISIBLE MEMBERS
  ---------------------------------------------------------- */

  const visibleMembers = useMemo(
    () => members.slice(0, 4),
    [members]
  );

  const remainingMembers = Math.max(
    memberCount - visibleMembers.length,
    0
  );

  /* ----------------------------------------------------------
     HANDLERS
  ---------------------------------------------------------- */

  const handleOpen = useCallback(() => {
    if (disabled) {
      return;
    }

    if (typeof onOpen === "function") {
      onOpen(workspace);
    }
  }, [disabled, onOpen, workspace]);

  /* ----------------------------------------------------------
     ACCESSIBILITY
  ---------------------------------------------------------- */

  const memberLabel =
    memberCount === 1
      ? "1 member"
      : `${memberCount} members`;

  const documentLabel =
    documentCount === 1
      ? "1 document"
      : `${documentCount} documents`;

  const ariaLabel = disabled
    ? `${workspaceName} workspace`
    : `Open ${workspaceName} workspace`;

  /* ----------------------------------------------------------
     CLASS NAMES
  ---------------------------------------------------------- */

  const classes = [
    "workspace-card",
    disabled ? "workspace-card-disabled" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <button
      type="button"
      className={classes}
      onClick={handleOpen}
      disabled={disabled}
      data-workspace-id={workspaceId || undefined}
      data-workspace-name={workspaceName}
      aria-label={ariaLabel}
      aria-disabled={disabled}
    >
      {/* ======================================================
          WORKSPACE ICON
      ====================================================== */}

      <span
        className="workspace-card-icon"
        aria-hidden="true"
      >
        {workspaceInitials}
      </span>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <span className="workspace-card-content">
        <span className="workspace-card-title-row">
          <span
            className="workspace-card-title"
            title={workspaceName}
          >
            {workspaceName}
          </span>

          {!disabled && (
            <span
              className="workspace-card-arrow"
              aria-hidden="true"
            >
              →
            </span>
          )}
        </span>

        {/* ====================================================
            META
        ==================================================== */}

        <span
          className="workspace-card-meta"
          aria-label={`${memberLabel}, ${documentLabel}`}
        >
          <span>{memberLabel}</span>

          <span
            className="workspace-card-meta-dot"
            aria-hidden="true"
          >
            ·
          </span>

          <span>{documentLabel}</span>
        </span>

        {/* ====================================================
            MEMBERS
        ==================================================== */}

        {memberCount > 0 && (
          <span
            className="workspace-avatars"
            aria-label={`${memberCount} workspace members`}
          >
            {visibleMembers.map((member, index) => {
              const person = getMemberUser(member);
              const key = getMemberKey(member, index);
              const memberName = getMemberName(member);

              return (
                <span
                  key={key}
                  className="workspace-avatar-item"
                  title={memberName}
                >
                  <Avatar
                    user={person}
                    name={person}
                    size="xs"
                  />
                </span>
              );
            })}

            {/* ----------------------------------------------
                Remaining members
            ---------------------------------------------- */}

            {remainingMembers > 0 && (
              <span
                className="workspace-avatar-more"
                title={`${remainingMembers} more ${
                  remainingMembers === 1
                    ? "member"
                    : "members"
                }`}
                aria-label={`${remainingMembers} more ${
                  remainingMembers === 1
                    ? "member"
                    : "members"
                }`}
              >
                +{remainingMembers}
              </span>
            )}
          </span>
        )}
      </span>
    </button>
  );
}