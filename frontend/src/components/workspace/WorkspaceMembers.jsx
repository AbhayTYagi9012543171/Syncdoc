import "./WorkspacePremium.css";
import React, { useCallback, useMemo } from "react";
import Avatar from "../common/Avatar";
import resolveAssetUrl from '../../utils/resolveAssetUrl';

/* ============================================================
   HELPERS
============================================================ */

/**
 * Extract the actual user object from a workspace member.
 *
 * Supported formats:
 * 1. { user: {...}, role: "editor" }
 * 2. { displayName, username, email, ... }
 */
const getUserFromMember = (member) => {
  if (!member || typeof member !== "object") {
    return null;
  }

  if (
    member.user &&
    typeof member.user === "object" &&
    !Array.isArray(member.user)
  ) {
    return member.user;
  }

  if (
    member.displayName ||
    member.username ||
    member.name ||
    member.fullName ||
    member.email
  ) {
    return member;
  }

  return null;
};

/**
 * Get stable member/user ID.
 */
const getUserId = (member) => {
  if (!member || typeof member !== "object") {
    return null;
  }

  const user = getUserFromMember(member);

  return (
    user?.id ||
    user?._id ||
    member.id ||
    member._id ||
    member.userId ||
    null
  );
};

/**
 * Get display name.
 */
const getUserName = (member) => {
  const user = getUserFromMember(member);

  if (!user) {
    return "User";
  }

  return (
    user.displayName ||
    user.username ||
    user.name ||
    user.fullName ||
    user.email ||
    "User"
  );
};

/**
 * Get username.
 */
const getUsername = (member) => {
  const user = getUserFromMember(member);

  if (!user?.username) {
    return "";
  }

  return String(user.username).replace(/^@/, "");
};

/**
 * Get email.
 */
const getUserEmail = (member) => {
  const user = getUserFromMember(member);

  return user?.email || "";
};

/**
 * Get avatar source.
 */
const getUserAvatar = (member) => {
  const user = getUserFromMember(member);

  return (
    user?.avatar ||
    user?.avatarUrl ||
    user?.photoURL ||
    user?.photoUrl ||
    user?.profileImage ||
    user?.profilePicture ||
    null
  );
};

/**
 * Get online status.
 */
const getUserOnlineStatus = (member) => {
  if (!member || typeof member !== "object") {
    return false;
  }

  const user = getUserFromMember(member);

  return Boolean(
    user?.isOnline ??
      user?.online ??
      member.isOnline ??
      member.online ??
      false
  );
};

/**
 * Normalize role for display.
 */
const formatRole = (role) => {
  if (!role) {
    return "Member";
  }

  return String(role)
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

/**
 * Normalize date safely.
 */
const parseDate = (value) => {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Format last active date.
 */
const formatLastActive = (value) => {
  const date = parseDate(value);

  if (!date) {
    return "Recently active";
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

/**
 * Format last active date/time.
 */
const formatLastActiveTime = (value) => {
  const date = parseDate(value);

  if (!date) {
    return "Recently active";
  }

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

/**
 * Get role class.
 */
const getRoleClass = (role) => {
  const normalized = String(role || "member").toLowerCase();

  return `workspace-member-role-${normalized}`;
};

/**
 * Get member key.
 */
const getMemberKey = (member, index) => {
  return (
    getUserId(member) ||
    member?.membershipId ||
    member?.memberId ||
    `workspace-member-${index}`
  );
};

/* ============================================================
   SKELETON
============================================================ */

const MemberSkeleton = () => {
  return (
    <div
      className="workspace-member workspace-member-skeleton-row"
      aria-hidden="true"
    >
      <div className="workspace-member-user">
        <div className="workspace-member-skeleton-avatar" />

        <div className="workspace-member-skeleton-info">
          <span className="workspace-member-skeleton-line workspace-member-skeleton-name" />
          <span className="workspace-member-skeleton-line workspace-member-skeleton-subtitle" />
        </div>
      </div>

      <div className="workspace-member-skeleton-meta">
        <span className="workspace-member-skeleton-pill" />
      </div>
    </div>
  );
};

/* ============================================================
   EMPTY STATE
============================================================ */

const EmptyMembers = () => {
  return (
    <div className="workspace-members-empty">
      <div
        className="workspace-members-empty-icon"
        aria-hidden="true"
      >
        <span>👥</span>
      </div>

      <h3>No workspace members</h3>

      <p>
        Invite people to this workspace to start collaborating
        together.
      </p>
    </div>
  );
};

/* ============================================================
   ERROR STATE
============================================================ */

const MembersError = ({ error }) => {
  return (
    <div
      className="workspace-members-error"
      role="alert"
    >
      <div
        className="workspace-members-error-icon"
        aria-hidden="true"
      >
        !
      </div>

      <div>
        <strong>Unable to load members</strong>

        <span>
          {String(error || "Something went wrong while loading workspace members.")}
        </span>
      </div>
    </div>
  );
};

/* ============================================================
   MEMBER ITEM
============================================================ */

const MemberItem = ({
  member,
  index,
  canManage,
  onRemove,
  onUpdateRole,
}) => {
  const user = getUserFromMember(member);

  const userId = getUserId(member);

  const name = getUserName(member);

  const username = getUsername(member);

  const email = getUserEmail(member);

  const avatar = getUserAvatar(member);

  const online = getUserOnlineStatus(member);

  const role = String(member?.role || "member").toLowerCase();

  const formattedRole = formatRole(role);

  const lastActive = formatLastActive(member?.lastActive);

  const lastActiveTime = formatLastActiveTime(
    member?.lastActive
  );

  const memberKey = getMemberKey(member, index);

  const handleRoleChange = useCallback(
    (event) => {
      if (typeof onUpdateRole !== "function") {
        return;
      }

      const nextRole = event.target.value;

      const id =
        userId ||
        member?.id ||
        member?._id ||
        member?.membershipId;

      if (!id) {
        return;
      }

      onUpdateRole(id, nextRole, member);
    },
    [member, onUpdateRole, userId]
  );

  const handleRemove = useCallback(() => {
    if (typeof onRemove !== "function") {
      return;
    }

    const id =
      userId ||
      member?.id ||
      member?._id ||
      member?.membershipId;

    if (!id) {
      return;
    }

    onRemove(id, member);
  }, [member, onRemove, userId]);

  const statusText = online
    ? "Online now"
    : lastActive;

  return (
    <article
      className={[
        "workspace-member",
        online ? "workspace-member-online" : "",
        canManage ? "workspace-member-manageable" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      data-member-id={userId || undefined}
      data-role={role}
      key={memberKey}
    >
      {/* ======================================================
          USER
      ====================================================== */}

      <div className="workspace-member-user">
        <Avatar
          user={user || { displayName: name }}
          src={resolveAssetUrl(avatar)}
          size="md"
          online={online}
          showStatus
        />

        <div className="workspace-member-info">
          <div className="workspace-member-name-row">
            <strong className="workspace-member-name">
              {name}
            </strong>

            {role === "owner" && (
              <span
                className="workspace-member-owner-badge"
                title="Workspace owner"
              >
                Owner
              </span>
            )}
          </div>

          {username ? (
            <span className="workspace-member-username">
              @{username}
            </span>
          ) : email ? (
            <span className="workspace-member-username">
              {email}
            </span>
          ) : (
            <span className="workspace-member-username">
              Workspace member
            </span>
          )}
        </div>
      </div>

      {/* ======================================================
          META
      ====================================================== */}

      <div className="workspace-member-meta">
        {canManage ? (
          <label className="workspace-member-role-control">
            <span className="sr-only">
              Role for {name}
            </span>

            <select
              className={[
                "workspace-member-role",
                getRoleClass(role),
              ].join(" ")}
              value={role}
              onChange={handleRoleChange}
              aria-label={`Role for ${name}`}
              disabled={role === "owner"}
            >
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </label>
        ) : (
          <span
            className={[
              "workspace-member-role-badge",
              getRoleClass(role),
            ].join(" ")}
          >
            {formattedRole}
          </span>
        )}

        <span
          className={[
            "workspace-member-active",
            online
              ? "workspace-member-active-online"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={
            online
              ? "Currently online"
              : lastActiveTime
          }
        >
          <span
            className="workspace-member-status-dot"
            aria-hidden="true"
          />

          {statusText}
        </span>
      </div>

      {/* ======================================================
          ACTIONS
      ====================================================== */}

      {canManage && (
        <div className="workspace-member-actions">
          <button
            type="button"
            className="workspace-member-remove"
            onClick={handleRemove}
            disabled={role === "owner" || !userId}
            aria-label={`Remove ${name} from workspace`}
            title={
              role === "owner"
                ? "Workspace owner cannot be removed"
                : `Remove ${name}`
            }
          >
            <span aria-hidden="true">×</span>

            <span>Remove</span>
          </button>
        </div>
      )}
    </article>
  );
};

/* ============================================================
   MAIN COMPONENT
============================================================ */

const WorkspaceMembers = ({
  members = [],
  loading = false,
  error = "",
  onRemove,
  onUpdateRole,
  canManage = false,
  title = "Workspace Members",
  subtitle,
  showHeader = true,
  className = "",
}) => {
  /* ----------------------------------------------------------
     NORMALIZE MEMBERS
  ---------------------------------------------------------- */

  const normalizedMembers = useMemo(() => {
    if (!Array.isArray(members)) {
      return [];
    }

    return members.filter(
      (member) =>
        member &&
        typeof member === "object"
    );
  }, [members]);

  /* ----------------------------------------------------------
     MEMBER COUNT
  ---------------------------------------------------------- */

  const memberCount = normalizedMembers.length;

  const memberLabel =
    memberCount === 1
      ? "member"
      : "members";

  /* ----------------------------------------------------------
     CONTAINER CLASS
  ---------------------------------------------------------- */

  const containerClassName = [
    "workspace-members",
    loading ? "workspace-members-is-loading" : "",
    error ? "workspace-members-has-error" : "",
    canManage ? "workspace-members-can-manage" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <section
        className={containerClassName}
        aria-busy="true"
        aria-label="Loading workspace members"
      >
        {showHeader && (
          <header className="workspace-members-header">
            <div>
              <span className="workspace-members-eyebrow">
                COLLABORATION
              </span>

              <h2>{title}</h2>

              <p>Loading workspace members...</p>
            </div>
          </header>
        )}

        <div
          className="workspace-members-list"
          aria-hidden="true"
        >
          <MemberSkeleton />
          <MemberSkeleton />
          <MemberSkeleton />
          <MemberSkeleton />
        </div>
      </section>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error) {
    return (
      <section
        className={containerClassName}
        aria-label="Workspace members"
      >
        {showHeader && (
          <header className="workspace-members-header">
            <div>
              <span className="workspace-members-eyebrow">
                COLLABORATION
              </span>

              <h2>{title}</h2>
            </div>
          </header>
        )}

        <MembersError error={error} />
      </section>
    );
  }

  /* ==========================================================
     EMPTY
  ========================================================== */

  if (!normalizedMembers.length) {
    return (
      <section
        className={containerClassName}
        aria-label="Workspace members"
      >
        {showHeader && (
          <header className="workspace-members-header">
            <div>
              <span className="workspace-members-eyebrow">
                COLLABORATION
              </span>

              <h2>{title}</h2>

              <p>0 members</p>
            </div>
          </header>
        )}

        <EmptyMembers />
      </section>
    );
  }

  /* ==========================================================
     MAIN RENDER
  ========================================================== */

  return (
    <section
      className={containerClassName}
      aria-label="Workspace members"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      {showHeader && (
        <header className="workspace-members-header">
          <div className="workspace-members-header-copy">
            <span className="workspace-members-eyebrow">
              COLLABORATION
            </span>

            <h2>{title}</h2>

            <p>
              {subtitle ||
                `${memberCount} ${memberLabel} collaborating in this workspace`}
            </p>
          </div>

          <div
            className="workspace-members-count"
            aria-label={`${memberCount} ${memberLabel}`}
          >
            <strong>{memberCount}</strong>

            <span>{memberLabel}</span>
          </div>
        </header>
      )}

      {/* ======================================================
          MEMBER LIST
      ====================================================== */}

      <div className="workspace-members-list">
        {normalizedMembers.map(
          (member, index) => (
            <MemberItem
              key={getMemberKey(
                member,
                index
              )}
              member={member}
              index={index}
              canManage={canManage}
              onRemove={onRemove}
              onUpdateRole={
                onUpdateRole
              }
            />
          )
        )}
      </div>
    </section>
  );
};

export default WorkspaceMembers;