
import api, { getResponseData } from "./api";

/* ============================================================
   SYNCDOC — WORKSPACE SERVICE
   Centralized workspace API operations.
============================================================ */

const BASE_PATH = "/workspaces";

// Share identical GET requests while they are in progress.
// Completed requests are removed, so future refreshes work.
const inFlightGetRequests = new Map();

/* ============================================================
   HELPERS
============================================================ */

function requireId(id, label = "ID") {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error(`${label} is required.`);
  }

  return String(id).trim();
}

function normalizeParams(params = {}) {
  if (!params || typeof params !== "object") {
    return {};
  }

  return { ...params };
}

function normalizePayload(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return { ...data };
}


export function unwrapWorkspaceResponse(value) {
  let current = value;

  // API responses may be wrapped as { data }, { workspace }, or both.
  // Traverse only known response-envelope keys and cap depth to avoid loops.
  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    const id = current.id || current._id || current.workspaceId;
    if (id !== undefined && id !== null && String(id).trim()) {
      const normalizedId = String(id).trim();
      return {
        ...current,
        id: normalizedId,
        _id: current._id ? String(current._id) : normalizedId,
        workspaceId: normalizedId,
      };
    }

    if (current.workspace && typeof current.workspace === "object") {
      current = current.workspace;
      continue;
    }
    if (current.data && typeof current.data === "object") {
      current = current.data;
      continue;
    }

    return null;
  }

  return null;
}

function stableSerialize(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(",")}]`;
  }

  const keys = Object.keys(value).sort();

  return `{${keys
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableSerialize(value[key])}`
    )
    .join(",")}}`;
}

/**
 * Deduplicate concurrent GET requests for the same URL and params.
 * This is not a persistent cache.
 */
function getOnce(url, params = {}, fallback = null) {
  const key = `${url}?${stableSerialize(params)}`;

  const existingRequest = inFlightGetRequests.get(key);

  if (existingRequest) {
    return existingRequest;
  }

  const request = api
    .get(url, { params })
    .then((response) => getResponseData(response, fallback))
    .finally(() => {
      if (inFlightGetRequests.get(key) === request) {
        inFlightGetRequests.delete(key);
      }
    });

  inFlightGetRequests.set(key, request);

  return request;
}

/* ============================================================
   WORKSPACE SERVICE
============================================================ */

const workspaceService = {
  /* -------------------- WORKSPACE CRUD -------------------- */

  /**
   * GET /workspaces
   */
  getWorkspaces(params = {}) {
    return getOnce(
      BASE_PATH,
      normalizeParams(params),
      []
    );
  },

  /**
   * Alias for getWorkspaces().
   */
  list(params = {}) {
    return this.getWorkspaces(params);
  },

  /**
   * GET /workspaces/:id
   */
  getWorkspace(id) {
    const workspaceId = requireId(id, "Workspace ID");

    return getOnce(
      `${BASE_PATH}/${encodeURIComponent(workspaceId)}`,
      {},
      null
    );
  },

  /**
   * Alias for getWorkspace().
   */
  get(id) {
    return this.getWorkspace(id);
  },

  /**
   * POST /workspaces
   */
  async createWorkspace(data = {}) {
    const response = await api.post(
      BASE_PATH,
      normalizePayload(data)
    );

    const payload = getResponseData(response, null);
    const workspace =
      unwrapWorkspaceResponse(payload) ||
      unwrapWorkspaceResponse(response?.data?.workspace) ||
      unwrapWorkspaceResponse(response?.data);
    if (!workspace) {
      const error = new Error("The server did not return a valid workspace after creation.");
      error.code = "INVALID_WORKSPACE_RESPONSE";
      throw error;
    }
    return workspace;
  },

  /**
   * PUT /workspaces/:id
   */
  async updateWorkspace(id, data = {}) {
    const workspaceId = requireId(id, "Workspace ID");

    const response = await api.put(
      `${BASE_PATH}/${encodeURIComponent(workspaceId)}`,
      normalizePayload(data)
    );

    return getResponseData(response, null);
  },

  /**
   * DELETE /workspaces/:id
   */
  async deleteWorkspace(id) {
    const workspaceId = requireId(id, "Workspace ID");

    const response = await api.delete(
      `${BASE_PATH}/${encodeURIComponent(workspaceId)}`
    );

    return getResponseData(response, null);
  },

  /* -------------------- MEMBERS -------------------- */

  /**
   * GET /workspaces/:workspaceId/members
   */
  getMembers(workspaceId) {
    const id = requireId(workspaceId, "Workspace ID");

    return getOnce(
      `${BASE_PATH}/${encodeURIComponent(id)}/members`,
      {},
      []
    );
  },

  /**
   * GET /workspaces/:workspaceId/members with query params
   */
  listMembers(workspaceId, params = {}) {
    const id = requireId(workspaceId, "Workspace ID");

    return getOnce(
      `${BASE_PATH}/${encodeURIComponent(id)}/members`,
      normalizeParams(params),
      []
    );
  },

  /**
   * POST /workspaces/:workspaceId/members
   */
  async inviteMember(workspaceId, data = {}) {
    const id = requireId(workspaceId, "Workspace ID");

    const response = await api.post(
      `${BASE_PATH}/${encodeURIComponent(id)}/members`,
      normalizePayload(data)
    );

    return getResponseData(response, null);
  },

  /**
   * DELETE /workspaces/:workspaceId/members/:memberId
   */
  async removeMember(workspaceId, memberId) {
    const workspace = requireId(workspaceId, "Workspace ID");
    const member = requireId(memberId, "Member ID");

    const response = await api.delete(
      `${BASE_PATH}/${encodeURIComponent(workspace)}/members/${encodeURIComponent(member)}`
    );

    return getResponseData(response, null);
  },

  /**
   * PATCH /workspaces/:workspaceId/members/:memberId
   */
  async updateMemberRole(workspaceId, memberId, data = {}) {
    const workspace = requireId(workspaceId, "Workspace ID");
    const member = requireId(memberId, "Member ID");

    const response = await api.patch(
      `${BASE_PATH}/${encodeURIComponent(workspace)}/members/${encodeURIComponent(member)}`,
      normalizePayload(data)
    );

    return getResponseData(response, null);
  },

  /* -------------------- DOCUMENTS -------------------- */

  /**
   * GET /workspaces/:workspaceId/documents
   */
  getDocuments(workspaceId, params = {}) {
    const id = requireId(workspaceId, "Workspace ID");

    return getOnce(
      `${BASE_PATH}/${encodeURIComponent(id)}/documents`,
      normalizeParams(params),
      []
    );
  },

  /* -------------------- INVITATIONS -------------------- */

  /**
   * DELETE /workspaces/:workspaceId/invitations/:invitationId
   */
  async revokeInvitation(workspaceId, invitationId) {
    const workspace = requireId(workspaceId, "Workspace ID");
    const invitation = requireId(invitationId, "Invitation ID");

    const response = await api.delete(
      `${BASE_PATH}/${encodeURIComponent(workspace)}/invitations/${encodeURIComponent(invitation)}`
    );

    return getResponseData(response, null);
  },

  /**
   * GET /workspaces/:workspaceId/invitations
   */
  getInvitations(workspaceId, params = {}) {
    const id = requireId(workspaceId, "Workspace ID");

    return getOnce(
      `${BASE_PATH}/${encodeURIComponent(id)}/invitations`,
      normalizeParams(params),
      []
    );
  },

  /* -------------------- WORKSPACE SETTINGS -------------------- */

  /**
   * PATCH /workspaces/:workspaceId/settings
   */
  async updateSettings(workspaceId, settings = {}) {
    const id = requireId(workspaceId, "Workspace ID");

    const response = await api.patch(
      `${BASE_PATH}/${encodeURIComponent(id)}/settings`,
      normalizePayload(settings)
    );

    return getResponseData(response, null);
  },

  /* -------------------- MEMBER ROLE SHORTCUT -------------------- */

  /**
   * Convenience wrapper for changing a member's role.
   */
  updateRole(workspaceId, memberId, role) {
    if (typeof role !== "string" || !role.trim()) {
      throw new Error("Member role is required.");
    }

    return this.updateMemberRole(workspaceId, memberId, {
      role: role.trim(),
    });
  },
};

export default workspaceService;
