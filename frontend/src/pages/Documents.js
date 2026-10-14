import "./pages-premium.css";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import DocumentGrid from '../components/documents/DocumentGrid';
import DocumentList from '../components/documents/DocumentList';
import DocumentFilters from '../components/documents/DocumentFilters';
import DocumentSearch from '../components/documents/DocumentSearch';
import CreateDocumentModal from '../components/documents/CreateDocumentModal';

import Button from '../components/common/Button';

import useDocuments from '../hooks/useDocuments';
import useDebounce from '../hooks/useDebounce';

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_FILTER = 'all';
const DEFAULT_SORT = 'updated';
const DEFAULT_VIEW = 'grid';
const SEARCH_DEBOUNCE_MS = 300;

const VALID_FILTERS = new Set([
  'all',
  'mine',
  'shared',
  'favorite',
]);

const VALID_SORTS = new Set([
  'updated',
  'oldest',
  'name',
  'name-desc',
]);

const VALID_VIEWS = new Set([
  'grid',
  'list',
]);

/* ============================================================
   GENERAL SAFE VALUE HELPERS
============================================================ */

const safeString = (
  value,
  fallback = ''
) => {
  if (
    typeof value === 'string'
  ) {
    return value.trim();
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value);
  }

  return fallback;
};

/* ============================================================
   ERROR NORMALIZATION
============================================================ */

/**
 * Converts ANY backend/Axios/application error into a
 * render-safe string.
 *
 * Backend may return:
 *
 * {
 *   error: {
 *     code: 'RATE_LIMITED',
 *     message: 'Too many requests...'
 *   }
 * }
 *
 * Never return an object from this function.
 */
const getErrorMessage = (
  error,
  fallback = 'Something went wrong.'
) => {
  if (!error) {
    return fallback;
  }

  /* Already a string */
  if (
    typeof error === 'string'
  ) {
    return error.trim() || fallback;
  }

  /* Axios response */
  const responseData =
    error?.response?.data;

  /* ---------------------------------------------
     { error: { code, message } }
  --------------------------------------------- */

  if (
    typeof responseData?.error?.message ===
    'string'
  ) {
    return responseData.error.message;
  }

  /* ---------------------------------------------
     { error: "message" }
  --------------------------------------------- */

  if (
    typeof responseData?.error ===
    'string'
  ) {
    return responseData.error;
  }

  /* ---------------------------------------------
     { message: "message" }
  --------------------------------------------- */

  if (
    typeof responseData?.message ===
    'string'
  ) {
    return responseData.message;
  }

  /* ---------------------------------------------
     Nested data.message
  --------------------------------------------- */

  if (
    typeof responseData?.data?.message ===
    'string'
  ) {
    return responseData.data.message;
  }

  /* ---------------------------------------------
     Axios error message
  --------------------------------------------- */

  if (
    typeof error?.message ===
    'string' &&
    error.message.trim()
  ) {
    return error.message;
  }

  /* ---------------------------------------------
     Generic nested error
  --------------------------------------------- */

  if (
    typeof error?.error?.message ===
    'string'
  ) {
    return error.error.message;
  }

  /* ---------------------------------------------
     Error-like code only
  --------------------------------------------- */

  if (
    typeof responseData?.error?.code ===
    'string'
  ) {
    return responseData.error.code;
  }

  return fallback;
};

/* ============================================================
   DOCUMENT HELPERS
============================================================ */

const getDocumentId = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return '';
  }

  return safeString(
    document.id ||
    document._id ||
    document.documentId ||
    ''
  );
};

const getDocumentTitle = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return 'Untitled document';
  }

  return (
    safeString(
      document.title ||
      document.name ||
      ''
    ) ||
    'Untitled document'
  );
};

const getDocumentDescription = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return '';
  }

  return safeString(
    document.description ||
    document.summary ||
    ''
  );
};

const getDocumentOwner = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return '';
  }

  const owner =
    document.owner;

  if (
    typeof owner === 'string'
  ) {
    return owner.trim();
  }

  if (
    owner &&
    typeof owner === 'object'
  ) {
    return (
      safeString(
        owner.displayName ||
        owner.username ||
        owner.name ||
        owner.email ||
        ''
      )
    );
  }

  return safeString(
    document.ownerName ||
    document.createdByName ||
    document.createdBy ||
    ''
  );
};

const getDocumentOwnerId = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return '';
  }

  const owner =
    document.owner;

  if (
    owner &&
    typeof owner === 'object'
  ) {
    return safeString(
      owner.id ||
      owner._id ||
      owner.userId ||
      ''
    );
  }

  return safeString(
    document.ownerId ||
    document.createdById ||
    ''
  );
};

const getDocumentPermission = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return '';
  }

  return safeString(
    document.permission ||
    document.accessLevel ||
    document.role ||
    ''
  ).toLowerCase();
};

const isDocumentFavorite = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return false;
  }

  return Boolean(
    document.favorite ??
    document.isFavorite ??
    document.starred
  );
};

const getUpdatedTimestamp = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return 0;
  }

  const value =
    document.updatedAt ||
    document.updated_at ||
    document.modifiedAt ||
    document.createdAt;

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
};

/* ============================================================
   NORMALIZATION HELPERS
============================================================ */

const normalizeFilter = (
  value
) => {
  const filter =
    safeString(
      value
    ).toLowerCase();

  return VALID_FILTERS.has(
    filter
  )
    ? filter
    : DEFAULT_FILTER;
};

const normalizeSort = (
  value
) => {
  const sort =
    safeString(
      value
    ).toLowerCase();

  return VALID_SORTS.has(
    sort
  )
    ? sort
    : DEFAULT_SORT;
};

const normalizeView = (
  value
) => {
  const view =
    safeString(
      value
    ).toLowerCase();

  return VALID_VIEWS.has(
    view
  )
    ? view
    : DEFAULT_VIEW;
};

/* ============================================================
   OWNERSHIP HELPERS
============================================================ */

const isOwnedByCurrentUser = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return false;
  }

  if (
    typeof document.isOwner ===
    'boolean'
  ) {
    return document.isOwner;
  }

  if (
    typeof document.ownedByMe ===
    'boolean'
  ) {
    return document.ownedByMe;
  }

  if (
    typeof document.isMine ===
    'boolean'
  ) {
    return document.isMine;
  }

  const owner =
    getDocumentOwner(
      document
    ).toLowerCase();

  return (
    owner === 'you' ||
    owner === 'me' ||
    owner === 'current user'
  );
};

const isSharedDocument = (
  document
) => {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return false;
  }

  if (
    typeof document.isShared ===
    'boolean'
  ) {
    return document.isShared;
  }

  const permission =
    getDocumentPermission(
      document
    );

  if (
    permission &&
    [
      'owner',
      'admin',
    ].includes(permission)
  ) {
    return false;
  }

  if (
    document.sharedWith ||
    document.collaborators ||
    document.members
  ) {
    return true;
  }

  return !isOwnedByCurrentUser(
    document
  );
};

/* ============================================================
   URL HELPERS
============================================================ */

const getInitialFilter = (
  searchParams
) => {
  if (
    searchParams.get(
      'favorite'
    ) === 'true'
  ) {
    return 'favorite';
  }

  if (
    searchParams.get(
      'shared'
    ) === 'true'
  ) {
    return 'shared';
  }

  if (
    searchParams.get(
      'mine'
    ) === 'true'
  ) {
    return 'mine';
  }

  return normalizeFilter(
    searchParams.get(
      'filter'
    )
  );
};

/* ============================================================
   PAGE
============================================================ */

export default function Documents() {
  const navigate =
    useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const {
    documents = [],
    loading = false,
    error = null,
    reload,
    createDocument,
    removeDocument,
    toggleFavorite,
  } = useDocuments();

  /* ==========================================================
     LOCAL STATE
  ========================================================== */

  const [
    query,
    setQuery,
  ] = useState(
    () =>
      safeString(
        searchParams.get(
          'q'
        )
      )
  );

  const [
    filter,
    setFilter,
  ] = useState(
    () =>
      getInitialFilter(
        searchParams
      )
  );

  const [
    sort,
    setSort,
  ] = useState(
    () =>
      normalizeSort(
        searchParams.get(
          'sort'
        )
      )
  );

  const [
    view,
    setView,
  ] = useState(
    () =>
      normalizeView(
        searchParams.get(
          'view'
        )
      )
  );

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    deletingId,
    setDeletingId,
  ] = useState('');

  const [
    favoriteId,
    setFavoriteId,
  ] = useState('');

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState('');

  const debouncedQuery =
    useDebounce(
      query,
      SEARCH_DEBOUNCE_MS
    );

  /* ==========================================================
     SAFE DOCUMENTS
  ========================================================== */

  const safeDocuments =
    useMemo(() => {
      if (
        !Array.isArray(
          documents
        )
      ) {
        return [];
      }

      return documents.filter(
        (document) =>
          document &&
          typeof document ===
          'object' &&
          !Array.isArray(
            document
          )
      );
    }, [documents]);

  /* ==========================================================
     URL SYNCHRONIZATION
  ========================================================== */

  useEffect(() => {
    const params = {};

    const trimmedQuery =
      safeString(
        query
      );

    if (trimmedQuery) {
      params.q =
        trimmedQuery;
    }

    if (
      filter !==
      DEFAULT_FILTER
    ) {
      params.filter =
        filter;
    }

    if (
      sort !==
      DEFAULT_SORT
    ) {
      params.sort =
        sort;
    }

    if (
      view !==
      DEFAULT_VIEW
    ) {
      params.view =
        view;
    }

    setSearchParams(
      params,
      {
        replace: true,
      }
    );
  }, [
    query,
    filter,
    sort,
    view,
    setSearchParams,
  ]);

  /* ==========================================================
     FILTER + SEARCH + SORT
  ========================================================== */

  const filteredDocuments =
    useMemo(() => {
      let result = [
        ...safeDocuments,
      ];

      switch (filter) {
        case 'mine':
          result =
            result.filter(
              isOwnedByCurrentUser
            );
          break;

        case 'shared':
          result =
            result.filter(
              isSharedDocument
            );
          break;

        case 'favorite':
          result =
            result.filter(
              isDocumentFavorite
            );
          break;

        case 'all':
        default:
          break;
      }

      const search =
        safeString(
          debouncedQuery
        ).toLowerCase();

      if (search) {
        result =
          result.filter(
            (document) => {
              const title =
                getDocumentTitle(
                  document
                ).toLowerCase();

              const description =
                getDocumentDescription(
                  document
                ).toLowerCase();

              const owner =
                getDocumentOwner(
                  document
                ).toLowerCase();

              return (
                title.includes(
                  search
                ) ||
                description.includes(
                  search
                ) ||
                owner.includes(
                  search
                )
              );
            }
          );
      }

      result.sort(
        (first, second) => {
          switch (sort) {
            case 'name':
              return getDocumentTitle(
                first
              ).localeCompare(
                getDocumentTitle(
                  second
                ),
                undefined,
                {
                  sensitivity:
                    'base',
                }
              );

            case 'name-desc':
              return getDocumentTitle(
                second
              ).localeCompare(
                getDocumentTitle(
                  first
                ),
                undefined,
                {
                  sensitivity:
                    'base',
                }
              );

            case 'oldest':
              return (
                getUpdatedTimestamp(
                  first
                ) -
                getUpdatedTimestamp(
                  second
                )
              );

            case 'updated':
            default:
              return (
                getUpdatedTimestamp(
                  second
                ) -
                getUpdatedTimestamp(
                  first
                )
              );
          }
        }
      );

      return result;
    }, [
      safeDocuments,
      filter,
      debouncedQuery,
      sort,
    ]);

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const documentStats =
    useMemo(() => {
      const total =
        safeDocuments.length;

      const favorites =
        safeDocuments.filter(
          isDocumentFavorite
        ).length;

      const mine =
        safeDocuments.filter(
          isOwnedByCurrentUser
        ).length;

      const shared =
        safeDocuments.filter(
          isSharedDocument
        ).length;

      return {
        total,
        favorites,
        mine,
        shared,
      };
    }, [
      safeDocuments,
    ]);

  /* ==========================================================
     CREATE MODAL
  ========================================================== */

  const openCreateModal =
    useCallback(() => {
      if (creating) {
        return;
      }

      setActionError('');
      setCreateOpen(true);
    }, [
      creating,
    ]);

  const closeCreateModal =
    useCallback(() => {
      if (creating) {
        return;
      }

      setCreateOpen(false);
      setActionError('');
    }, [
      creating,
    ]);

  /* ==========================================================
     CREATE DOCUMENT
  ========================================================== */

  const handleCreate =
    useCallback(
      async (payload) => {
        if (creating) {
          return null;
        }

        setCreating(true);
        setActionError('');

        try {
          const response =
            await createDocument(
              payload
            );

          const created =
            response?.data &&
              typeof response.data ===
              'object'
              ? response.data
              : response;

          const documentId =
            getDocumentId(
              created
            );

          if (!documentId) {
            throw new Error(
              'Document was created, but no document ID was returned.'
            );
          }

          setCreateOpen(false);

          navigate(
            `/documents/${encodeURIComponent(
              documentId
            )}`
          );

          return created;
        } catch (
        createError
        ) {
          console.error(
            'SyncDoc: document creation failed:',
            createError
          );

          setActionError(
            getErrorMessage(
              createError,
              'Unable to create the document. Please try again.'
            )
          );

          return null;
        } finally {
          setCreating(false);
        }
      },
      [
        creating,
        createDocument,
        navigate,
      ]
    );

  /* ==========================================================
     OPEN DOCUMENT
  ========================================================== */

  const handleOpenDocument =
    useCallback(
      (document) => {
        const documentId =
          getDocumentId(
            document
          );

        if (!documentId) {
          console.warn(
            'SyncDoc: document has no valid ID.',
            document
          );

          setActionError(
            'Unable to open this document because its ID is missing.'
          );

          return;
        }

        setActionError('');

        navigate(
          `/documents/${encodeURIComponent(
            documentId
          )}`
        );
      },
      [navigate]
    );

  /* ==========================================================
     DELETE DOCUMENT
  ========================================================== */

  const handleDelete =
    useCallback(
      async (document) => {
        const documentId =
          getDocumentId(
            document
          );

        if (
          !documentId ||
          deletingId
        ) {
          return;
        }

        setDeletingId(
          documentId
        );

        setActionError('');

        try {
          await removeDocument(
            document
          );
        } catch (
        deleteError
        ) {
          console.error(
            'SyncDoc: failed to remove document:',
            deleteError
          );

          setActionError(
            getErrorMessage(
              deleteError,
              'Unable to delete the document.'
            )
          );
        } finally {
          setDeletingId('');
        }
      },
      [
        deletingId,
        removeDocument,
      ]
    );

  /* ==========================================================
     TOGGLE FAVORITE
  ========================================================== */

  const handleFavorite =
    useCallback(
      async (document) => {
        if (
          typeof toggleFavorite !==
          'function'
        ) {
          return;
        }

        const documentId =
          getDocumentId(
            document
          );

        if (
          !documentId ||
          favoriteId
        ) {
          return;
        }

        setFavoriteId(
          documentId
        );

        setActionError('');

        try {
          await toggleFavorite(
            document
          );
        } catch (
        favoriteError
        ) {
          console.error(
            'SyncDoc: failed to update favorite:',
            favoriteError
          );

          setActionError(
            getErrorMessage(
              favoriteError,
              'Unable to update favorite status.'
            )
          );
        } finally {
          setFavoriteId('');
        }
      },
      [
        favoriteId,
        toggleFavorite,
      ]
    );

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(
      async () => {
        if (
          refreshing ||
          typeof reload !==
          'function'
        ) {
          return;
        }

        setRefreshing(true);
        setActionError('');

        try {
          await reload();
        } catch (
        refreshError
        ) {
          console.error(
            'SyncDoc: failed to refresh documents:',
            refreshError
          );

          setActionError(
            getErrorMessage(
              refreshError,
              'Unable to refresh documents.'
            )
          );
        } finally {
          setRefreshing(false);
        }
      },
      [
        refreshing,
        reload,
      ]
    );

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  const handleClearFilters =
    useCallback(() => {
      setQuery('');
      setFilter(
        DEFAULT_FILTER
      );
      setSort(
        DEFAULT_SORT
      );
    }, []);

  /* ==========================================================
     FINAL SAFE ERROR MESSAGE
  ========================================================== */

  const errorMessage =
    useMemo(() => {
      if (actionError) {
        return getErrorMessage(
          actionError,
          ''
        );
      }

      if (error) {
        return getErrorMessage(
          error,
          ''
        );
      }

      return '';
    }, [
      actionError,
      error,
    ]);

  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  const emptyState =
    useMemo(() => {
      const hasSearch =
        Boolean(
          safeString(
            debouncedQuery
          )
        );

      if (hasSearch) {
        return {
          icon: '⌕',
          title:
            'No documents found',
          description:
            'Try a different search term or clear your search.',
        };
      }

      switch (filter) {
        case 'favorite':
          return {
            icon: '★',
            title:
              'No favorite documents',
            description:
              'Favorite important documents to find them quickly.',
          };

        case 'mine':
          return {
            icon: '□',
            title:
              'No documents created by you',
            description:
              'Create your first document to start building your workspace.',
          };

        case 'shared':
          return {
            icon: '↗',
            title:
              'No shared documents',
            description:
              'Documents shared with you will appear here.',
          };

        default:
          return {
            icon: '□',
            title:
              'No documents yet',
            description:
              'Create a document to start writing and collaborating.',
          };
      }
    }, [
      debouncedQuery,
      filter,
    ]);

  /* ==========================================================
     FLAGS
  ========================================================== */

  const hasDocuments =
    safeDocuments.length > 0;

  const hasFilteredDocuments =
    filteredDocuments.length > 0;

  const hasActiveFilters =
    Boolean(
      safeString(query)
    ) ||
    filter !==
    DEFAULT_FILTER ||
    sort !==
    DEFAULT_SORT;

  const isRefreshing =
    loading ||
    refreshing;

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className="documents-page"
      aria-labelledby="documents-title"
    >
      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <header className="page-heading">
        <div>
          <span className="eyebrow">
            CONTENT
          </span>

          <h1 id="documents-title">
            Documents
          </h1>

          <p>
            Everything your team is
            creating, in one place.
          </p>

          <div
            className="documents-summary"
            aria-label="Document statistics"
          >
            <span>
              {documentStats.total}{' '}
              {documentStats.total ===
                1
                ? 'document'
                : 'documents'}
            </span>

            <span
              aria-hidden="true"
            >
              ·
            </span>

            <span>
              {documentStats.favorites}{' '}
              favorites
            </span>

            <span
              aria-hidden="true"
            >
              ·
            </span>

            <span>
              {documentStats.mine}{' '}
              mine
            </span>

            <span
              aria-hidden="true"
            >
              ·
            </span>

            <span>
              {documentStats.shared}{' '}
              shared
            </span>
          </div>
        </div>

        <div className="page-heading-actions">
          <Button
            variant="secondary"
            onClick={
              handleRefresh
            }
            disabled={
              isRefreshing ||
              creating
            }
            aria-label="Refresh documents"
            aria-busy={
              isRefreshing
            }
          >
            {isRefreshing
              ? 'Refreshing...'
              : '↻ Refresh'}
          </Button>

          <Button
            variant="primary"
            onClick={
              openCreateModal
            }
            disabled={
              creating
            }
          >
            ＋ New document
          </Button>
        </div>
      </header>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {errorMessage && (
        <div
          className="documents-alert"
          role="alert"
        >
          <div className="documents-alert-content">
            <strong>
              Unable to complete request
            </strong>

            <span>
              {String(
                errorMessage
              )}
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={
              handleRefresh
            }
            disabled={
              isRefreshing
            }
          >
            {isRefreshing
              ? 'Retrying...'
              : 'Retry'}
          </Button>
        </div>
      )}

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <section
        className="document-toolbar"
        aria-label="Document controls"
      >
        <DocumentSearch
          value={query}
          onChange={
            setQuery
          }
        />

        <DocumentFilters
          filter={filter}
          setFilter={
            (value) =>
              setFilter(
                normalizeFilter(
                  value
                )
              )
          }
          sort={sort}
          setSort={
            (value) =>
              setSort(
                normalizeSort(
                  value
                )
              )
          }
          view={view}
          setView={
            (value) =>
              setView(
                normalizeView(
                  value
                )
              )
          }
        />
      </section>

      {/* ======================================================
          RESULT SUMMARY
      ====================================================== */}

      <div
        className="document-result-summary"
        aria-live="polite"
      >
        <span>
          Showing{' '}
          <strong>
            {
              filteredDocuments.length
            }
          </strong>{' '}
          of{' '}
          <strong>
            {
              safeDocuments.length
            }
          </strong>{' '}
          {safeDocuments.length ===
            1
            ? 'document'
            : 'documents'}
        </span>

        {hasActiveFilters && (
          <button
            type="button"
            className="document-clear-search"
            onClick={
              handleClearFilters
            }
            disabled={
              creating ||
              deletingId !== ''
            }
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ======================================================
          INITIAL LOADING
      ====================================================== */}

      {loading &&
        !hasDocuments && (
          <div
            className="documents-loading"
            role="status"
            aria-live="polite"
          >
            <span
              className="spinner"
              aria-hidden="true"
            />

            <span>
              Loading documents...
            </span>
          </div>
        )}

      {/* ======================================================
          DOCUMENT CONTENT
      ====================================================== */}

      {!(
        loading &&
        !hasDocuments
      ) &&
        hasFilteredDocuments && (
          <div
            className="documents-content"
            aria-live="polite"
          >
            {view === 'grid' ? (
              <DocumentGrid
                documents={
                  filteredDocuments
                }
                onDelete={
                  handleDelete
                }
                onFavorite={
                  handleFavorite
                }
                onOpen={
                  handleOpenDocument
                }
                deletingId={
                  deletingId
                }
                favoriteId={
                  favoriteId
                }
              />
            ) : (
              <DocumentList
                documents={
                  filteredDocuments
                }
                onDelete={
                  handleDelete
                }
                onFavorite={
                  handleFavorite
                }
                onOpen={
                  handleOpenDocument
                }
                deletingId={
                  deletingId
                }
                favoriteId={
                  favoriteId
                }
              />
            )}
          </div>
        )}

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!loading &&
        !hasFilteredDocuments && (
          <section
            className="documents-empty-state"
            aria-labelledby="documents-empty-title"
          >
            <div
              className="documents-empty-icon"
              aria-hidden="true"
            >
              {
                emptyState.icon
              }
            </div>

            <h2 id="documents-empty-title">
              {
                emptyState.title
              }
            </h2>

            <p>
              {
                emptyState.description
              }
            </p>

            {hasActiveFilters ? (
              <Button
                variant="secondary"
                onClick={
                  handleClearFilters
                }
              >
                Clear filters
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={
                  openCreateModal
                }
                disabled={
                  creating
                }
              >
                ＋ Create document
              </Button>
            )}
          </section>
        )}

      {/* ======================================================
          CREATE DOCUMENT MODAL
      ====================================================== */}

      <CreateDocumentModal
        open={
          createOpen
        }
        onClose={
          closeCreateModal
        }
        onCreate={
          handleCreate
        }
        loading={
          creating
        }
        disabled={
          creating
        }
        error={
          actionError
        }
      />

      {/* ======================================================
          BACKGROUND REFRESH STATUS
      ====================================================== */}

      {refreshing && (
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Refreshing document data.
        </div>
      )}
    </main>
  );
}
