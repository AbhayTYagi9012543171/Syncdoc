
import React, {
  useCallback,
  useMemo,
  useState,
} from 'react';

import { useNavigate } from 'react-router-dom';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import StatsGrid from '../components/dashboard/StatsGrid';
import ProductivityChart from '../components/dashboard/ProductivityChart';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import RecentDocuments from '../components/dashboard/RecentDocuments';
import CreateDocumentModal from '../components/documents/CreateDocumentModal';

import useDashboard from '../hooks/useDashboard';
import documentService from '../services/documentService';
import { useAuth } from '../context/AuthContext';

/* ============================================================
   HELPERS
============================================================ */

function getDocumentId(document) {
  if (
    !document ||
    typeof document !== 'object'
  ) {
    return '';
  }

  return String(
    document.id ||
    document._id ||
    document.documentId ||
    ''
  ).trim();
}

function getDisplayName(user) {
  if (!user || typeof user !== 'object') {
    return 'there';
  }

  return (
    user.displayName ||
    user.name ||
    user.username ||
    'there'
  );
}

function getErrorMessage(error, fallback = '') {
  if (!error) {
    return fallback;
  }

  return (
    error?.dashboardMessage ||
    error?.documentMessage ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function normalizeCreatedDocument(response) {
  if (!response) {
    return null;
  }

  if (
    response?.data &&
    typeof response.data === 'object'
  ) {
    return response.data;
  }

  return response;
}

/* ============================================================
   DASHBOARD
============================================================ */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    stats,
    productivity,
    activity,
    recentDocuments,
    loading,
    error,
    reload,
  } = useDashboard();

  const [createOpen, setCreateOpen] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionError, setActionError] =
    useState('');

  /* ==========================================================
     DERIVED VALUES
  ========================================================== */

  const displayName = useMemo(
    () => getDisplayName(user),
    [user]
  );

  const safeDocuments = useMemo(() => {
    if (!Array.isArray(recentDocuments)) {
      return [];
    }

    return recentDocuments.filter(
      (item) =>
        item &&
        typeof item === 'object'
    );
  }, [recentDocuments]);

  const safeStats = useMemo(() => {
    return Array.isArray(stats)
      ? stats
      : [];
  }, [stats]);

  const safeProductivity = useMemo(() => {
    return Array.isArray(productivity)
      ? productivity
      : [];
  }, [productivity]);

  const safeActivity = useMemo(() => {
    return Array.isArray(activity)
      ? activity
      : [];
  }, [activity]);

  const dashboardError =
    getErrorMessage(error);

  const errorMessage =
    actionError ||
    dashboardError;

  const hasDocuments =
    safeDocuments.length > 0;

  const isBusy =
    loading ||
    refreshing ||
    creating;

  /* ==========================================================
     NAVIGATION
  ========================================================== */

  const navigateToDocuments =
    useCallback(() => {
      navigate('/documents');
    }, [navigate]);

  const navigateToProjects =
    useCallback(() => {
      navigate('/projects');
    }, [navigate]);

  /* ==========================================================
     REFRESH DASHBOARD
  ========================================================== */

  const handleRefresh = useCallback(
    async () => {
      if (refreshing) {
        return;
      }

      setRefreshing(true);
      setActionError('');

      try {
        await reload();
      } catch (err) {
        console.error(
          'SyncDoc: dashboard refresh failed:',
          err
        );

        setActionError(
          getErrorMessage(
            err,
            'Unable to refresh the dashboard.'
          )
        );
      } finally {
        setRefreshing(false);
      }
    },
    [refreshing, reload]
  );

  /* ==========================================================
     CREATE MODAL
  ========================================================== */

  const handleOpenCreate =
    useCallback(() => {
      if (creating) {
        return;
      }

      setActionError('');
      setCreateOpen(true);
    }, [creating]);

  const handleCloseCreate =
    useCallback(() => {
      if (creating) {
        return;
      }

      setCreateOpen(false);
      setActionError('');
    }, [creating]);

  /* ==========================================================
     CREATE DOCUMENT
  ========================================================== */

  const handleCreateDocument =
    useCallback(
      async (payload) => {
        if (creating) {
          return null;
        }

        setCreating(true);
        setActionError('');

        try {
          const response =
            await documentService.create(
              payload
            );

          const document =
            normalizeCreatedDocument(
              response
            );

          const documentId =
            getDocumentId(document);

          if (!documentId) {
            throw new Error(
              'Document was created, but the server returned no document ID.'
            );
          }

          setCreateOpen(false);

          /*
           * Reloading before navigation keeps dashboard
           * data fresh when user later returns.
           *
           * If reload fails, document creation should
           * still continue successfully.
           */
          try {
            await reload();
          } catch (reloadError) {
            console.error(
              'SyncDoc: dashboard reload after document creation failed:',
              reloadError
            );
          }

          navigate(
            `/documents/${encodeURIComponent(
              documentId
            )}`
          );

          return document;
        } catch (err) {
          console.error(
            'SyncDoc: create document failed:',
            err
          );

          setActionError(
            getErrorMessage(
              err,
              'Unable to create the document.'
            )
          );

          return null;
        } finally {
          setCreating(false);
        }
      },
      [
        creating,
        navigate,
        reload,
      ]
    );

  /* ==========================================================
     OPEN DOCUMENT
  ========================================================== */

  const handleOpenDocument =
    useCallback(
      (document) => {
        const documentId =
          getDocumentId(document);

        if (!documentId) {
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
     STAT CLICK
  ========================================================== */

  const handleStatClick =
    useCallback(
      (stat) => {
        const id = String(
          stat?.id || ''
        ).toLowerCase();

        switch (id) {
          case 'documents':
            navigateToDocuments();
            break;

          case 'projects':
          case 'workspaces':
            navigateToProjects();
            break;

          default:
            break;
        }
      },
      [
        navigateToDocuments,
        navigateToProjects,
      ]
    );

  /* ==========================================================
     QUICK ACTIONS
  ========================================================== */

  const quickActions = useMemo(
    () => [
      {
        id: 'create',
        title: 'New document',
        description:
          'Start a fresh document',
        icon: '+',
        action:
          handleOpenCreate,
        disabled: creating,
      },
      {
        id: 'documents',
        title: 'Browse documents',
        description:
          'View your accessible documents',
        icon: '□',
        action:
          navigateToDocuments,
        disabled: false,
      },
      {
        id: 'projects',
        title: 'View projects',
        description:
          'Manage your workspaces',
        icon: '▦',
        action:
          navigateToProjects,
        disabled: false,
      },
    ],
    [
      creating,
      handleOpenCreate,
      navigateToDocuments,
      navigateToProjects,
    ]
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className="dashboard-page"
      aria-labelledby="dashboard-title"
    >

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="dashboard-header-wrapper">
        <DashboardHeader
          onCreate={
            handleOpenCreate
          }
          loading={isBusy}
          onRefresh={
            handleRefresh
          }
        />
      </div>

      {/* ======================================================
          WELCOME SECTION
      ====================================================== */}

      <section
        className="dashboard-welcome"
        aria-label="Dashboard overview"
      >
        <div className="dashboard-welcome-content">

          <span className="dashboard-eyebrow">
            WORKSPACE OVERVIEW
          </span>

          <h1 id="dashboard-title">
            Welcome back, {displayName}
          </h1>

          <p>
            Everything happening across your
            documents and collaborative workspace,
            in one place.
          </p>

        </div>

        <button
          type="button"
          className="dashboard-primary-action"
          onClick={
            handleOpenCreate
          }
          disabled={creating}
          aria-busy={creating}
        >
          <span
            className="dashboard-primary-action-icon"
            aria-hidden="true"
          >
            +
          </span>

          <span>
            {creating
              ? 'Creating...'
              : 'Create document'}
          </span>
        </button>

      </section>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {errorMessage && (
        <div
          className="dashboard-alert"
          role="alert"
        >
          <div
            className="dashboard-alert-icon"
            aria-hidden="true"
          >
            !
          </div>

          <div className="dashboard-alert-content">
            <strong>
              {actionError
                ? 'Something went wrong'
                : 'Unable to load dashboard'}
            </strong>

            <span>
              {errorMessage}
            </span>
          </div>

          {!creating && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={
                handleRefresh
              }
              disabled={
                loading ||
                refreshing
              }
            >
              {refreshing
                ? 'Retrying...'
                : 'Retry'}
            </button>
          )}
        </div>
      )}

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <section
        className="dashboard-stats-section"
        aria-labelledby="dashboard-stats-title"
      >
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">
              OVERVIEW
            </span>

            <h2 id="dashboard-stats-title">
              Workspace activity
            </h2>
          </div>
        </div>

        <StatsGrid
          stats={safeStats}
          loading={loading}
          onStatClick={
            handleStatClick
          }
        />
      </section>

      {/* ======================================================
          QUICK ACTIONS
      ====================================================== */}

      <section
        className="dashboard-quick-actions"
        aria-labelledby="dashboard-actions-title"
      >
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">
              QUICK ACTIONS
            </span>

            <h2 id="dashboard-actions-title">
              Get things done
            </h2>
          </div>
        </div>

        <div className="dashboard-action-grid">

          {quickActions.map(
            (item) => (
              <button
                key={item.id}
                type="button"
                className="dashboard-action-card"
                onClick={
                  item.action
                }
                disabled={
                  item.disabled
                }
              >

                <span
                  className="dashboard-action-icon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>

                <span className="dashboard-action-info">

                  <strong>
                    {item.title}
                  </strong>

                  <small>
                    {item.description}
                  </small>

                </span>

                <span
                  className="dashboard-action-arrow"
                  aria-hidden="true"
                >
                  →
                </span>

              </button>
            )
          )}

        </div>
      </section>

      {/* ======================================================
          PRODUCTIVITY + ACTIVITY
      ====================================================== */}

      <section
        className="dashboard-insights"
        aria-labelledby="dashboard-insights-title"
      >
        <div className="dashboard-section-heading">
          <div>
            <span className="dashboard-section-kicker">
              INSIGHTS
            </span>

            <h2 id="dashboard-insights-title">
              Productivity &amp; activity
            </h2>
          </div>
        </div>

        <div className="dashboard-two-column">

          <ProductivityChart
            data={
              safeProductivity
            }
            loading={loading}
          />

          <ActivityFeed
            activities={
              safeActivity
            }
            loading={loading}
            showViewAll={false}
          />

        </div>
      </section>

      {/* ======================================================
          RECENT DOCUMENTS
      ====================================================== */}

      <section
        className="dashboard-section"
        aria-labelledby="recent-documents-title"
      >
        <div className="dashboard-section-heading">

          <div>
            <span className="dashboard-section-kicker">
              DOCUMENTS
            </span>

            <h2 id="recent-documents-title">
              Recent documents
            </h2>
          </div>

          {hasDocuments && (
            <button
              type="button"
              className="dashboard-view-all"
              onClick={
                navigateToDocuments
              }
            >
              View all

              <span aria-hidden="true">
                →
              </span>
            </button>
          )}

        </div>

        {loading &&
          !hasDocuments ? (
          <div
            className="dashboard-loading-card"
            role="status"
            aria-live="polite"
          >
            <span
              className="spinner"
              aria-hidden="true"
            />

            <span>
              Loading your documents...
            </span>
          </div>
        ) : (
          <RecentDocuments
            documents={
              safeDocuments
            }
            onOpen={
              handleOpenDocument
            }
          />
        )}
      </section>

      {/* ======================================================
          EMPTY STATE
      ====================================================== */}

      {!loading &&
        !hasDocuments &&
        !dashboardError && (
          <section
            className="dashboard-empty-state"
            aria-labelledby="dashboard-empty-title"
          >
            <div
              className="dashboard-empty-icon"
              aria-hidden="true"
            >
              +
            </div>

            <div className="dashboard-empty-content">

              <span className="dashboard-section-kicker">
                GET STARTED
              </span>

              <h2 id="dashboard-empty-title">
                Create your first document
              </h2>

              <p>
                Start writing, collaborating,
                and organizing your work in
                SyncDoc.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  handleOpenCreate
                }
                disabled={creating}
              >
                {creating
                  ? 'Creating...'
                  : 'Create document'}
              </button>

            </div>
          </section>
        )}

      {/* ======================================================
          CREATE DOCUMENT MODAL
      ====================================================== */}

      <CreateDocumentModal
        open={createOpen}
        onClose={
          handleCloseCreate
        }
        onCreate={
          handleCreateDocument
        }
        loading={creating}
        disabled={creating}
        error={actionError}
      />

      {/* ======================================================
          CREATE STATUS
      ====================================================== */}

      {creating && (
        <div
          className="dashboard-action-status"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span
            className="spinner"
            aria-hidden="true"
          />

          <span>
            Creating your document...
          </span>
        </div>
      )}

      {/* ======================================================
          REFRESH STATUS
      ====================================================== */}

      {refreshing && (
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
        >
          Refreshing dashboard data.
        </div>
      )}

    </main>
  );
}

