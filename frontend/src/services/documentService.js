import api, {
  getApiErrorMessage,
  getResponseData,
} from "./api";

/* ============================================================
   SYNCDOC — DOCUMENT SERVICE
   Centralized document API operations.
============================================================ */

/* ============================================================
   ENDPOINTS
============================================================ */

const DOCUMENT_ENDPOINTS = {
  BASE: "/documents",
};

/* ============================================================
   HELPERS
============================================================ */

/**
 * Validate a document ID before making a request.
 */
function requireDocumentId(id) {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error(
      "Document ID is required."
    );
  }

  return String(id).trim();
}

/**
 * Validate a workspace ID.
 */
function requireWorkspaceId(id) {
  if (
    id === undefined ||
    id === null ||
    String(id).trim() === ""
  ) {
    throw new Error(
      "Workspace ID is required."
    );
  }

  return String(id).trim();
}

/**
 * Make sure params are always an object.
 */
function normalizeParams(params) {
  if (
    !params ||
    typeof params !== "object" ||
    Array.isArray(params)
  ) {
    return {};
  }

  return {
    ...params,
  };
}

/**
 * Normalize document API errors.
 */
function handleDocumentError(
  error,
  fallbackMessage
) {
  error.documentMessage =
    getApiErrorMessage(
      error,
      fallbackMessage
    );

  return error;
}

/* ============================================================
   DOCUMENT SERVICE
============================================================ */

const documentService = {
  /* ==========================================================
     LIST DOCUMENTS
  ========================================================== */

  async list(params = {}) {
    try {
      const response = await api.get(
        DOCUMENT_ENDPOINTS.BASE,
        {
          params: normalizeParams(params),
        }
      );

      return getResponseData(
        response,
        []
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to load documents."
      );
    }
  },

  /* ==========================================================
     COLLABORATION INITIALIZATION LEASE
  ========================================================== */

  async claimCollaborationSeed(id) {
    const documentId = requireDocumentId(id);
    const response = await api.post(
      `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(documentId)}/collaboration/seed-claim`
    );
    return getResponseData(response, { shouldSeed: false });
  },

  /* ==========================================================
     GET SINGLE DOCUMENT
  ========================================================== */

  async get(id) {
    const documentId =
      requireDocumentId(id);

    try {
      const response = await api.get(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}`
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to load this document."
      );
    }
  },

  /* ==========================================================
     CREATE DOCUMENT
  ========================================================== */

  async create(payload = {}) {
    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new Error(
        "Document data must be an object."
      );
    }

    try {
      const response = await api.post(
        DOCUMENT_ENDPOINTS.BASE,
        payload
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to create the document."
      );
    }
  },

  /* ==========================================================
     UPDATE DOCUMENT
  ========================================================== */

  async update(id, payload = {}) {
    const documentId =
      requireDocumentId(id);

    if (
      !payload ||
      typeof payload !== "object" ||
      Array.isArray(payload)
    ) {
      throw new Error(
        "Document update data must be an object."
      );
    }

    try {
      const response = await api.put(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}`,
        payload
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to update the document."
      );
    }
  },

  /* ==========================================================
     DELETE DOCUMENT
  ========================================================== */

  async trash() {
    try {
      const response = await api.get(`${DOCUMENT_ENDPOINTS.BASE}/trash/list`);
      return getResponseData(response, []);
    } catch (error) {
      throw handleDocumentError(error, "Unable to load trash.");
    }
  },

  async restoreFromTrash(id) {
    const documentId = requireDocumentId(id);
    try {
      const response = await api.post(`${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(documentId)}/restore-trash`);
      return getResponseData(response, null);
    } catch (error) {
      throw handleDocumentError(error, "Unable to restore document.");
    }
  },

  async remove(id) {
    const documentId =
      requireDocumentId(id);

    try {
      const response = await api.delete(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}`
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to delete the document."
      );
    }
  },

  /* ==========================================================
     SEARCH DOCUMENTS
  ========================================================== */

  async search(
    query = "",
    params = {}
  ) {
    const searchQuery =
      typeof query === "string"
        ? query.trim()
        : "";

    try {
      const response = await api.get(
        DOCUMENT_ENDPOINTS.BASE,
        {
          params: {
            ...normalizeParams(params),
            search: searchQuery,
          },
        }
      );

      return getResponseData(
        response,
        []
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to search documents."
      );
    }
  },

  /* ==========================================================
     LIST BY WORKSPACE
  ========================================================== */

  async listByWorkspace(
    workspaceId,
    params = {}
  ) {
    const id =
      requireWorkspaceId(workspaceId);

    try {
      const response = await api.get(
        DOCUMENT_ENDPOINTS.BASE,
        {
          params: {
            ...normalizeParams(params),
            workspaceId: id,
          },
        }
      );

      return getResponseData(
        response,
        []
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to load workspace documents."
      );
    }
  },

  /* ==========================================================
     FAVORITE DOCUMENT
  ========================================================== */

  async toggleFavorite(id, favorite) {
    const documentId =
      requireDocumentId(id);

    try {
      const response = await api.put(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}`,
        {
          favorite: Boolean(favorite),
        }
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to update document favorite status."
      );
    }
  },

  /* ==========================================================
     UPDATE TITLE
  ========================================================== */

  async updateTitle(id, title) {
    const documentId =
      requireDocumentId(id);

    const normalizedTitle =
      typeof title === "string"
        ? title.trim()
        : "";

    if (!normalizedTitle) {
      throw new Error(
        "Document title is required."
      );
    }

    try {
      const response = await api.put(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}`,
        {
          title: normalizedTitle,
        }
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to update the document title."
      );
    }
  },

  /* ==========================================================
     UPDATE CONTENT
  ========================================================== */

  async updateContent(id, content) {
    const documentId =
      requireDocumentId(id);

    if (
      typeof content !== "string"
    ) {
      throw new Error(
        "Document content must be a string."
      );
    }

    try {
      const response = await api.put(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}`,
        {
          content,
        }
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to save document content."
      );
    }
  },

  /* ==========================================================
     DUPLICATE DOCUMENT
  ========================================================== */

  async duplicate(id, payload = {}) {
    const documentId =
      requireDocumentId(id);

    try {
      const response = await api.post(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}/duplicate`,
        payload
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to duplicate the document."
      );
    }
  },

  /* ==========================================================
     DOCUMENT VERSIONS
  ========================================================== */

  async versions(id, params = {}) {
    const documentId =
      requireDocumentId(id);

    try {
      const response = await api.get(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}/versions`,
        {
          params: normalizeParams(params),
        }
      );

      return getResponseData(
        response,
        []
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to load document versions."
      );
    }
  },

  /* ==========================================================
     RESTORE VERSION
  ========================================================== */

  async restoreVersion(
    id,
    versionId
  ) {
    const documentId =
      requireDocumentId(id);

    if (
      versionId === undefined ||
      versionId === null ||
      String(versionId).trim() === ""
    ) {
      throw new Error(
        "Version ID is required."
      );
    }

    const normalizedVersionId =
      String(versionId).trim();

    try {
      const response = await api.post(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}/versions/${encodeURIComponent(
          normalizedVersionId
        )}/restore`
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to restore this document version."
      );
    }
  },

  /* ==========================================================
     SHARE DOCUMENT
  ========================================================== */

  async share(id, payload = {}) {
    const documentId =
      requireDocumentId(id);

    try {
      const response = await api.post(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}/share`,
        payload
      );

      return getResponseData(
        response,
        null
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to share the document."
      );
    }
  },

  /* ==========================================================
     DOCUMENT COLLABORATORS
  ========================================================== */

  async collaborators(id) {
    const documentId =
      requireDocumentId(id);

    try {
      const response = await api.get(
        `${DOCUMENT_ENDPOINTS.BASE}/${encodeURIComponent(
          documentId
        )}/collaborators`
      );

      return getResponseData(
        response,
        []
      );
    } catch (error) {
      throw handleDocumentError(
        error,
        "Unable to load document collaborators."
      );
    }
  },
};

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default documentService;