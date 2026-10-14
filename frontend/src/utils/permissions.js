/* ============================================================
   SYNCDOC — ROLE & PERMISSION UTILITIES
   Centralized authorization helpers for the frontend.
============================================================ */

/* ============================================================
   ROLES
============================================================ */

export const ROLES = Object.freeze({
  OWNER: "owner",
  ADMIN: "admin",
  EDITOR: "editor",
  COMMENTER: "commenter",
  VIEWER: "viewer",
});

/* ============================================================
   PERMISSIONS
============================================================ */

export const PERMISSIONS = Object.freeze({
  VIEW: "view",
  COMMENT: "comment",
  EDIT: "edit",
  SHARE: "share",
  DELETE: "delete",
  MANAGE: "manage",
});

/* ============================================================
   ROLE PERMISSION MAP
============================================================ */

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.OWNER]: Object.freeze([
    PERMISSIONS.VIEW,
    PERMISSIONS.COMMENT,
    PERMISSIONS.EDIT,
    PERMISSIONS.SHARE,
    PERMISSIONS.DELETE,
    PERMISSIONS.MANAGE,
  ]),

  [ROLES.ADMIN]: Object.freeze([
    PERMISSIONS.VIEW,
    PERMISSIONS.COMMENT,
    PERMISSIONS.EDIT,
    PERMISSIONS.SHARE,
    PERMISSIONS.MANAGE,
  ]),

  [ROLES.EDITOR]: Object.freeze([
    PERMISSIONS.VIEW,
    PERMISSIONS.COMMENT,
    PERMISSIONS.EDIT,
  ]),

  [ROLES.COMMENTER]: Object.freeze([
    PERMISSIONS.VIEW,
    PERMISSIONS.COMMENT,
  ]),

  [ROLES.VIEWER]: Object.freeze([
    PERMISSIONS.VIEW,
  ]),
});

/* ============================================================
   ROLE NORMALIZATION
============================================================ */

/**
 * Normalize role values coming from the API.
 *
 * Supports:
 * - "ADMIN"
 * - "Admin"
 * - " admin "
 * - null / undefined
 */
export function normalizeRole(role) {
  if (!role) {
    return ROLES.VIEWER;
  }

  return String(role)
    .trim()
    .toLowerCase();
}

/* ============================================================
   PERMISSION NORMALIZATION
============================================================ */

function normalizePermission(permission) {
  if (!permission) {
    return "";
  }

  return String(permission)
    .trim()
    .toLowerCase();
}

/* ============================================================
   GET ROLE PERMISSIONS
============================================================ */

/**
 * Return all permissions available to a role.
 */
export function getPermissions(role) {
  const normalizedRole = normalizeRole(role);

  return (
    ROLE_PERMISSIONS[normalizedRole] || []
  );
}

/* ============================================================
   CHECK PERMISSION
============================================================ */

/**
 * Check whether a role has a specific permission.
 *
 * Example:
 *
 * can("editor", "edit")
 * // true
 *
 * can("viewer", "edit")
 * // false
 */
export function can(role, permission) {
  const normalizedRole =
    normalizeRole(role);

  const normalizedPermission =
    normalizePermission(permission);

  if (!normalizedPermission) {
    return false;
  }

  return Boolean(
    ROLE_PERMISSIONS[normalizedRole]?.includes(
      normalizedPermission
    )
  );
}

/* ============================================================
   CHECK MULTIPLE PERMISSIONS
============================================================ */

/**
 * Check whether a role has ALL requested permissions.
 *
 * Example:
 *
 * canAll("admin", ["edit", "share"])
 * // true
 */
export function canAll(role, permissions = []) {
  if (!Array.isArray(permissions)) {
    return false;
  }

  if (!permissions.length) {
    return true;
  }

  return permissions.every((permission) =>
    can(role, permission)
  );
}

/* ============================================================
   CHECK ANY PERMISSION
============================================================ */

/**
 * Check whether a role has at least ONE permission.
 *
 * Example:
 *
 * canAny("editor", ["delete", "edit"])
 * // true
 */
export function canAny(role, permissions = []) {
  if (!Array.isArray(permissions)) {
    return false;
  }

  if (!permissions.length) {
    return false;
  }

  return permissions.some((permission) =>
    can(role, permission)
  );
}

/* ============================================================
   ROLE CHECK
============================================================ */

/**
 * Check whether the current role matches
 * one of the supplied roles.
 *
 * Example:
 *
 * hasRole("admin", "admin", "owner")
 * // true
 */
export function hasRole(role, ...allowedRoles) {
  const normalizedRole =
    normalizeRole(role);

  return allowedRoles
    .filter(Boolean)
    .some(
      (allowedRole) =>
        normalizedRole ===
        normalizeRole(allowedRole)
    );
}

/* ============================================================
   ADMIN CHECK
============================================================ */

/**
 * Owners and admins can manage workspace-level
 * administration features.
 */
export function isAdmin(role) {
  return hasRole(
    role,
    ROLES.ADMIN,
    ROLES.OWNER
  );
}

/* ============================================================
   OWNER CHECK
============================================================ */

export function isOwner(role) {
  return normalizeRole(role) === ROLES.OWNER;
}

/* ============================================================
   EDITOR CHECK
============================================================ */

export function isEditor(role) {
  return hasRole(
    role,
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.EDITOR
  );
}

/* ============================================================
   COMMENTER CHECK
============================================================ */

export function isCommenter(role) {
  return hasRole(
    role,
    ROLES.OWNER,
    ROLES.ADMIN,
    ROLES.EDITOR,
    ROLES.COMMENTER
  );
}

/* ============================================================
   VIEWER CHECK
============================================================ */

export function isViewer(role) {
  return normalizeRole(role) === ROLES.VIEWER;
}

/* ============================================================
   ROLE HIERARCHY
============================================================ */

/**
 * Higher number = greater workspace authority.
 *
 * Useful for UI decisions such as:
 *
 * - Can this user manage another member?
 * - Can this role be assigned?
 * - Is this role higher/lower than another role?
 */
const ROLE_LEVELS = Object.freeze({
  [ROLES.VIEWER]: 10,
  [ROLES.COMMENTER]: 20,
  [ROLES.EDITOR]: 30,
  [ROLES.ADMIN]: 40,
  [ROLES.OWNER]: 50,
});

/* ============================================================
   ROLE LEVEL
============================================================ */

export function getRoleLevel(role) {
  return (
    ROLE_LEVELS[normalizeRole(role)] || 0
  );
}

/* ============================================================
   COMPARE ROLES
============================================================ */

/**
 * Returns:
 *
 *  1  => first role has more authority
 *  0  => same authority
 * -1  => second role has more authority
 */
export function compareRoles(
  firstRole,
  secondRole
) {
  const firstLevel =
    getRoleLevel(firstRole);

  const secondLevel =
    getRoleLevel(secondRole);

  if (firstLevel > secondLevel) {
    return 1;
  }

  if (firstLevel < secondLevel) {
    return -1;
  }

  return 0;
}

/* ============================================================
   CAN MANAGE ROLE
============================================================ */

/**
 * Prevent lower-level users from managing
 * users with equal or greater authority.
 *
 * Example:
 *
 * canManageRole("admin", "editor")
 * // true
 *
 * canManageRole("editor", "admin")
 * // false
 */
export function canManageRole(
  actorRole,
  targetRole
) {
  if (!isAdmin(actorRole)) {
    return false;
  }

  if (isOwner(targetRole)) {
    return isOwner(actorRole);
  }

  return (
    getRoleLevel(actorRole) >
    getRoleLevel(targetRole)
  );
}

/* ============================================================
   CAN DELETE
============================================================ */

export function canDelete(role) {
  return can(
    role,
    PERMISSIONS.DELETE
  );
}

/* ============================================================
   CAN EDIT
============================================================ */

export function canEdit(role) {
  return can(
    role,
    PERMISSIONS.EDIT
  );
}

/* ============================================================
   CAN COMMENT
============================================================ */

export function canComment(role) {
  return can(
    role,
    PERMISSIONS.COMMENT
  );
}

/* ============================================================
   CAN SHARE
============================================================ */

export function canShare(role) {
  return can(
    role,
    PERMISSIONS.SHARE
  );
}

/* ============================================================
   CAN MANAGE
============================================================ */

export function canManage(role) {
  return can(
    role,
    PERMISSIONS.MANAGE
  );
}

/* ============================================================
   ROLE LABEL
============================================================ */

/**
 * Convert internal role names into UI-friendly labels.
 *
 * "commenter" -> "Commenter"
 */
export function formatRole(role) {
  const normalizedRole =
    normalizeRole(role);

  if (!normalizedRole) {
    return "Viewer";
  }

  return normalizedRole
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

/* ============================================================
   VALID ROLE
============================================================ */

export function isValidRole(role) {
  return Object.values(ROLES).includes(
    normalizeRole(role)
  );
}

/* ============================================================
   ROLE OPTIONS
   Useful for <select> components.
============================================================ */

export const ROLE_OPTIONS = Object.freeze([
  {
    value: ROLES.OWNER,
    label: "Owner",
  },
  {
    value: ROLES.ADMIN,
    label: "Admin",
  },
  {
    value: ROLES.EDITOR,
    label: "Editor",
  },
  {
    value: ROLES.COMMENTER,
    label: "Commenter",
  },
  {
    value: ROLES.VIEWER,
    label: "Viewer",
  },
]);

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default {
  ROLES,
  PERMISSIONS,
  ROLE_OPTIONS,
  normalizeRole,
  getPermissions,
  can,
  canAll,
  canAny,
  hasRole,
  isAdmin,
  isOwner,
  isEditor,
  isCommenter,
  isViewer,
  getRoleLevel,
  compareRoles,
  canManageRole,
  canDelete,
  canEdit,
  canComment,
  canShare,
  canManage,
  formatRole,
  isValidRole,
};