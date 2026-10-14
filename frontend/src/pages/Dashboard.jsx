
import "./dashboard-premium.css";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Download,
  FilePlus2,
  Files,
  FolderKanban,
  Search,
  Sparkles,
  RefreshCw,
} from "lucide-react";

import DashboardHeader from "../components/dashboard/DashboardHeader";
import StatsGrid from "../components/dashboard/StatsGrid";
import ProductivityChart from "../components/dashboard/ProductivityChart";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import RecentDocuments from "../components/dashboard/RecentDocuments";
import CreateDocumentModal from "../components/documents/CreateDocumentModal";
import useDashboard from "../hooks/useDashboard";
import documentService from "../services/documentService";
import { useAuth } from "../context/AuthContext";

const getId = (document) =>
  String(
    document?.id ||
      document?._id ||
      document?.documentId ||
      ""
  ).trim();

const getName = (user) =>
  user?.displayName ||
  user?.name ||
  user?.username ||
  "there";

const getError = (error, fallback = "") =>
  error?.dashboardMessage ||
  error?.documentMessage ||
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  fallback;

const unwrap = (response) =>
  response?.data && typeof response.data === "object"
    ? response.data
    : response;

const greeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
};

const timeLabel = (date) =>
  date
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
      }).format(date)
    : "Waiting for refresh";

function exportCsv(items) {
  const rows = [
    ["Title", "Document ID", "Updated At"],
    ...items.map((document) => [
      document.title || document.name || "Untitled document",
      getId(document),
      document.updatedAt || document.updated_at || "",
    ]),
  ];

  const csv = rows
    .map((row) =>
      row
        .map(
          (value) =>
            '"' + String(value ?? "").replace(/"/g, '""') + '"'
        )
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(["\uFEFF", csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `syncdoc-documents-${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // Delay revocation so browsers can begin the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [query, setQuery] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const mounted = useRef(true);
  const refreshLock = useRef(false);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const docs = useMemo(
    () =>
      Array.isArray(recentDocuments)
        ? recentDocuments.filter(
            (item) => item && typeof item === "object"
          )
        : [],
    [recentDocuments]
  );

  const safeStats = Array.isArray(stats) ? stats : [];

  // The productivity API returns an object keyed by period,
  // such as { "7": [{ id, label, value }] }.
  const safeProductivity =
    productivity &&
    typeof productivity === "object" &&
    !Array.isArray(productivity)
      ? productivity
      : {};

  const safeActivity = Array.isArray(activity) ? activity : [];

  const filteredDocs = useMemo(() => {
    const searchTerm = query.trim().toLowerCase();

    if (!searchTerm) return docs;

    return docs.filter((item) => {
      const title = String(
        item.title || item.name || "Untitled document"
      ).toLowerCase();

      return (
        title.includes(searchTerm) ||
        getId(item).toLowerCase().includes(searchTerm)
      );
    });
  }, [docs, query]);

  const message = actionError || getError(error);
  const busy = loading || refreshing || creating;

  const refresh = useCallback(
    async (silent = false) => {
      if (refreshLock.current) return;

      refreshLock.current = true;

      if (!silent) setRefreshing(true);

      setActionError("");

      try {
        await reload();

        if (mounted.current) {
          setLastUpdated(new Date());
        }
      } catch (refreshError) {
        if (mounted.current && !silent) {
          setActionError(
            getError(
              refreshError,
              "Unable to refresh the dashboard."
            )
          );
        }
      } finally {
        refreshLock.current = false;

        if (mounted.current && !silent) {
          setRefreshing(false);
        }
      }
    },
    [reload]
  );

  // Refresh periodically while the dashboard tab is visible.
  useEffect(() => {
    if (!autoRefresh) return undefined;

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh(true);
      }
    }, 60000);

    return () => window.clearInterval(timer);
  }, [autoRefresh, refresh]);

  const openCreate = useCallback(() => {
    if (creating) return;

    setActionError("");
    setCreateOpen(true);
  }, [creating]);

  const closeCreate = useCallback(() => {
    if (creating) return;

    setCreateOpen(false);
    setActionError("");
  }, [creating]);

  const createDocument = useCallback(
    async (payload) => {
      if (creating) return null;

      setCreating(true);
      setActionError("");

      try {
        const response = await documentService.create(payload);
        const created = unwrap(response);
        const id = getId(created);

        if (!id) {
          throw new Error(
            "The server did not return a document ID. Check the document API response."
          );
        }

        if (mounted.current) {
          setCreateOpen(false);
        }

        // Creation must succeed even if the dashboard refresh fails.
        try {
          await reload();

          if (mounted.current) {
            setLastUpdated(new Date());
          }
        } catch (reloadError) {
          console.error(
            "Dashboard reload after creation failed:",
            reloadError
          );
        }

        navigate(`/documents/${encodeURIComponent(id)}`);

        return created;
      } catch (createError) {
        if (mounted.current) {
          setActionError(
            getError(
              createError,
              "Unable to create the document."
            )
          );
        }

        return null;
      } finally {
        if (mounted.current) {
          setCreating(false);
        }
      }
    },
    [creating, navigate, reload]
  );

  const openDocument = useCallback(
    (item) => {
      const id = getId(item);

      if (!id) {
        setActionError(
          "This document cannot be opened because its ID is missing."
        );
        return;
      }

      setActionError("");

      navigate(`/documents/${encodeURIComponent(id)}`);
    },
    [navigate]
  );

  const statClick = useCallback(
    (stat) => {
      const id = String(stat?.id || "").toLowerCase();

      if (id === "documents") {
        navigate("/documents");
      }

      if (id === "projects" || id === "workspaces") {
        navigate("/projects");
      }
    },
    [navigate]
  );

  const actions = [
    {
      id: "create",
      title: "Create a document",
      description: "Capture an idea and get started",
      icon: FilePlus2,
      onClick: openCreate,
    },
    {
      id: "documents",
      title: "Browse documents",
      description: "Find your team's knowledge",
      icon: Files,
      onClick: () => navigate("/documents"),
    },
    {
      id: "projects",
      title: "Explore projects",
      description: "Organize work by workspace",
      icon: FolderKanban,
      onClick: () => navigate("/projects"),
    },
  ];

  return (
    <main
      className="dashboard-page dashboard-premium"
      aria-labelledby="dashboard-title"
    >
      <div className="dashboard-header-wrapper">
        <DashboardHeader
          onCreate={openCreate}
          loading={busy}
          onRefresh={() => refresh()}
        />
      </div>

      <section className="sd-hero" aria-label="Dashboard overview">
        <div className="sd-orb sd-orb-a" />
        <div className="sd-orb sd-orb-b" />

        <div className="sd-hero-copy">
          <span className="sd-eyebrow">
            <Sparkles size={14} />
            YOUR WORKSPACE, AT A GLANCE
          </span>

          <h1 id="dashboard-title">
            {greeting()}, {getName(user)}
            <span>.</span>
          </h1>

          <p>
            Your ideas, documents, and team momentum — all in one
            focused workspace.
          </p>

          <div className="sd-live-meta">
            <i />
            Workspace overview
            <b />
            <Clock3 size={13} />
            Updated {timeLabel(lastUpdated)}
          </div>
        </div>

        <div className="sd-hero-actions">
          <button
            className="sd-button sd-button-light"
            onClick={openCreate}
            disabled={creating}
          >
            <FilePlus2 size={17} />
            {creating ? "Creating…" : "New document"}
            <ArrowRight size={16} />
          </button>

          <button
            className="sd-button sd-button-glass"
            onClick={() => refresh()}
            disabled={loading || refreshing}
          >
            <RefreshCw
              size={15}
              className={refreshing ? "sd-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </section>

      {message && (
        <div className="sd-alert" role="alert">
          <strong>!</strong>

          <div>
            <b>
              {actionError
                ? "Action needs attention"
                : "Dashboard unavailable"}
            </b>
            <p>{message}</p>
          </div>

          <button onClick={() => refresh()}>Try again</button>
        </div>
      )}

      <section className="dashboard-stats-section">
        <div className="sd-section-heading">
          <div>
            <span className="sd-kicker">THE BIG PICTURE</span>
            <h2>Workspace overview</h2>
          </div>

          <span className="sd-note">
            <Activity size={14} />
            Live workspace metrics
          </span>
        </div>

        <StatsGrid
          stats={safeStats}
          loading={loading}
          onStatClick={statClick}
        />
      </section>

      <section className="dashboard-quick-actions">
        <div className="sd-section-heading">
          <div>
            <span className="sd-kicker">MOVE FASTER</span>
            <h2>Quick actions</h2>
          </div>
        </div>

        <div className="sd-action-grid">
          {actions.map(
            ({ id, title, description, icon: Icon, onClick }) => (
              <button
                key={id}
                className="sd-action-card"
                onClick={onClick}
                disabled={id === "create" && creating}
              >
                <span className={`sd-action-icon sd-${id}`}>
                  <Icon size={20} />
                </span>

                <span className="sd-action-info">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>

                <ArrowUpRight
                  className="sd-action-arrow"
                  size={18}
                />
              </button>
            )
          )}
        </div>
      </section>

      <section className="dashboard-insights">
        <div className="sd-section-heading">
          <div>
            <span className="sd-kicker">YOUR MOMENTUM</span>
            <h2>Productivity &amp; activity</h2>
          </div>

          <span className="sd-note">
            <Activity size={14} />
            Based on workspace data
          </span>
        </div>

        <div className="dashboard-two-column">
          <ProductivityChart
            data={safeProductivity}
            loading={loading}
          />

          <ActivityFeed
            activities={safeActivity}
            loading={loading}
            showViewAll={false}
          />
        </div>
      </section>

      <section className="dashboard-section sd-documents-section">
        <div className="sd-section-heading sd-docs-heading">
          <div>
            <span className="sd-kicker">
              PICK UP WHERE YOU LEFT OFF
            </span>
            <h2>Recent documents</h2>
            <p>Jump back into your latest work.</p>
          </div>

          <div className="sd-doc-tools">
            <label className="sd-search">
              <Search size={16} />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search documents"
                aria-label="Search recent documents"
              />

              {query && (
                <button
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  type="button"
                >
                  ×
                </button>
              )}
            </label>

            <button
              className="sd-tool-button"
              onClick={() => exportCsv(filteredDocs)}
              disabled={!filteredDocs.length}
            >
              <Download size={15} />
              Export
            </button>

            <button
              className="sd-view-all"
              onClick={() => navigate("/documents")}
            >
              View all
              <ArrowRight size={15} />
            </button>
          </div>
        </div>

        {loading && !docs.length ? (
          <div className="sd-loading" role="status">
            <i />
            Loading your documents…
          </div>
        ) : filteredDocs.length ? (
          <RecentDocuments
            documents={filteredDocs}
            onOpen={openDocument}
          />
        ) : (
          <div className="sd-empty">
            <div className="sd-empty-icon">
              <Files size={22} />
            </div>

            <div>
              <h3>
                {query
                  ? "No matching documents"
                  : "Your workspace starts here"}
              </h3>

              <p>
                {query
                  ? "Try another title or document ID."
                  : "Create your first document and turn your next idea into progress."}
              </p>
            </div>

            <button
              onClick={
                query ? () => setQuery("") : openCreate
              }
            >
              {query ? "Clear search" : "Create document"}
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>

      <footer className="sd-footer">
        <label>
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) =>
              setAutoRefresh(event.target.checked)
            }
          />

          <span className="sd-toggle" />
          <span>Auto-refresh every minute</span>
        </label>

        <span>
          SyncDoc workspace <b>/</b> Dashboard
        </span>
      </footer>

      <CreateDocumentModal
        open={createOpen}
        onClose={closeCreate}
        onCreate={createDocument}
        loading={creating}
        disabled={creating}
        error={actionError}
      />

      {creating && (
        <div className="dashboard-action-status" role="status">
          <span className="sd-loader" />
          Creating your document…
        </div>
      )}

      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {loading
          ? "Loading dashboard"
          : `Dashboard loaded. ${docs.length} recent documents.`}
      </div>
    </main>
  );
}
