import "./pages-premium.css";
import "./projects-premium.css";

import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownAZ,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  LayoutGrid,
  ListFilter,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Users,
  X,
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Layers3,
} from "lucide-react";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import useWorkspace from "../hooks/useWorkspace";

/* ============================================================
   CONFIGURATION
============================================================ */

const DEFAULT_NAME = "Untitled workspace";
const DEFAULT_DESCRIPTION = "A place for your team's work.";
const DEFAULT_SORT = "updated";
const MAX_NAME_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 500;

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Recently created" },
  { value: "name", label: "Name: A to Z" },
  { value: "documents", label: "Most documents" },
  { value: "members", label: "Most members" },
];

const FILTER_OPTIONS = [
  { value: "all", label: "All projects" },
  { value: "active", label: "Active" },
  { value: "recent", label: "Recently active" },
  { value: "quiet", label: "Quiet" },
];

/* ============================================================
   DATA HELPERS
============================================================ */

function getId(workspace) {
  if (!workspace || typeof workspace !== "object") return "";

  return String(
    workspace._id ??
      workspace.id ??
      workspace.workspaceId ??
      ""
  ).trim();
}

function getName(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return DEFAULT_NAME;
  }

  return String(
    workspace.name ??
      workspace.title ??
      DEFAULT_NAME
  ).trim() || DEFAULT_NAME;
}

function getDescription(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return DEFAULT_DESCRIPTION;
  }

  return String(
    workspace.description ??
      workspace.summary ??
      DEFAULT_DESCRIPTION
  ).trim() || DEFAULT_DESCRIPTION;
}

function getDocuments(workspace) {
  if (!workspace || typeof workspace !== "object") return 0;

  const value =
    workspace.documentCount ??
    workspace.documentsCount ??
    (Array.isArray(workspace.documents)
      ? workspace.documents.length
      : workspace.documents) ??
    0;

  const count = Number(value);
  return Number.isFinite(count) ? Math.max(0, count) : 0;
}

function getMembers(workspace) {
  if (!workspace || typeof workspace !== "object") return 0;

  const explicit =
    workspace.memberCount ??
    workspace.membersCount ??
    workspace.membersCountTotal;

  if (explicit !== undefined && explicit !== null) {
    const count = Number(explicit);
    return Number.isFinite(count) ? Math.max(0, count) : 0;
  }

  const members = Array.isArray(workspace.members)
    ? workspace.members.length
    : 0;

  // Avoid double-counting an owner if they are already in members.
  const ownerId =
    typeof workspace.owner === "object"
      ? String(workspace.owner?._id ?? workspace.owner?.id ?? "")
      : String(workspace.owner ?? "");

  const ownerIncluded =
    ownerId &&
    Array.isArray(workspace.members) &&
    workspace.members.some((member) => {
      const memberId =
        typeof member === "object"
          ? String(member?._id ?? member?.id ?? member?.user?._id ?? "")
          : String(member ?? "");

      return memberId && memberId === ownerId;
    });

  return members + (ownerId && !ownerIncluded ? 1 : 0);
}

function getDateValue(workspace, kind = "updated") {
  if (!workspace || typeof workspace !== "object") return 0;

  const value =
    kind === "created"
      ? workspace.createdAt ?? workspace.created_at
      : workspace.updatedAt ??
        workspace.updated_at ??
        workspace.modifiedAt ??
        workspace.createdAt ??
        workspace.created_at;

  if (!value) return 0;

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getStatus(workspace, now = Date.now()) {
  const timestamp = getDateValue(workspace);
  if (!timestamp) return "quiet";

  const age = Math.max(0, now - timestamp);

  if (age < 24 * 60 * 60 * 1000) return "active";
  if (age < 7 * 24 * 60 * 60 * 1000) return "recent";

  return "quiet";
}

function getRelativeActivity(workspace) {
  const timestamp = getDateValue(workspace);

  if (!timestamp) return "Activity unavailable";

  const difference = Math.max(0, Date.now() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) return "Updated just now";
  if (difference < hour) {
    const count = Math.floor(difference / minute);
    return `Updated ${count}m ago`;
  }

  if (difference < day) {
    const count = Math.floor(difference / hour);
    return `Updated ${count}h ago`;
  }

  if (difference < 7 * day) {
    const count = Math.floor(difference / day);
    return `Updated ${count}d ago`;
  }

  return `Updated ${new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(timestamp).getFullYear() !==
      new Date().getFullYear()
        ? "numeric"
        : undefined,
  })}`;
}

function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Something went wrong. Please try again."
  );
}

function getWorkspacePath(id) {
  if (!id) return "/workspace";
  return `/workspace?workspace=${encodeURIComponent(id)}`;
}

function normalizeWorkspaceResponse(response) {
  if (!response) return null;
  return response.data?.workspace ?? response.data?.data?.workspace ??
    response.workspace ?? response.data?.data ?? response.data ?? response;
}

/* ============================================================
   LOADING SKELETON
============================================================ */

function ProjectSkeleton() {
  return (
    <article className="premium-project-card premium-project-skeleton" aria-hidden="true">
      <div className="premium-project-top">
        <span className="premium-skeleton-block premium-skeleton-icon" />
        <span className="premium-skeleton-block premium-skeleton-pill" />
      </div>
      <span className="premium-skeleton-block premium-skeleton-title" />
      <span className="premium-skeleton-block premium-skeleton-line" />
      <span className="premium-skeleton-block premium-skeleton-line premium-skeleton-short" />
      <div className="premium-skeleton-meta">
        <span className="premium-skeleton-block" />
        <span className="premium-skeleton-block" />
      </div>
      <span className="premium-skeleton-block premium-skeleton-button" />
    </article>
  );
}

/* ============================================================
   SUMMARY METRIC
============================================================ */

function SummaryCard({ icon, label, value, tone = "violet" }) {
  return (
    <article className={`premium-summary-card premium-tone-${tone}`}>
      <div className="premium-summary-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="premium-summary-copy">
        <span>{label}</span>
        <strong>{Number(value || 0).toLocaleString()}</strong>
      </div>
      <div className="premium-summary-decoration" aria-hidden="true" />
    </article>
  );
}

/* ============================================================
   STATUS PILL
============================================================ */

function StatusPill({ status }) {
  const labels = {
    active: "Active",
    recent: "Recent",
    quiet: "Quiet",
  };

  return (
    <span className={`premium-status premium-status-${status}`}>
      <span className="premium-status-dot" aria-hidden="true" />
      {labels[status] ?? "Unknown"}
    </span>
  );
}

/* ============================================================
   PROJECT CARD
============================================================ */

function ProjectCard({ workspace, index, onOpen }) {
  const id = getId(workspace);
  const name = getName(workspace);
  const description = getDescription(workspace);
  const documents = getDocuments(workspace);
  const members = getMembers(workspace);
  const status = getStatus(workspace);
  const createdAt = getDateValue(workspace, "created");

  const initial = name.charAt(0).toUpperCase();
  const palette = ["violet", "blue", "mint", "amber"];
  const tone = palette[index % palette.length];

  return (
    <article
      className={`premium-project-card premium-project-${tone}`}
      data-project-id={id || undefined}
    >
      <button
        type="button"
        className="premium-project-card-open"
        onClick={() => onOpen(workspace)}
        disabled={!id}
        aria-label={`Open ${name}`}
      >
        <span className="premium-project-open-label">
          Open workspace <ArrowUpRight size={15} />
        </span>
      </button>

      <div className="premium-project-top">
        <div className={`premium-project-mark premium-mark-${tone}`} aria-hidden="true">
          <span>{initial}</span>
          <div className="premium-project-mark-glow" />
        </div>
        <StatusPill status={status} />
      </div>

      <div className="premium-project-title-row">
        <h2 title={name}>{name}</h2>
        <span className="premium-project-arrow" aria-hidden="true">
          <ArrowUpRight size={18} />
        </span>
      </div>

      <p className="premium-project-description">{description}</p>

      <div className="premium-project-stats">
        <div className="premium-project-stat">
          <span className="premium-stat-icon">
            <FileText size={15} />
          </span>
          <span>
            <strong>{documents.toLocaleString()}</strong>
            <small>{documents === 1 ? "document" : "documents"}</small>
          </span>
        </div>

        <div className="premium-project-stat">
          <span className="premium-stat-icon premium-stat-icon-blue">
            <Users size={15} />
          </span>
          <span>
            <strong>{members.toLocaleString()}</strong>
            <small>{members === 1 ? "member" : "members"}</small>
          </span>
        </div>
      </div>

      <div className="premium-project-divider" />

      <div className="premium-project-footer">
        <span className="premium-project-activity">
          <Clock3 size={14} aria-hidden="true" />
          {getRelativeActivity(workspace)}
        </span>
        {createdAt > 0 && (
          <span className="premium-project-created" title="Creation date">
            <CalendarDays size={13} aria-hidden="true" />
            {new Date(createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}
      </div>
    </article>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({ searching, onClear, onCreate }) {
  return (
    <section className="premium-project-empty">
      <div className="premium-empty-art" aria-hidden="true">
        <div className="premium-empty-art-circle premium-empty-art-circle-one" />
        <div className="premium-empty-art-circle premium-empty-art-circle-two" />
        <div className="premium-empty-art-icon">
          {searching ? <Search size={31} /> : <Layers3 size={34} />}
        </div>
        <Sparkles className="premium-empty-sparkle" size={21} />
      </div>

      <span className="premium-section-kicker">
        {searching ? "SEARCH RESULTS" : "YOUR WORKSPACE STARTS HERE"}
      </span>

      <h2>{searching ? "No matching projects" : "Make room for great work."}</h2>

      <p>
        {searching
          ? "Try another name or description, or clear your filters to see all your projects."
          : "Create a workspace to bring your documents, teammates, and ideas together in one organized place."}
      </p>

      <div className="premium-empty-actions">
        {searching ? (
          <Button variant="secondary" onClick={onClear}>
            <X size={16} /> Clear filters
          </Button>
        ) : (
          <Button variant="primary" onClick={onCreate}>
            <Plus size={17} /> Create a workspace
          </Button>
        )}
      </div>
    </section>
  );
}

/* ============================================================
   CREATE WORKSPACE MODAL
============================================================ */

function CreateWorkspaceModal({
  open,
  creating,
  error,
  onClose,
  onSubmit,
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  React.useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !creating) onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, creating, onClose]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    onSubmit({
      name: name.trim(),
      description: description.trim(),
    });
  };

  return (
    <div
      className="premium-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) onClose();
      }}
    >
      <section
        className="premium-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-create-title"
      >
        <div className="premium-modal-top">
          <div className="premium-modal-icon">
            <FolderKanban size={22} />
          </div>
          <button
            type="button"
            className="premium-modal-close"
            onClick={onClose}
            disabled={creating}
            aria-label="Close dialog"
          >
            <X size={19} />
          </button>
        </div>

        <span className="premium-section-kicker">NEW WORKSPACE</span>
        <h2 id="premium-create-title">Start something brilliant.</h2>
        <p className="premium-modal-description">
          Give your team a dedicated space to collaborate and create.
        </p>

        {error && (
          <div className="premium-inline-error" role="alert">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit}>
          <label className="premium-form-field">
            <span>Workspace name <b>*</b></span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Product launch"
              maxLength={MAX_NAME_LENGTH}
              required
              minLength={1}
              disabled={creating}
            />
            <small>{name.length}/{MAX_NAME_LENGTH}</small>
          </label>

          <label className="premium-form-field">
            <span>Description <em>Optional</em></span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What will your team work on here?"
              maxLength={MAX_DESCRIPTION_LENGTH}
              rows={3}
              disabled={creating}
            />
            <small>{description.length}/{MAX_DESCRIPTION_LENGTH}</small>
          </label>

          <div className="premium-modal-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={creating || !name.trim()}
            >
              {creating ? (
                <>
                  <LoaderCircle className="premium-spin" size={16} />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={16} />
                  Create workspace
                </>
              )}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

/* ============================================================
   PROJECTS PAGE
============================================================ */

export default function Projects() {
  const navigate = useNavigate();

  const {
    workspaces = [],
    loading = false,
    error = null,
    loadWorkspaces,
    createWorkspace,
  } = useWorkspace();

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(DEFAULT_SORT);
  const [filter, setFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const normalizedWorkspaces = useMemo(() => {
    if (!Array.isArray(workspaces)) return [];
    return workspaces.filter(
      (workspace) => workspace && typeof workspace === "object"
    );
  }, [workspaces]);

  const summary = useMemo(() => {
    const now = Date.now();

    return {
      projects: normalizedWorkspaces.length,
      documents: normalizedWorkspaces.reduce(
        (total, workspace) => total + getDocuments(workspace),
        0
      ),
      members: normalizedWorkspaces.reduce(
        (total, workspace) => total + getMembers(workspace),
        0
      ),
      active: normalizedWorkspaces.filter(
        (workspace) => getStatus(workspace, now) === "active"
      ).length,
    };
  }, [normalizedWorkspaces]);

  const projects = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();

    let result = normalizedWorkspaces.filter((workspace) => {
      const status = getStatus(workspace);

      if (filter !== "all" && status !== filter) return false;
      if (!search) return true;

      const owner = workspace.owner;
      const ownerName =
        typeof owner === "object"
          ? owner?.name ?? owner?.displayName ?? owner?.username
          : owner;

      const searchable = [
        getName(workspace),
        getDescription(workspace),
        ownerName,
        owner?.email,
        ...(Array.isArray(workspace.tags) ? workspace.tags : []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();

      return searchable.includes(search);
    });

    result = [...result].sort((first, second) => {
      switch (sort) {
        case "name":
          return getName(first).localeCompare(getName(second), undefined, {
            sensitivity: "base",
          });
        case "documents":
          return getDocuments(second) - getDocuments(first);
        case "members":
          return getMembers(second) - getMembers(first);
        case "created":
          return getDateValue(second, "created") - getDateValue(first, "created");
        case "updated":
        default:
          return getDateValue(second) - getDateValue(first);
      }
    });

    return result;
  }, [normalizedWorkspaces, query, sort, filter]);

  const handleOpen = useCallback(
    (workspace) => {
      const id = getId(workspace);

      if (!id) {
        setActionError("This workspace is missing its ID and cannot be opened.");
        return;
      }

      navigate(getWorkspacePath(id));
    },
    [navigate]
  );

  const handleRefresh = useCallback(async () => {
    if (refreshing || loading || typeof loadWorkspaces !== "function") return;

    setActionError("");
    setNotice("");
    setRefreshing(true);

    try {
      await loadWorkspaces();
      setNotice("Your workspaces are up to date.");
    } catch (refreshError) {
      setActionError(getErrorMessage(refreshError));
    } finally {
      setRefreshing(false);
    }
  }, [refreshing, loading, loadWorkspaces]);

  const handleCreate = useCallback(
    async (payload) => {
      if (creating || typeof createWorkspace !== "function") {
        setActionError("Workspace creation is not available right now.");
        return;
      }

      if (!payload.name || payload.name.length > MAX_NAME_LENGTH) {
        setActionError(`Workspace name must be between 1 and ${MAX_NAME_LENGTH} characters.`);
        return;
      }

      setCreating(true);
      setActionError("");
      setNotice("");

      try {
        const response = await createWorkspace({
          name: payload.name,
          description: payload.description,
        });

        const created = normalizeWorkspaceResponse(response);
        const id = getId(created);

        setModalOpen(false);

        if (typeof loadWorkspaces === "function") {
          try {
            await loadWorkspaces();
          } catch {
            // Creation succeeded; a refresh failure should not hide that success.
          }
        }

        if (id) {
          navigate(getWorkspacePath(id));
        } else {
          setNotice(`“${payload.name}” was created. Your project list will refresh shortly.`);
        }
      } catch (createError) {
        setActionError(getErrorMessage(createError));
      } finally {
        setCreating(false);
      }
    },
    [creating, createWorkspace, loadWorkspaces, navigate]
  );

  const clearFilters = useCallback(() => {
    setQuery("");
    setFilter("all");
    setSort(DEFAULT_SORT);
  }, []);

  const hasFilters = Boolean(query.trim()) || filter !== "all";
  const displayError = actionError || (error ? getErrorMessage(error) : "");

  return (
    <main className="page projects-page premium-projects-page" aria-labelledby="projects-title">
      <div className="premium-projects-ambient" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <header className="premium-projects-header">
        <div className="premium-heading-copy">
          <div className="premium-heading-eyebrow">
            <span className="premium-eyebrow-icon">
              <Layers3 size={14} />
            </span>
            <span>YOUR WORKSPACE</span>
            <span className="premium-eyebrow-divider" />
            <span className="premium-heading-subtle">SyncDoc projects</span>
          </div>

          <h1 id="projects-title">
            Make space for
            <span> great work.</span>
          </h1>

          <p>
            Your team’s documents, ideas, and momentum — all in one beautifully
            organized place.
          </p>

          <div className="premium-header-trust">
            <span><CheckCircle2 size={15} /> Built for collaboration</span>
            <span><Sparkles size={15} /> Made to stay organized</span>
          </div>
        </div>

        <div className="premium-header-actions">
          <Button
            variant="secondary"
            size="md"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            aria-label="Refresh workspaces"
          >
            <RefreshCw
              size={15}
              className={loading || refreshing ? "premium-spin" : ""}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setActionError("");
              setModalOpen(true);
            }}
            disabled={creating}
          >
            <Plus size={17} />
            New workspace
          </Button>
        </div>
      </header>

      {displayError && (
        <div className="premium-page-alert" role="alert">
          <AlertCircle size={17} />
          <span>{displayError}</span>
          <button
            type="button"
            onClick={() => setActionError("")}
            aria-label="Dismiss error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {notice && !displayError && (
        <div className="premium-page-notice" role="status">
          <CheckCircle2 size={17} />
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="premium-summary-grid" aria-label="Workspace overview">
        <SummaryCard
          icon={<FolderKanban size={20} />}
          value={summary.projects}
          label="Total workspaces"
          tone="violet"
        />
        <SummaryCard
          icon={<FileText size={20} />}
          value={summary.documents}
          label="Total documents"
          tone="blue"
        />
        <SummaryCard
          icon={<Users size={20} />}
          value={summary.members}
          label="Team members"
          tone="mint"
        />
        <SummaryCard
          icon={<CheckCircle2 size={20} />}
          value={summary.active}
          label="Active today"
          tone="amber"
        />
      </section>

      <section className="premium-projects-content" aria-label="Your projects">
        <div className="premium-section-heading">
          <div>
            <span className="premium-section-kicker">YOUR COLLECTION</span>
            <h2>All workspaces <span>{projects.length}</span></h2>
            <p>Pick up where your team left off.</p>
          </div>

          <div className="premium-view-label">
            <LayoutGrid size={16} />
            <span>Grid view</span>
          </div>
        </div>

        <Card className="premium-project-toolbar-card">
          <div className="premium-project-toolbar">
            <label className="premium-project-search">
              <Search size={18} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by workspace, description, or owner..."
                aria-label="Search workspaces"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
              <kbd>⌘ K</kbd>
            </label>

            <div className="premium-project-toolbar-controls">
              <label className="premium-select-control">
                <ListFilter size={15} aria-hidden="true" />
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  aria-label="Filter by activity"
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </label>

              <label className="premium-select-control">
                <ArrowDownAZ size={15} aria-hidden="true" />
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Sort workspaces"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </label>
            </div>
          </div>

          {(hasFilters || projects.length > 0) && (
            <div className="premium-toolbar-bottom">
              <span>
                {hasFilters ? (
                  <>
                    <strong>{projects.length}</strong> matching{" "}
                    {projects.length === 1 ? "workspace" : "workspaces"}
                  </>
                ) : (
                  <>
                    Showing <strong>{projects.length}</strong>{" "}
                    {projects.length === 1 ? "workspace" : "workspaces"}
                  </>
                )}
              </span>
              {hasFilters && (
                <button type="button" onClick={clearFilters}>
                  Clear filters <X size={13} />
                </button>
              )}
            </div>
          )}
        </Card>

        {loading && normalizedWorkspaces.length === 0 ? (
          <section className="premium-project-grid" aria-label="Loading workspaces" aria-busy="true">
            {Array.from({ length: 6 }, (_, index) => (
              <ProjectSkeleton key={`skeleton-${index}`} />
            ))}
          </section>
        ) : projects.length === 0 ? (
          <EmptyState
            searching={hasFilters}
            onClear={clearFilters}
            onCreate={() => {
              setActionError("");
              setModalOpen(true);
            }}
          />
        ) : (
          <section className="premium-project-grid" aria-label="Workspace list">
            {projects.map((workspace, index) => (
              <ProjectCard
                key={getId(workspace) || `workspace-${index}`}
                workspace={workspace}
                index={index}
                onOpen={handleOpen}
              />
            ))}
          </section>
        )}

        {!loading && normalizedWorkspaces.length > 0 && (
          <footer className="premium-projects-footer">
            <span>
              <span className="premium-footer-status-dot" />
              All changes are synced with your workspace
            </span>
            <span>
              {projects.length} of {normalizedWorkspaces.length}{" "}
              {normalizedWorkspaces.length === 1 ? "workspace" : "workspaces"}
            </span>
          </footer>
        )}
      </section>

      <CreateWorkspaceModal
        open={modalOpen}
        creating={creating}
        error={actionError}
        onClose={() => {
          if (!creating) {
            setModalOpen(false);
            setActionError("");
          }
        }}
        onSubmit={handleCreate}
      />
    </main>
  );
}
