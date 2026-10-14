import "./pages-premium.css";

import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  FolderKanban,
  Plus,
  Search,
  RefreshCw,
  Users,
  FileText,
  CheckCircle2,
  X,
  ArrowUpRight,
  Clock3,
  AlertCircle,
} from "lucide-react";

import Button from "../components/common/Button";
import Card from "../components/common/Card";
import useWorkspace from "../hooks/useWorkspace";

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_WORKSPACE_NAME =
  "Untitled workspace";

const DEFAULT_DESCRIPTION =
  "No workspace description yet.";

const DEFAULT_SORT = "updated";

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely extract workspace ID.
 */
function getId(workspace) {
  if (
    !workspace ||
    typeof workspace !== "object"
  ) {
    return "";
  }

  return String(
    workspace.id ||
      workspace._id ||
      workspace.workspaceId ||
      ""
  ).trim();
}

/**
 * Safely extract workspace name.
 */
function getName(workspace) {
  if (
    !workspace ||
    typeof workspace !== "object"
  ) {
    return DEFAULT_WORKSPACE_NAME;
  }

  return String(
    workspace.name ||
      workspace.title ||
      DEFAULT_WORKSPACE_NAME
  ).trim();
}

/**
 * Safely extract workspace description.
 */
function getDescription(workspace) {
  if (
    !workspace ||
    typeof workspace !== "object"
  ) {
    return DEFAULT_DESCRIPTION;
  }

  return String(
    workspace.description ||
      workspace.summary ||
      DEFAULT_DESCRIPTION
  ).trim();
}

/**
 * Safely calculate document count.
 */
function getDocuments(workspace) {
  if (
    !workspace ||
    typeof workspace !== "object"
  ) {
    return 0;
  }

  const count =
    workspace.documentCount ??
    workspace.documentsCount ??
    workspace.documents?.length ??
    workspace.documents ??
    0;

  const numericCount =
    Number(count);

  return Number.isFinite(
    numericCount
  )
    ? Math.max(
        numericCount,
        0
      )
    : 0;
}

/**
 * Safely calculate member count.
 */
function getMembers(workspace) {
  if (
    !workspace ||
    typeof workspace !== "object"
  ) {
    return 0;
  }

  const explicitCount =
    workspace.memberCount ??
    workspace.membersCount;

  if (
    explicitCount !== undefined &&
    explicitCount !== null
  ) {
    const count =
      Number(explicitCount);

    return Number.isFinite(count)
      ? Math.max(count, 0)
      : 0;
  }

  const members =
    Array.isArray(
      workspace.members
    )
      ? workspace.members.length
      : 0;

  const hasOwner =
    Boolean(workspace.owner);

  return (
    members +
    (hasOwner ? 1 : 0)
  );
}

/**
 * Safely convert API date.
 */
function getTimestamp(workspace) {
  if (
    !workspace ||
    typeof workspace !== "object"
  ) {
    return 0;
  }

  const value =
    workspace.updatedAt ||
    workspace.updated_at ||
    workspace.modifiedAt ||
    workspace.createdAt ||
    workspace.created_at;

  if (!value) {
    return 0;
  }

  const timestamp =
    new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

/**
 * Calculate workspace activity status.
 */
function getStatus(workspace) {
  const timestamp =
    getTimestamp(workspace);

  if (!timestamp) {
    return "Active";
  }

  const ageInDays =
    Math.max(
      0,
      (Date.now() - timestamp) /
        86400000
    );

  if (ageInDays < 1) {
    return "Active";
  }

  if (ageInDays < 7) {
    return "Recent";
  }

  return "Quiet";
}

/**
 * Human-readable last activity.
 */
function getActivityLabel(workspace) {
  const timestamp =
    getTimestamp(workspace);

  if (!timestamp) {
    return "No recent activity";
  }

  const diff =
    Math.max(
      0,
      Date.now() - timestamp
    );

  const minutes =
    Math.floor(
      diff / 60000
    );

  if (minutes < 1) {
    return "Updated just now";
  }

  if (minutes < 60) {
    return `Updated ${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `Updated ${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `Updated ${days}d ago`;
  }

  return `Updated ${Math.floor(
    days / 7
  )}w ago`;
}

/**
 * Extract readable error message.
 */
function getErrorMessage(error) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Unable to load your projects."
  );
}

/**
 * Build workspace URL.
 */
function getWorkspacePath(id) {
  if (!id) {
    return "/workspace";
  }

  return `/workspace?workspace=${encodeURIComponent(
    id
  )}`;
}

/* ============================================================
   LOADING SKELETON
============================================================ */

function ProjectSkeleton() {
  return (
    <article
      className="project-card project-card-skeleton"
      aria-hidden="true"
    >
      <div className="project-card-top">
        <span className="project-skeleton-icon" />
        <span className="project-skeleton-status" />
      </div>

      <span className="project-skeleton-title" />

      <span className="project-skeleton-line" />
      <span className="project-skeleton-line project-skeleton-line-short" />

      <div className="project-card-meta">
        <span className="project-skeleton-meta" />
        <span className="project-skeleton-meta" />
      </div>

      <span className="project-skeleton-button" />
    </article>
  );
}

/* ============================================================
   SUMMARY CARD
============================================================ */

function SummaryCard({
  icon,
  value,
  label,
  className = "",
}) {
  return (
    <div
      className={[
        "project-summary-card",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="project-summary-icon"
        aria-hidden="true"
      >
        {icon}
      </div>

      <div className="project-summary-content">
        <strong>
          {Number(
            value || 0
          ).toLocaleString()}
        </strong>

        <span>{label}</span>
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function ProjectsEmptyState({
  searching,
  onClear,
  onCreate,
}) {
  if (searching) {
    return (
      <Card className="projects-empty-state">
        <div
          className="projects-empty-icon"
          aria-hidden="true"
        >
          <Search size={30} />
        </div>

        <h2>
          No projects found
        </h2>

        <p>
          We couldn't find any projects
          matching your search.
        </p>

        <Button
          variant="secondary"
          onClick={onClear}
        >
          <X size={16} />
          Clear search
        </Button>
      </Card>
    );
  }

  return (
    <Card className="projects-empty-state">
      <div
        className="projects-empty-icon"
        aria-hidden="true"
      >
        <FolderKanban size={32} />
      </div>

      <span className="eyebrow">
        GET STARTED
      </span>

      <h2>
        Create your first project
      </h2>

      <p>
        Projects give your team a focused
        workspace for documents,
        collaborators and ongoing work.
      </p>

      <Button
        variant="primary"
        onClick={onCreate}
      >
        <Plus size={16} />
        Create project
      </Button>
    </Card>
  );
}

/* ============================================================
   PROJECT CARD
============================================================ */

function ProjectCard({
  workspace,
  onOpen,
}) {
  const id =
    getId(workspace);

  const name =
    getName(workspace);

  const description =
    getDescription(workspace);

  const documents =
    getDocuments(workspace);

  const members =
    getMembers(workspace);

  const status =
    getStatus(workspace);

  const activity =
    getActivityLabel(workspace);

  return (
    <article
      className="project-card"
      data-project-id={id || undefined}
    >
      <div className="project-card-top">
        <div
          className="project-icon"
          aria-hidden="true"
        >
          <FolderKanban
            size={19}
          />
        </div>

        <span
          className={[
            "project-status",
            `project-status-${status.toLowerCase()}`,
          ].join(" ")}
        >
          <span
            className="project-status-dot"
            aria-hidden="true"
          />

          {status}
        </span>
      </div>

      <div className="project-card-heading">
        <h2 title={name}>
          {name}
        </h2>

        <span
          className="project-card-arrow"
          aria-hidden="true"
        >
          <ArrowUpRight
            size={17}
          />
        </span>
      </div>

      <p className="project-card-description">
        {description}
      </p>

      <div className="project-card-meta">
        <span>
          <FileText
            size={14}
            aria-hidden="true"
          />

          {documents.toLocaleString()}{" "}
          {documents === 1
            ? "document"
            : "documents"}
        </span>

        <span>
          <Users
            size={14}
            aria-hidden="true"
          />

          {members.toLocaleString()}{" "}
          {members === 1
            ? "member"
            : "members"}
        </span>
      </div>

      <div className="project-card-footer">
        <span className="project-card-activity">
          <Clock3
            size={13}
            aria-hidden="true"
          />

          {activity}
        </span>

        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            onOpen(workspace)
          }
          disabled={!id}
          aria-label={`Open ${name}`}
        >
          Open workspace
          <ArrowUpRight
            size={14}
            aria-hidden="true"
          />
        </Button>
      </div>
    </article>
  );
}

/* ============================================================
   PROJECTS PAGE
============================================================ */

export default function Projects() {
  const navigate =
    useNavigate();

  const {
    workspaces = [],
    loading = false,
    error = null,
    loadWorkspaces,
    createWorkspace,
  } = useWorkspace();

  /* ==========================================================
     STATE
  ========================================================== */

  const [
    query,
    setQuery,
  ] = useState("");

  const [
    sort,
    setSort,
  ] = useState(DEFAULT_SORT);

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");

  /* ==========================================================
     NORMALIZE WORKSPACES
  ========================================================== */

  const normalizedWorkspaces =
    useMemo(() => {
      if (
        !Array.isArray(
          workspaces
        )
      ) {
        return [];
      }

      return workspaces.filter(
        (workspace) =>
          workspace &&
          typeof workspace ===
            "object"
      );
    }, [workspaces]);

  /* ==========================================================
     SUMMARY
  ========================================================== */

  const summary =
    useMemo(() => {
      const projects =
        normalizedWorkspaces.length;

      const documents =
        normalizedWorkspaces.reduce(
          (
            total,
            workspace
          ) =>
            total +
            getDocuments(
              workspace
            ),
          0
        );

      const members =
        normalizedWorkspaces.reduce(
          (
            total,
            workspace
          ) =>
            total +
            getMembers(
              workspace
            ),
          0
        );

      const active =
        normalizedWorkspaces.filter(
          (workspace) =>
            getStatus(
              workspace
            ) === "Active"
        ).length;

      return {
        projects,
        documents,
        members,
        active,
      };
    }, [
      normalizedWorkspaces,
    ]);

  /* ==========================================================
     FILTER + SORT
  ========================================================== */

  const projects =
    useMemo(() => {
      const search =
        query
          .trim()
          .toLowerCase();

      let result =
        normalizedWorkspaces;

      if (search) {
        result =
          normalizedWorkspaces.filter(
            (workspace) => {
              const searchableText =
                [
                  getName(
                    workspace
                  ),
                  getDescription(
                    workspace
                  ),
                  workspace.owner
                    ?.name,
                  workspace.owner
                    ?.email,
                ]
                  .filter(Boolean)
                  .join(" ")
                  .toLowerCase();

              return searchableText.includes(
                search
              );
            }
          );
      }

      return [...result].sort(
        (first, second) => {
          switch (sort) {
            case "name":
              return getName(
                first
              ).localeCompare(
                getName(
                  second
                ),
                undefined,
                {
                  sensitivity:
                    "base",
                }
              );

            case "documents":
              return (
                getDocuments(
                  second
                ) -
                getDocuments(
                  first
                )
              );

            case "members":
              return (
                getMembers(
                  second
                ) -
                getMembers(
                  first
                )
              );

            case "updated":
            default:
              return (
                getTimestamp(
                  second
                ) -
                getTimestamp(
                  first
                )
              );
          }
        }
      );
    }, [
      normalizedWorkspaces,
      query,
      sort,
    ]);

  /* ==========================================================
     CREATE PROJECT
  ========================================================== */

  const handleCreate =
    useCallback(
      async () => {
        if (
          creating ||
          typeof createWorkspace !==
            "function"
        ) {
          return;
        }

        setActionError("");

        const name =
          window.prompt(
            "Enter project name"
          );

        const trimmedName =
          name?.trim();

        if (!trimmedName) {
          return;
        }

        if (
          trimmedName.length >
          100
        ) {
          setActionError(
            "Project name must be 100 characters or fewer."
          );

          return;
        }

        setCreating(true);

        try {
          const created =
            await createWorkspace({
              name: trimmedName,
            });

          const id =
            getId(created);

          /*
           * Prefer opening the newly-created
           * project immediately.
           */
          if (id) {
            navigate(
              getWorkspacePath(
                id
              )
            );
          }

          /*
           * Refresh only after creation.
           * This keeps the project list accurate
           * when the user stays on this page.
           */
          if (
            typeof loadWorkspaces ===
            "function"
          ) {
            await loadWorkspaces();
          }
        } catch (createError) {
          console.error(
            "SyncDoc: create workspace failed:",
            createError
          );

          setActionError(
            getErrorMessage(
              createError
            )
          );
        } finally {
          setCreating(false);
        }
      },
      [
        creating,
        createWorkspace,
        loadWorkspaces,
        navigate,
      ]
    );

  /* ==========================================================
     OPEN PROJECT
  ========================================================== */

  const handleOpen =
    useCallback(
      (workspace) => {
        const id =
          getId(workspace);

        if (!id) {
          setActionError(
            "This project cannot be opened because its ID is missing."
          );

          return;
        }

        navigate(
          getWorkspacePath(id)
        );
      },
      [navigate]
    );

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(
      async () => {
        if (
          refreshing ||
          typeof loadWorkspaces !==
            "function"
        ) {
          return;
        }

        setActionError("");
        setRefreshing(true);

        try {
          await loadWorkspaces();
        } catch (refreshError) {
          console.error(
            "SyncDoc: refresh workspaces failed:",
            refreshError
          );

          setActionError(
            getErrorMessage(
              refreshError
            )
          );
        } finally {
          setRefreshing(false);
        }
      },
      [
        refreshing,
        loadWorkspaces,
      ]
    );

  /* ==========================================================
     CLEAR SEARCH
  ========================================================== */

  const handleClearSearch =
    useCallback(() => {
      setQuery("");
    }, []);

  const hasSearch =
    Boolean(
      query.trim()
    );

  const displayError =
    actionError ||
    (error
      ? getErrorMessage(error)
      : "");

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main
      className="page projects-page"
      aria-labelledby="projects-title"
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="page-heading projects-header">
        <div className="page-heading-content">
          <div className="eyebrow-row">
            <span className="eyebrow">
              WORKSPACES
            </span>

            {summary.active >
              0 && (
              <span className="projects-live-badge">
                <span
                  className="status-dot"
                  aria-hidden="true"
                />

                {summary.active}{" "}
                active today
              </span>
            )}
          </div>

          <h1 id="projects-title">
            Projects
          </h1>

          <p>
            Organize documents,
            collaborators and ongoing
            work in focused SyncDoc
            workspaces.
          </p>
        </div>

        <div className="page-heading-actions">
          <Button
            variant="secondary"
            size="md"
            onClick={
              handleRefresh
            }
            disabled={
              loading ||
              refreshing
            }
            aria-label="Refresh projects"
          >
            <RefreshCw
              size={15}
              className={
                loading ||
                refreshing
                  ? "is-spinning"
                  : ""
              }
              aria-hidden="true"
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={
              handleCreate
            }
            disabled={creating}
          >
            <Plus
              size={16}
              aria-hidden="true"
            />

            {creating
              ? "Creating..."
              : "New project"}
          </Button>
        </div>
      </header>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {displayError && (
        <div
          className="page-alert"
          role="alert"
        >
          <AlertCircle
            size={17}
            aria-hidden="true"
          />

          <span>
            {displayError}
          </span>

          <button
            type="button"
            className="page-alert-dismiss"
            onClick={() =>
              setActionError("")
            }
            aria-label="Dismiss error"
          >
            <X
              size={16}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <section
        className="project-summary"
        aria-label="Project overview"
      >
        <SummaryCard
          icon={
            <FolderKanban
              size={19}
            />
          }
          value={
            summary.projects
          }
          label="Projects"
        />

        <SummaryCard
          icon={
            <FileText
              size={19}
            />
          }
          value={
            summary.documents
          }
          label="Documents"
        />

        <SummaryCard
          icon={
            <Users
              size={19}
            />
          }
          value={
            summary.members
          }
          label="Members"
        />

        <SummaryCard
          icon={
            <CheckCircle2
              size={19}
            />
          }
          value={
            summary.active
          }
          label="Active today"
        />
      </section>

      {/* ======================================================
          TOOLBAR
      ====================================================== */}

      <Card className="projects-toolbar-card">
        <div className="projects-toolbar">
          <div className="project-search">
            <Search
              size={16}
              aria-hidden="true"
            />

            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              placeholder="Search projects..."
              aria-label="Search projects"
            />

            {hasSearch && (
              <button
                type="button"
                className="project-search-clear"
                onClick={
                  handleClearSearch
                }
                aria-label="Clear project search"
              >
                <X
                  size={15}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>

          <div className="project-toolbar-right">
            {hasSearch && (
              <span className="project-result-count">
                {projects.length}{" "}
                {projects.length ===
                1
                  ? "result"
                  : "results"}
              </span>
            )}

            <label className="project-control">
              <span>
                Sort
              </span>

              <select
                value={sort}
                onChange={(
                  event
                ) =>
                  setSort(
                    event.target
                      .value
                  )
                }
                aria-label="Sort projects"
              >
                <option value="updated">
                  Recently updated
                </option>

                <option value="name">
                  Name
                </option>

                <option value="documents">
                  Documents
                </option>

                <option value="members">
                  Members
                </option>
              </select>
            </label>
          </div>
        </div>
      </Card>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      {loading &&
      !normalizedWorkspaces.length ? (
        <section
          className="project-grid"
          aria-label="Loading projects"
          aria-busy="true"
        >
          <ProjectSkeleton />
          <ProjectSkeleton />
          <ProjectSkeleton />
          <ProjectSkeleton />
        </section>
      ) : !projects.length ? (
        <ProjectsEmptyState
          searching={hasSearch}
          onClear={
            handleClearSearch
          }
          onCreate={
            handleCreate
          }
        />
      ) : (
        <section
          className="project-grid"
          aria-label="Projects"
        >
          {projects.map(
            (workspace, index) => {
              const id =
                getId(
                  workspace
                );

              /*
               * API records should always have
               * an ID. The index fallback prevents
               * React warnings if malformed data
               * reaches the UI.
               */
              const key =
                id ||
                `workspace-${index}`;

              return (
                <ProjectCard
                  key={key}
                  workspace={
                    workspace
                  }
                  onOpen={
                    handleOpen
                  }
                />
              );
            }
          )}
        </section>
      )}

      {/* ======================================================
          FOOTER STATUS
      ====================================================== */}

      {!loading &&
        normalizedWorkspaces.length >
          0 && (
          <div className="projects-footer-summary">
            <span>
              Showing{" "}
              <strong>
                {projects.length}
              </strong>{" "}
              of{" "}
              <strong>
                {
                  normalizedWorkspaces.length
                }
              </strong>{" "}
              projects
            </span>

            {hasSearch && (
              <button
                type="button"
                className="projects-clear-filter"
                onClick={
                  handleClearSearch
                }
              >
                Clear search
              </button>
            )}
          </div>
        )}
    </main>
  );
}

