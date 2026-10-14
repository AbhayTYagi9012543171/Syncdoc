
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import documentService from "../services/documentService";

/* ============================================================
   HELPERS
   ============================================================ */

function getDocumentId(document) {
  if (!document || typeof document !== "object") {
    return "";
  }

  const id = document.id ?? document._id ?? document.documentId;
  return id == null ? "" : String(id);
}

function extractDocuments(response) {
  const data = response?.data ?? response;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.documents)) return data.documents;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.documents)) {
    return data.data.documents;
  }

  return [];
}

function extractDocument(response) {
  const data = response?.data ?? response;

  if (!data || typeof data !== "object") {
    return null;
  }

  if (data.document && typeof data.document === "object") {
    return data.document;
  }

  if (data.data?.document && typeof data.data.document === "object") {
    return data.data.document;
  }

  if (data.data?.data && typeof data.data.data === "object") {
    return data.data.data;
  }

  if (
    data.id != null ||
    data._id != null ||
    data.documentId != null
  ) {
    return data;
  }

  return null;
}

function createTemporaryId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `temp-${crypto.randomUUID()}`;
  }

  return `temp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normalizeDocument(document, allowTemporaryId = false) {
  if (!document || typeof document !== "object") {
    return null;
  }

  const originalId = getDocumentId(document);
  const id =
    originalId || (allowTemporaryId ? createTemporaryId() : "");

  if (!id) {
    return null;
  }

  return {
    ...document,
    id,
    title:
      typeof document.title === "string" &&
      document.title.trim()
        ? document.title
        : "Untitled Document",
    description:
      typeof document.description === "string"
        ? document.description
        : "",
    favorite: Boolean(
      document.favorite ?? document.isFavorite ?? false
    ),
  };
}

function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) {
    return [];
  }

  return documents
    .map((document) => normalizeDocument(document))
    .filter(Boolean);
}

function isCanceledError(error) {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
}

function getAuthToken() {
  try {
    return localStorage.getItem("syncdoc_token") || "";
  } catch {
    return "";
  }
}

/* ============================================================
   REQUEST DEDUPLICATION
   ============================================================ */

// Reuse an in-flight request for the same authenticated session.
const inFlightListRequests = new Map();

function listDocumentsOnce(token) {
  const existingRequest = inFlightListRequests.get(token);

  if (existingRequest) {
    return existingRequest;
  }

  let request;

  request = Promise.resolve()
    .then(() => documentService.list())
    .finally(() => {
      if (inFlightListRequests.get(token) === request) {
        inFlightListRequests.delete(token);
      }
    });

  inFlightListRequests.set(token, request);

  return request;
}

/* ============================================================
   MAIN HOOK
   ============================================================ */

export default function useDocuments({
  fallbackToDemo = false,
  autoLoad = true,
} = {}) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [creating, setCreating] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState(null);

  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const documentsRef = useRef([]);
  const creatingRef = useRef(false);
  const removingIdsRef = useRef(new Set());
  const updatingIdsRef = useRef(new Set());

  // Keep the latest document list available for safe rollback operations.
  const commitDocuments = useCallback((updater) => {
    const previous = documentsRef.current;

    const next =
      typeof updater === "function"
        ? updater(previous)
        : updater;

    documentsRef.current = next;
    setDocuments(next);

    return next;
  }, []);

  /* ==========================================================
     MOUNT / UNMOUNT
     ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, []);

  /* ==========================================================
     LOAD DOCUMENTS
     ========================================================== */

  const load = useCallback(
    async ({ showLoading = true } = {}) => {
      const requestId = ++requestIdRef.current;
      const token = getAuthToken();

      if (!token) {
        if (!mountedRef.current) return [];

        commitDocuments([]);
        setError(null);

        if (showLoading) {
          setLoading(false);
        }

        return [];
      }

      if (showLoading && mountedRef.current) {
        setLoading(true);
      }

      if (mountedRef.current) {
        setError(null);
      }

      try {
        const response = await listDocumentsOnce(token);
        const list = normalizeDocuments(
          extractDocuments(response)
        );

        // Ignore stale responses and responses from a previous session.
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current ||
          getAuthToken() !== token
        ) {
          return list;
        }

        commitDocuments(list);
        setError(null);

        return list;
      } catch (requestError) {
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current ||
          isCanceledError(requestError)
        ) {
          return [];
        }

        console.error(
          "SyncDoc: failed to load documents:",
          requestError
        );

        setError(requestError);

        // Do not silently replace server data with demo data.
        if (!fallbackToDemo) {
          commitDocuments([]);
        }

        return [];
      } finally {
        if (
          mountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    },
    [commitDocuments, fallbackToDemo]
  );

  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return undefined;
    }

    void load();

    return undefined;
  }, [autoLoad, load]);

  /* ==========================================================
     CREATE DOCUMENT
     ========================================================== */

  const createDocument = useCallback(
    async (payload = {}) => {
      if (
        !payload ||
        typeof payload !== "object" ||
        Array.isArray(payload)
      ) {
        throw new Error("Document payload must be an object.");
      }

      // Prevent accidental duplicate submissions.
      if (creatingRef.current) {
        return null;
      }

      creatingRef.current = true;

      if (mountedRef.current) {
        setCreating(true);
        setError(null);
      }

      const temporaryDocument = normalizeDocument(
        {
          ...payload,
          id: createTemporaryId(),
          title: payload.title || "Untitled Document",
          updatedAt: payload.updatedAt || "just now",
          favorite: payload.favorite ?? false,
          __optimistic: true,
          __unsaved: true,
        },
        true
      );

      // Show the temporary item while the server request is running.
      if (mountedRef.current && temporaryDocument) {
        commitDocuments((previous) => [
          temporaryDocument,
          ...previous,
        ]);
      }

      try {
        const response = await documentService.create(payload);
        const created = normalizeDocument(
          extractDocument(response)
        );

        if (!created) {
          throw new Error(
            "The server did not return a document with a valid ID."
          );
        }

        if (mountedRef.current) {
          commitDocuments((previous) => {
            const temporaryId =
              getDocumentId(temporaryDocument);
            const realId = getDocumentId(created);

            const withoutTemporary = previous.filter(
              (item) => getDocumentId(item) !== temporaryId
            );

            const existingIndex = withoutTemporary.findIndex(
              (item) => getDocumentId(item) === realId
            );

            if (existingIndex !== -1) {
              return withoutTemporary.map((item, index) =>
                index === existingIndex
                  ? {
                      ...item,
                      ...created,
                      __optimistic: false,
                      __unsaved: false,
                    }
                  : item
              );
            }

            return [
              {
                ...created,
                __optimistic: false,
                __unsaved: false,
              },
              ...withoutTemporary,
            ];
          });
        }

        return created;
      } catch (requestError) {
        console.error(
          "SyncDoc: failed to create document:",
          requestError
        );

        // Remove the temporary item because the save failed.
        if (mountedRef.current) {
          const temporaryId =
            getDocumentId(temporaryDocument);

          commitDocuments((previous) =>
            previous.filter(
              (item) => getDocumentId(item) !== temporaryId
            )
          );

          setError(requestError);
        }

        return null;
      } finally {
        creatingRef.current = false;

        if (mountedRef.current) {
          setCreating(false);
        }
      }
    },
    [commitDocuments]
  );

  /* ==========================================================
     REMOVE DOCUMENT
     ========================================================== */

  const removeDocument = useCallback(
    async (documentOrId) => {
      const id =
        typeof documentOrId === "string" ||
        typeof documentOrId === "number"
          ? String(documentOrId)
          : getDocumentId(documentOrId);

      if (!id || removingIdsRef.current.has(id)) {
        return false;
      }

      const previousDocument = documentsRef.current.find(
        (item) => getDocumentId(item) === id
      );

      removingIdsRef.current.add(id);

      if (mountedRef.current) {
        setRemovingId(id);
        setError(null);

        commitDocuments((previous) =>
          previous.filter((item) => getDocumentId(item) !== id)
        );
      }

      try {
        await documentService.remove(id);
        return true;
      } catch (requestError) {
        console.error(
          "SyncDoc: failed to remove document:",
          requestError
        );

        // Restore only this document, preserving other changes.
        if (mountedRef.current && previousDocument) {
          commitDocuments((previous) => {
            const alreadyExists = previous.some(
              (item) => getDocumentId(item) === id
            );

            return alreadyExists
              ? previous
              : [previousDocument, ...previous];
          });

          setError(requestError);
        }

        return false;
      } finally {
        removingIdsRef.current.delete(id);

        if (mountedRef.current) {
          setRemovingId(
            removingIdsRef.current.size
              ? Array.from(removingIdsRef.current).at(-1)
              : null
          );
        }
      }
    },
    [commitDocuments]
  );

  /* ==========================================================
     TOGGLE FAVORITE
     ========================================================== */

  const toggleFavorite = useCallback(
    async (document) => {
      const id = getDocumentId(document);

      if (!id || updatingIdsRef.current.has(id)) {
        return null;
      }

      const currentDocument =
        documentsRef.current.find(
          (item) => getDocumentId(item) === id
        ) || document;

      const previousFavorite = Boolean(
        currentDocument?.favorite ??
          currentDocument?.isFavorite ??
          false
      );

      const nextFavorite = !previousFavorite;

      updatingIdsRef.current.add(id);

      if (mountedRef.current) {
        setUpdatingId(id);
        setError(null);

        commitDocuments((previous) =>
          previous.map((item) =>
            getDocumentId(item) === id
              ? {
                  ...item,
                  favorite: nextFavorite,
                  isFavorite: nextFavorite,
                }
              : item
          )
        );
      }

      try {
        let response;

        if (
          typeof documentService.toggleFavorite === "function"
        ) {
          response =
            await documentService.toggleFavorite(
              id,
              nextFavorite
            );
        } else if (
          typeof documentService.update === "function"
        ) {
          response = await documentService.update(id, {
            favorite: nextFavorite,
            isFavorite: nextFavorite,
          });
        } else {
          throw new Error(
            "documentService does not provide a favorite update method."
          );
        }

        const updated = normalizeDocument(
          extractDocument(response)
        );

        if (mountedRef.current && updated) {
          commitDocuments((previous) =>
            previous.map((item) =>
              getDocumentId(item) === id
                ? { ...item, ...updated }
                : item
            )
          );
        }

        return (
          updated || {
            ...currentDocument,
            favorite: nextFavorite,
            isFavorite: nextFavorite,
          }
        );
      } catch (requestError) {
        console.error(
          "SyncDoc: failed to update favorite:",
          requestError
        );

        if (mountedRef.current) {
          commitDocuments((previous) =>
            previous.map((item) =>
              getDocumentId(item) === id
                ? {
                    ...item,
                    favorite: previousFavorite,
                    isFavorite: previousFavorite,
                  }
                : item
            )
          );

          setError(requestError);
        }

        return null;
      } finally {
        updatingIdsRef.current.delete(id);

        if (mountedRef.current) {
          setUpdatingId(
            updatingIdsRef.current.size
              ? Array.from(updatingIdsRef.current).at(-1)
              : null
          );
        }
      }
    },
    [commitDocuments]
  );

  /* ==========================================================
     UPDATE DOCUMENT LOCALLY
     ========================================================== */

  const updateDocument = useCallback(
    (documentId, updates) => {
      const id = String(documentId ?? "");

      if (
        !id ||
        !updates ||
        typeof updates !== "object" ||
        Array.isArray(updates)
      ) {
        return;
      }

      commitDocuments((previous) =>
        previous.map((document) =>
          getDocumentId(document) === id
            ? { ...document, ...updates }
            : document
        )
      );
    },
    [commitDocuments]
  );

  /* ==========================================================
     ADD DOCUMENT LOCALLY
     ========================================================== */

  const addDocument = useCallback(
    (document) => {
      const normalized = normalizeDocument(document, true);

      if (!normalized) {
        return;
      }

      const id = getDocumentId(normalized);

      commitDocuments((previous) => {
        const existingIndex = previous.findIndex(
          (item) => getDocumentId(item) === id
        );

        if (existingIndex !== -1) {
          return previous.map((item, index) =>
            index === existingIndex
              ? { ...item, ...normalized }
              : item
          );
        }

        return [normalized, ...previous];
      });
    },
    [commitDocuments]
  );

  /* ==========================================================
     CLEAR DOCUMENTS
     ========================================================== */

  const clearDocuments = useCallback(() => {
    commitDocuments([]);
    setError(null);
  }, [commitDocuments]);

  /* ==========================================================
     DERIVED STATE
     ========================================================== */

  const favoriteDocuments = useMemo(
    () =>
      documents.filter((document) =>
        Boolean(
          document.favorite ??
            document.isFavorite ??
            false
        )
      ),
    [documents]
  );

  const documentCount = documents.length;
  const favoriteCount = favoriteDocuments.length;
  const hasDocuments = documentCount > 0;

  /* ==========================================================
     RETURN API
     ========================================================== */

  return useMemo(
    () => ({
      documents,
      favoriteDocuments,
      documentCount,
      favoriteCount,
      hasDocuments,

      loading,
      creating,
      removingId,
      updatingId,

      isRemoving: Boolean(removingId),
      isUpdating: Boolean(updatingId),

      error,

      load,
      reload: load,
      createDocument,
      removeDocument,
      toggleFavorite,
      updateDocument,
      addDocument,
      clearDocuments,
    }),
    [
      documents,
      favoriteDocuments,
      documentCount,
      favoriteCount,
      hasDocuments,
      loading,
      creating,
      removingId,
      updatingId,
      error,
      load,
      createDocument,
      removeDocument,
      toggleFavorite,
      updateDocument,
      addDocument,
      clearDocuments,
    ]
  );
}
