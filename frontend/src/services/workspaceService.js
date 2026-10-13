import api, { getResponseData } from './api';

/* ============================================================
   SYNCDOC — WORKSPACE SERVICE
   Centralized workspace API operations.

   Responsibilities:
   - Workspace CRUD
   - Workspace members
   - Invitations
   - Member roles
   - Workspace documents
   - Consistent validation
   - Consistent response extraction

   NOTE:
   Additional methods should only be used when the matching
   backend endpoint exists.
============================================================ */

const BASE_PATH = '/workspaces';

/* ============================================================
   HELPERS
============================================================ */

/**
 * Validate and normalize an ID.
 */
function requireId(id, label = 'ID') {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ''
  ) {
    throw new Error(`${label} is required.`);
  }

  return String(id).trim();
}

/**
 * Ensure query parameters are always an object.
 */
function normalizeParams(params) {
  if (!params || typeof params !== 'object') {
    return {};
  }

  return { ...params };
}

/**
 * Ensure request payloads are objects.
 */
function normalizePayload(data) {
  if (!data || typeof data !== 'object') {
    return {};
  }

  return { ...data };
}

/* ============================================================
   WORKSPACE SERVICE
============================================================ */

const workspaceService = {
  /* ==========================================================
     WORKSPACE CRUD
  ========================================================== */

  /**
   * Get all workspaces available to the authenticated user.
   *
   * GET /workspaces
   */
  async getWorkspaces(params = {}) {
    const response = await api.get(BASE_PATH, {
      params: normalizeParams(params),
    });

    return getResponseData(response, []);
  },

  /**
   * Alias for getWorkspaces().
   *
   * Useful for hooks/components that prefer "list".
   */
  async list(params = {}) {
    return this.getWorkspaces(params);
  },

  /**
   * Get a single workspace.
   *
   * GET /workspaces/:id
   */
  async getWorkspace(id) {
    const workspaceId =
      requireId(id, 'Workspace ID');

    const response = await api.get(
      `${BASE_PATH}/${workspaceId}`
    );

    return getResponseData(response, null);
  },

  /**
   * Alias for getWorkspace().
   */
  async get(id) {
    return this.getWorkspace(id);
  },

  /**
   * Create a new workspace.
   *
   * POST /workspaces
   */
  async createWorkspace(data = {}) {
    const payload =
      normalizePayload(data);

    const response = await api.post(
      BASE_PATH,
      payload
    );

    return getResponseData(response, null);
  },

  /**
   * Update an existing workspace.
   *
   * PUT /workspaces/:id
   */
  async updateWorkspace(id, data = {}) {
    const workspaceId =
      requireId(id, 'Workspace ID');

    const payload =
      normalizePayload(data);

    const response = await api.put(
      `${BASE_PATH}/${workspaceId}`,
      payload
    );

    return getResponseData(response, null);
  },

  /**
   * Delete a workspace.
   *
   * DELETE /workspaces/:id
   */
  async deleteWorkspace(id) {
    const workspaceId =
      requireId(id, 'Workspace ID');

    const response = await api.delete(
      `${BASE_PATH}/${workspaceId}`
    );

    return getResponseData(response, null);
  },

  /* ==========================================================
     MEMBERS
  ========================================================== */

  /**
   * Get workspace members.
   *
   * GET /workspaces/:workspaceId/members
   */
  async getMembers(workspaceId) {
    const id =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const response = await api.get(
      `${BASE_PATH}/${id}/members`
    );

    return getResponseData(response, []);
  },

  /**
   * Get workspace members with optional
   * pagination/filter parameters.
   *
   * GET /workspaces/:workspaceId/members
   */
  async listMembers(
    workspaceId,
    params = {}
  ) {
    const id =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const response = await api.get(
      `${BASE_PATH}/${id}/members`,
      {
        params: normalizeParams(params),
      }
    );

    return getResponseData(response, []);
  },

  /**
   * Invite a new workspace member.
   *
   * POST /workspaces/:workspaceId/members
   */
  async inviteMember(
    workspaceId,
    data = {}
  ) {
    const id =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const payload =
      normalizePayload(data);

    const response = await api.post(
      `${BASE_PATH}/${id}/members`,
      payload
    );

    return getResponseData(
      response,
      null
    );
  },

  /**
   * Remove a member from workspace.
   *
   * DELETE /workspaces/:workspaceId/members/:memberId
   */
  async removeMember(
    workspaceId,
    memberId
  ) {
    const workspace =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const member =
      requireId(
        memberId,
        'Member ID'
      );

    const response = await api.delete(
      `${BASE_PATH}/${workspace}/members/${member}`
    );

    return getResponseData(
      response,
      null
    );
  },

  /**
   * Update member role/permissions.
   *
   * PATCH /workspaces/:workspaceId/members/:memberId
   */
  async updateMemberRole(
    workspaceId,
    memberId,
    data = {}
  ) {
    const workspace =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const member =
      requireId(
        memberId,
        'Member ID'
      );

    const payload =
      normalizePayload(data);

    const response = await api.patch(
      `${BASE_PATH}/${workspace}/members/${member}`,
      payload
    );

    return getResponseData(
      response,
      null
    );
  },

  /* ==========================================================
     DOCUMENTS
  ========================================================== */

  /**
   * Get documents belonging to a workspace.
   *
   * This assumes the backend supports:
   *
   * GET /workspaces/:workspaceId/documents
   */
  async getDocuments(
    workspaceId,
    params = {}
  ) {
    const id =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const response = await api.get(
      `${BASE_PATH}/${id}/documents`,
      {
        params: normalizeParams(params),
      }
    );

    return getResponseData(
      response,
      []
    );
  },

  /* ==========================================================
     INVITATIONS
  ========================================================== */

  /**
   * Cancel/revoke an invitation.
   *
   * Requires:
   *
   * DELETE /workspaces/:workspaceId/invitations/:invitationId
   */
  async revokeInvitation(
    workspaceId,
    invitationId
  ) {
    const workspace =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const invitation =
      requireId(
        invitationId,
        'Invitation ID'
      );

    const response = await api.delete(
      `${BASE_PATH}/${workspace}/invitations/${invitation}`
    );

    return getResponseData(
      response,
      null
    );
  },

  /**
   * Get pending invitations.
   *
   * Requires:
   *
   * GET /workspaces/:workspaceId/invitations
   */
  async getInvitations(
    workspaceId,
    params = {}
  ) {
    const id =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const response = await api.get(
      `${BASE_PATH}/${id}/invitations`,
      {
        params: normalizeParams(params),
      }
    );

    return getResponseData(
      response,
      []
    );
  },

  /* ==========================================================
     WORKSPACE SETTINGS
  ========================================================== */

  /**
   * Update workspace settings.
   *
   * Requires:
   *
   * PATCH /workspaces/:workspaceId/settings
   */
  async updateSettings(
    workspaceId,
    settings = {}
  ) {
    const id =
      requireId(
        workspaceId,
        'Workspace ID'
      );

    const payload =
      normalizePayload(settings);

    const response = await api.patch(
      `${BASE_PATH}/${id}/settings`,
      payload
    );

    return getResponseData(
      response,
      null
    );
  },

  /* ==========================================================
     MEMBER ROLE SHORTCUT
  ========================================================== */

  /**
   * Convenience wrapper for changing
   * a member's role.
   *
   * Example:
   *
   * updateRole(id, memberId, 'editor')
   */
  async updateRole(
    workspaceId,
    memberId,
    role
  ) {
    if (
      typeof role !== 'string' ||
      !role.trim()
    ) {
      throw new Error(
        'Member role is required.'
      );
    }

    return this.updateMemberRole(
      workspaceId,
      memberId,
      {
        role: role.trim(),
      }
    );
  },
};

/* ============================================================
   EXPORT
============================================================ */

export default workspaceService;