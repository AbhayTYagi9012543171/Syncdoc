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

/**
 * Safely extract a document ID.
 */
function getDocumentId(document) {
  if (!document || typeof document !== "object") {
    return "";
  }

  return String(
    document.id ||
    document._id ||
    document.documentId ||
    ""
  );
}

/**
 * Extract documents from different backend
 * response structures.
 *
 * Supported:
 *
 * {
 *   documents: []
 * }
 *
 * {
 *   data: {
 *     documents: []
 *   }
 * }
 *
 * {
 *   data: []
 * }
 *
 * []
 */
function extractDocuments(response) {
  const data = response?.data ?? response;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.documents)) {
    return data.documents;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.documents)) {
    return data.data.documents;
  }

  return [];
}

/**
 * Extract a single created document.
 */
function extractDocument(response) {
  const data = response?.data ?? response;

  if (!data || typeof data !== "object") {
    return null;
  }

  if (
    data.document &&
    typeof data.document === "object"
  ) {
    return data.document;
  }

  if (
    data.data?.document &&
    typeof data.data.document === "object"
  ) {
    return data.data.document;
  }

  if (
    data.data?.data &&
    typeof data.data.data === "object"
  ) {
    return data.data.data;
  }

  /*
   * Avoid accidentally treating response metadata
   * as a document.
   */
  if (
    data.id ||
    data._id ||
    data.documentId ||
    data.title
  ) {
    return data;
  }

  return null;
}

/**
 * Generate a browser-safe temporary ID.
 */
function createTemporaryId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `temp-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

/**
 * Normalize a document before putting it into state.
 */
function normalizeDocument(document) {
  if (!document || typeof document !== "object") {
    return null;
  }

  return {
    ...document,

    id:
      document.id ||
      document._id ||
      document.documentId ||
      createTemporaryId(),

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
      document.favorite ??
      document.isFavorite ??
      false
    ),
  };
}

/**
 * Normalize document arrays.
 */
function normalizeDocuments(documents) {
  if (!Array.isArray(documents)) {
    return [];
  }

  return documents
    .map(normalizeDocument)
    .filter(Boolean);
}

/**
 * Check whether an error was caused by cancellation.
 */
function isCanceledError(error) {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
}

/**
 * Check authentication state before calling
 * protected document APIs.
 */
function hasAuthToken() {
  try {
    return Boolean(
      localStorage.getItem("syncdoc_token")
    );
  } catch {
    return false;
  }
}

/* ============================================================
   HOOK
   ============================================================ */

export default function useDocuments({
  fallbackToDemo = false,
  autoLoad = true,
} = {}) {
  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] =
    useState(Boolean(autoLoad));

  const [creating, setCreating] =
    useState(false);

  const [removingId, setRemovingId] =
    useState(null);

  const [updatingId, setUpdatingId] =
    useState(null);

  const [error, setError] =
    useState(null);

  const mountedRef = useRef(true);

  const requestIdRef = useRef(0);

  /* ==========================================================
     MOUNT / UNMOUNT
     ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ==========================================================
     LOAD DOCUMENTS
     ========================================================== */

  const load = useCallback(
    async ({
      showLoading = true,
      useFallback = fallbackToDemo,
    } = {}) => {
      const requestId =
        ++requestIdRef.current;

      /*
       * Prevent unnecessary protected API calls
       * when the user is not authenticated.
       */
      if (!hasAuthToken()) {
        if (!mountedRef.current) {
          return [];
        }

        setDocuments(
          []
        );

        setError(null);

        if (showLoading) {
          setLoading(false);
        }

        return [];
      }

      if (showLoading) {
        setLoading(true);
      }

      setError(null);

      try {
        const response =
          await documentService.list();

        const list =
          normalizeDocuments(
            extractDocuments(response)
          );

        /*
         * Ignore stale responses if multiple
         * load requests were triggered.
         */
        if (
          !mountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return list;
        }

        setDocuments(
          list
        );

        setError(null);

        return list;
      } catch (err) {
        if (
          !mountedRef.current ||
          isCanceledError(err)
        ) {
          return [];
        }

        console.error(
          "SyncDoc: failed to load documents:",
          err
        );

        setError(err);

        /*
         * Only use demo data when explicitly enabled.
         */
        setDocuments([]);

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
    [fallbackToDemo]
  );

  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return undefined;
    }

    load();

    return undefined;
  }, [autoLoad, load]);

  /* ==========================================================
     CREATE DOCUMENT
     ========================================================== */

  const createDocument = useCallback(
    async (payload = {}) => {
      if (
        !payload ||
        typeof payload !== "object"
      ) {
        throw new Error(
          "Document payload must be an object."
        );
      }

      setCreating(true);
      setError(null);

      /*
       * Temporary optimistic document.
       */
      const temporaryDocument =
        normalizeDocument({
          ...payload,
          id: createTemporaryId(),
          title:
            payload.title ||
            "Untitled Document",
          owner:
            payload.owner ||
            "You",
          updatedAt:
            payload.updatedAt ||
            "just now",
          collaborators:
            payload.collaborators ?? 1,
          favorite:
            payload.favorite ?? false,
          __optimistic: true,
        });

      try {
        const response =
          await documentService.create(
            payload
          );

        const created =
          normalizeDocument(
            extractDocument(response)
          );

        /*
         * If backend returned a document,
         * replace optimistic state with the real one.
         */
        if (
          mountedRef.current &&
          created
        ) {
          setDocuments((previous) => {
            const optimisticExists =
              previous.some(
                (item) =>
                  getDocumentId(item) ===
                  getDocumentId(
                    temporaryDocument
                  )
              );

            if (optimisticExists) {
              return previous.map((item) =>
                getDocumentId(item) ===
                  getDocumentId(
                    temporaryDocument
                  )
                  ? created
                  : item
              );
            }

            /*
             * Prevent duplicates if the backend
             * response already exists in state.
             */
            const alreadyExists =
              previous.some(
                (item) =>
                  getDocumentId(item) ===
                  getDocumentId(created)
              );

            return alreadyExists
              ? previous
              : [created, ...previous];
          });

          return created;
        }

        /*
         * Backend returned no usable document.
         * Keep the optimistic local version.
         */
        if (mountedRef.current) {
          setError(new Error('The server did not return the created document.'));
        }

        return null;
      } catch (err) {
        console.error(
          "SyncDoc: failed to create document:",
          err
        );

        /*
         * Keep local optimistic document so
         * the UI remains usable.
         */
        if (mountedRef.current) {
          setError(err);
        }

        return null;
      } finally {
        if (mountedRef.current) {
          setCreating(false);
        }
      }
    },
    []
  );

  /* ==========================================================
     REMOVE DOCUMENT
     ========================================================== */

  const removeDocument = useCallback(
    async (document) => {
      const id = getDocumentId(document);

      if (!id) {
        return false;
      }

      /*
       * Save the current document so we can restore
       * it if the API request fails.
       */
      let previousDocuments = [];

      setRemovingId(id);
      setError(null);

      setDocuments((previous) => {
        previousDocuments = previous;

        return previous.filter(
          (item) =>
            getDocumentId(item) !== id
        );
      });

      try {
        await documentService.remove(id);

        return true;
      } catch (err) {
        console.error(
          "SyncDoc: failed to remove document:",
          err
        );

        /*
         * Roll back optimistic removal.
         */
        if (mountedRef.current) {
          setDocuments(previousDocuments);
          setError(err);
        }

        return false;
      } finally {
        if (mountedRef.current) {
          setRemovingId(null);
        }
      }
    },
    []
  );

  /* ==========================================================
     TOGGLE FAVORITE
     ========================================================== */

  const toggleFavorite = useCallback(
    async (document) => {
      const id = getDocumentId(document);

      if (!id) {
        return null;
      }

      const previousFavorite =
        Boolean(
          document?.favorite ??
          document?.isFavorite ??
          false
        );

      const nextFavorite =
        !previousFavorite;

      setUpdatingId(id);
      setError(null);

      /*
       * Optimistic update.
       */
      setDocuments((previous) =>
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

      try {
        /*
         * Support different service implementations.
         *
         * If your service does not currently expose
         * toggleFavorite/updateFavorite, the local
         * state still works.
         */
        let response = null;

        if (
          typeof documentService.toggleFavorite ===
          "function"
        ) {
          response =
            await documentService.toggleFavorite(
              id,
              nextFavorite
            );
        } else if (
          typeof documentService.update ===
          "function"
        ) {
          response =
            await documentService.update(id, {
              favorite: nextFavorite,
            });
        }

        const updated =
          normalizeDocument(
            extractDocument(response)
          );

        if (
          mountedRef.current &&
          updated
        ) {
          setDocuments((previous) =>
            previous.map((item) =>
              getDocumentId(item) === id
                ? {
                  ...item,
                  ...updated,
                }
                : item
            )
          );
        }

        return updated || {
          ...document,
          favorite: nextFavorite,
        };
      } catch (err) {
        console.error(
          "SyncDoc: failed to update favorite:",
          err
        );

        /*
         * Roll back optimistic update.
         */
        if (mountedRef.current) {
          setDocuments((previous) =>
            previous.map((item) =>
              getDocumentId(item) === id
                ? {
                  ...item,
                  favorite:
                    previousFavorite,
                  isFavorite:
                    previousFavorite,
                }
                : item
            )
          );

          setError(err);
        }

        return null;
      } finally {
        if (mountedRef.current) {
          setUpdatingId(null);
        }
      }
    },
    []
  );

  /* ==========================================================
     UPDATE DOCUMENT LOCALLY
     ========================================================== */

  const updateDocument = useCallback(
    (documentId, updates) => {
      if (!documentId) {
        return;
      }

      if (
        !updates ||
        typeof updates !== "object"
      ) {
        return;
      }

      setDocuments((previous) =>
        previous.map((document) =>
          getDocumentId(document) ===
            String(documentId)
            ? {
              ...document,
              ...updates,
            }
            : document
        )
      );
    },
    []
  );

  /* ==========================================================
     ADD DOCUMENT LOCALLY
     ========================================================== */

  const addDocument = useCallback(
    (document) => {
      const normalized =
        normalizeDocument(document);

      if (!normalized) {
        return;
      }

      const id =
        getDocumentId(normalized);

      setDocuments((previous) => {
        const exists = previous.some(
          (item) =>
            getDocumentId(item) === id
        );

        if (exists) {
          return previous;
        }

        return [
          normalized,
          ...previous,
        ];
      });
    },
    []
  );

  /* ==========================================================
     CLEAR DOCUMENTS
     ========================================================== */

  const clearDocuments = useCallback(() => {
    setDocuments([]);
    setError(null);
  }, []);

  /* ==========================================================
     DERIVED STATE
     ========================================================== */

  const favoriteDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          Boolean(
            document.favorite ??
            document.isFavorite
          )
      ),
    [documents]
  );

  const documentCount =
    documents.length;

  const favoriteCount =
    favoriteDocuments.length;

  const hasDocuments =
    documentCount > 0;

  /* ==========================================================
     CONTEXT-STYLE API
     ========================================================== */

  return useMemo(
    () => ({
      /* ----------------------------------------------
         Data
      ---------------------------------------------- */

      documents,

      favoriteDocuments,

      documentCount,

      favoriteCount,

      hasDocuments,

      /* ----------------------------------------------
         Loading states
      ---------------------------------------------- */

      loading,

      creating,

      removingId,

      updatingId,

      isRemoving:
        Boolean(removingId),

      isUpdating:
        Boolean(updatingId),

      /* ----------------------------------------------
         Error
      ---------------------------------------------- */

      error,

      /* ----------------------------------------------
         Actions
      ---------------------------------------------- */

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