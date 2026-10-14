import "./pages-premium.css";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Check,
  ChevronRight,
  FolderKanban,
  Mail,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
  FileText,
  UserPlus,
  Sparkles,
} from "lucide-react";

import Card from "../components/common/Card";
import Button from "../components/common/Button";
import WorkspaceMembers from "../components/workspace/WorkspaceMembers";
import WorkspaceCard from "../components/workspace/WorkspaceCard";
import { useWorkspace } from "../context/WorkspaceContext";

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_WORKSPACE_NAME_LENGTH = 80;
const MAX_INVITE_EMAIL_LENGTH = 160;

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ============================================================
   HELPERS
============================================================ */

function getWorkspaceId(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return "";
  }

  return String(
    workspace.id ||
      workspace._id ||
      workspace.workspaceId ||
      ""
  );
}

function getWorkspaceName(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return "My Workspace";
  }

  return (
    workspace.name ||
    workspace.title ||
    workspace.workspaceName ||
    "My Workspace"
  );
}

function getWorkspaceDescription(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return "";
  }

  return (
    workspace.description ||
    workspace.summary ||
    ""
  );
}

function getWorkspaceMembers(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return [];
  }

  if (Array.isArray(workspace.members)) {
    return workspace.members;
  }

  if (Array.isArray(workspace.collaborators)) {
    return workspace.collaborators;
  }

  return [];
}

function getMemberCount(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return 0;
  }

  if (
    typeof workspace.memberCount === "number"
  ) {
    return workspace.memberCount;
  }

  if (Array.isArray(workspace.members)) {
    return workspace.members.length;
  }

  if (
    Array.isArray(workspace.collaborators)
  ) {
    return workspace.collaborators.length;
  }

  return 0;
}

function getDocumentCount(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return 0;
  }

  if (
    typeof workspace.documentCount === "number"
  ) {
    return workspace.documentCount;
  }

  if (typeof workspace.documents === "number") {
    return workspace.documents;
  }

  if (Array.isArray(workspace.documents)) {
    return workspace.documents.length;
  }

  return 0;
}

function getWorkspaceUpdatedAt(workspace) {
  return (
    workspace?.updatedAt ||
    workspace?.lastActivityAt ||
    workspace?.createdAt ||
    null
  );
}

function getWorkspaceStatus(workspace) {
  const updatedAt =
    getWorkspaceUpdatedAt(workspace);

  if (!updatedAt) {
    return {
      label: "Active",
      className: "active",
    };
  }

  const timestamp =
    new Date(updatedAt).getTime();

  if (!Number.isFinite(timestamp)) {
    return {
      label: "Active",
      className: "active",
    };
  }

  const days =
    (Date.now() - timestamp) / 86400000;

  if (days < 1) {
    return {
      label: "Active",
      className: "active",
    };
  }

  if (days < 7) {
    return {
      label: "Recent",
      className: "recent",
    };
  }

  return {
    label: "Quiet",
    className: "quiet",
  };
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function WorkspaceStat({
  icon,
  value,
  label,
  accent = false,
}) {
  return (
    <div
      className={`stat-card ${
        accent
          ? "workspace-active-stat"
          : ""
      }`}
    >
      <div className="stat-top">
        <span
          className="stat-icon"
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <strong>{value}</strong>

      <span>{label}</span>
    </div>
  );
}

/* ============================================================
   WORKSPACE PAGE
============================================================ */

export default function Workspace() {
  const {
    workspaces = [],
    activeWorkspace,
    currentWorkspace,
    loading,
    loadWorkspaces,
    selectWorkspace,
    setWorkspace,
    createWorkspace,
  } = useWorkspace();

  /* ==========================================================
     UI STATE
  ========================================================== */

  const [searchQuery, setSearchQuery] =
    useState("");

  const [inviteOpen, setInviteOpen] =
    useState(false);

  const [createOpen, setCreateOpen] =
    useState(false);

  const [workspaceName, setWorkspaceName] =
    useState("");

  const [inviteEmail, setInviteEmail] =
    useState("");

  const [actionLoading, setActionLoading] =
    useState(false);

  const [inviteLoading, setInviteLoading] =
    useState(false);

  const [actionError, setActionError] =
    useState("");

  const [successMessage, setSuccessMessage] =
    useState("");

  /* ==========================================================
     NORMALIZE WORKSPACES
  ========================================================== */

  const safeWorkspaces = useMemo(() => {
    if (!Array.isArray(workspaces)) {
      return [];
    }

    return workspaces.filter(
      (workspace) =>
        workspace &&
        typeof workspace === "object"
    );
  }, [workspaces]);

  /* ==========================================================
     SELECTED WORKSPACE
  ========================================================== */

  const selectedWorkspace = useMemo(() => {
    if (activeWorkspace) {
      return activeWorkspace;
    }

    if (currentWorkspace) {
      return currentWorkspace;
    }

    return safeWorkspaces[0] || null;
  }, [
    activeWorkspace,
    currentWorkspace,
    safeWorkspaces,
  ]);

  const selectedWorkspaceId =
    getWorkspaceId(selectedWorkspace);

  /* ==========================================================
     FILTERED WORKSPACES
  ========================================================== */

  const filteredWorkspaces = useMemo(() => {
    const query =
      searchQuery.trim().toLowerCase();

    if (!query) {
      return safeWorkspaces;
    }

    return safeWorkspaces.filter(
      (workspace) => {
        const name =
          getWorkspaceName(
            workspace
          ).toLowerCase();

        const description =
          getWorkspaceDescription(
            workspace
          ).toLowerCase();

        return (
          name.includes(query) ||
          description.includes(query)
        );
      }
    );
  }, [
    safeWorkspaces,
    searchQuery,
  ]);

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const workspaceStats = useMemo(() => {
    const members =
      safeWorkspaces.reduce(
        (total, workspace) =>
          total +
          getMemberCount(workspace),
        0
      );

    const documents =
      safeWorkspaces.reduce(
        (total, workspace) =>
          total +
          getDocumentCount(workspace),
        0
      );

    const active =
      safeWorkspaces.filter(
        (workspace) =>
          getWorkspaceStatus(
            workspace
          ).className === "active"
      ).length;

    return {
      workspaces: safeWorkspaces.length,
      members,
      documents,
      active,
    };
  }, [safeWorkspaces]);

  /* ==========================================================
     SELECT WORKSPACE
  ========================================================== */

  const handleSelectWorkspace =
    useCallback(
      (workspace) => {
        if (!workspace) {
          return;
        }

        setActionError("");
        setSuccessMessage("");

        if (
          typeof selectWorkspace ===
          "function"
        ) {
          selectWorkspace(workspace);
          return;
        }

        if (
          typeof setWorkspace ===
          "function"
        ) {
          setWorkspace(workspace);
        }
      },
      [
        selectWorkspace,
        setWorkspace,
      ]
    );

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(async () => {
      if (
        loading ||
        typeof loadWorkspaces !==
          "function"
      ) {
        return;
      }

      setActionError("");
      setSuccessMessage("");

      try {
        await loadWorkspaces();

        setSuccessMessage(
          "Workspaces refreshed successfully."
        );
      } catch (error) {
        console.error(
          "SyncDoc: workspace refresh failed:",
          error
        );

        setActionError(
          getErrorMessage(
            error,
            "Unable to refresh workspaces."
          )
        );
      }
    }, [
      loading,
      loadWorkspaces,
    ]);

  /* ==========================================================
     OPEN CREATE MODAL
  ========================================================== */

  const openCreateModal =
    useCallback(() => {
      setWorkspaceName("");
      setActionError("");
      setSuccessMessage("");
      setCreateOpen(true);
    }, []);

  /* ==========================================================
     CLOSE CREATE MODAL
  ========================================================== */

  const closeCreateModal =
    useCallback(() => {
      if (actionLoading) {
        return;
      }

      setCreateOpen(false);
      setWorkspaceName("");
      setActionError("");
    }, [actionLoading]);

  /* ==========================================================
     CREATE WORKSPACE
  ========================================================== */

  const handleCreateWorkspace =
    useCallback(
      async (event) => {
        event.preventDefault();

        const name =
          workspaceName.trim();

        if (!name) {
          setActionError(
            "Please enter a workspace name."
          );
          return;
        }

        if (
          name.length <
          2
        ) {
          setActionError(
            "Workspace name must contain at least 2 characters."
          );
          return;
        }

        if (
          typeof createWorkspace !==
          "function"
        ) {
          setActionError(
            "Workspace creation is not available."
          );
          return;
        }

        setActionLoading(true);
        setActionError("");
        setSuccessMessage("");

        try {
          const created =
            await createWorkspace({
              name,
            });

          setWorkspaceName("");
          setCreateOpen(false);

          setSuccessMessage(
            `"${name}" workspace created successfully.`
          );

          /*
           * If the context returns the newly created
           * workspace, immediately make it active.
           */

          if (created) {
            handleSelectWorkspace(
              created
            );
          }

          if (
            typeof loadWorkspaces ===
            "function"
          ) {
            await loadWorkspaces();
          }
        } catch (error) {
          console.error(
            "SyncDoc: workspace creation failed:",
            error
          );

          setActionError(
            getErrorMessage(
              error,
              "Unable to create workspace."
            )
          );
        } finally {
          setActionLoading(false);
        }
      },
      [
        workspaceName,
        createWorkspace,
        loadWorkspaces,
        handleSelectWorkspace,
      ]
    );

  /* ==========================================================
     OPEN INVITE
  ========================================================== */

  const handleOpenInvite =
    useCallback(() => {
      if (!selectedWorkspace) {
        setActionError(
          "Please select a workspace first."
        );
        return;
      }

      setInviteEmail("");
      setActionError("");
      setSuccessMessage("");
      setInviteOpen(true);
    }, [selectedWorkspace]);

  /* ==========================================================
     CLOSE INVITE
  ========================================================== */

  const closeInviteModal =
    useCallback(() => {
      if (inviteLoading) {
        return;
      }

      setInviteOpen(false);
      setInviteEmail("");
      setActionError("");
    }, [inviteLoading]);

  /* ==========================================================
     INVITE MEMBER
  ========================================================== */

  const handleInviteMember =
    useCallback(
      async (event) => {
        event.preventDefault();

        const email =
          inviteEmail
            .trim()
            .toLowerCase();

        if (!email) {
          setActionError(
            "Please enter an email address."
          );
          return;
        }

        if (
          !EMAIL_PATTERN.test(email)
        ) {
          setActionError(
            "Please enter a valid email address."
          );
          return;
        }

        if (!selectedWorkspaceId) {
          setActionError(
            "Please select a workspace first."
          );
          return;
        }

        /*
         * Connect your invitation API here.
         *
         * Example:
         *
         * await inviteMember({
         *   workspaceId: selectedWorkspaceId,
         *   email,
         * });
         */

        setInviteLoading(true);
        setActionError("");
        setSuccessMessage("");

        try {
          await new Promise(
            (resolve) =>
              setTimeout(
                resolve,
                500
              )
          );

          setInviteEmail("");
          setInviteOpen(false);

          setSuccessMessage(
            `Invitation prepared for ${email}.`
          );
        } catch (error) {
          console.error(
            "SyncDoc: invitation failed:",
            error
          );

          setActionError(
            getErrorMessage(
              error,
              "Unable to send invitation."
            )
          );
        } finally {
          setInviteLoading(false);
        }
      },
      [
        inviteEmail,
        selectedWorkspaceId,
      ]
    );

  /* ==========================================================
     ESCAPE KEY
  ========================================================== */

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      if (createOpen) {
        closeCreateModal();
      }

      if (inviteOpen) {
        closeInviteModal();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    createOpen,
    inviteOpen,
    closeCreateModal,
    closeInviteModal,
  ]);

  /* ==========================================================
     INITIAL LOADING
  ========================================================== */

  if (
    loading &&
    !safeWorkspaces.length
  ) {
    return (
      <div className="page workspace-page">
        <header className="page-heading">
          <div>
            <span className="eyebrow">
              TEAM
            </span>

            <h1>Workspace</h1>

            <p>
              Manage your teams,
              documents and
              collaborators.
            </p>
          </div>
        </header>

        <div className="workspace-loading">
          <div className="workspace-loading-card" />
          <div className="workspace-loading-card" />
        </div>
      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="page workspace-page">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <header className="page-heading workspace-page-heading">
        <div>
          <span className="eyebrow">
            TEAM
          </span>

          <h1>Workspace</h1>

          <p>
            Manage your teams,
            documents and
            collaborators from
            one place.
          </p>
        </div>

        <div className="workspace-heading-actions">
          <Button
            variant="ghost"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "is-spinning"
                  : ""
              }
            />

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </Button>

          <Button
            variant="primary"
            onClick={
              openCreateModal
            }
            disabled={
              actionLoading
            }
          >
            <Plus size={17} />

            New workspace
          </Button>
        </div>
      </header>

      {/* ======================================================
          FEEDBACK
      ====================================================== */}

      {(actionError ||
        successMessage) && (
        <div
          className={
            actionError
              ? "workspace-alert workspace-alert-error"
              : "workspace-alert workspace-alert-success"
          }
          role={
            actionError
              ? "alert"
              : "status"
          }
          aria-live="polite"
        >
          <span
            className="workspace-alert-icon"
            aria-hidden="true"
          >
            {actionError ? (
              <X size={16} />
            ) : (
              <Check size={16} />
            )}
          </span>

          <div>
            <strong>
              {actionError
                ? "Workspace action failed"
                : "Success"}
            </strong>

            <p>
              {actionError ||
                successMessage}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setActionError("");
              setSuccessMessage("");
            }}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ======================================================
          STATS
      ====================================================== */}

      <section
        className="stats-grid workspace-stats"
        aria-label="Workspace overview"
      >
        <WorkspaceStat
          icon={
            <FolderKanban size={18} />
          }
          value={workspaceStats.workspaces.toLocaleString()}
          label={
            workspaceStats.workspaces ===
            1
              ? "Workspace"
              : "Workspaces"
          }
        />

        <WorkspaceStat
          icon={
            <Users size={18} />
          }
          value={workspaceStats.members.toLocaleString()}
          label="Total members"
        />

        <WorkspaceStat
          icon={
            <FileText size={18} />
          }
          value={workspaceStats.documents.toLocaleString()}
          label="Total documents"
        />

        <WorkspaceStat
          icon={
            <Check size={18} />
          }
          value={workspaceStats.active.toLocaleString()}
          label="Active today"
          accent
        />
      </section>

      {/* ======================================================
          MAIN LAYOUT
      ====================================================== */}

      <div className="workspace-layout">

        {/* ====================================================
            WORKSPACE LIST
        ==================================================== */}

        <Card
          className="workspace-list-card"
          title="Your workspaces"
          action={
            <span className="workspace-count">
              {filteredWorkspaces.length}
            </span>
          }
        >
          <div className="workspace-list-toolbar">
            <div className="project-search workspace-search">
              <Search
                size={16}
                aria-hidden="true"
              />

              <input
                type="search"
                value={searchQuery}
                onChange={(event) =>
                  setSearchQuery(
                    event.target.value
                  )
                }
                placeholder="Search workspaces..."
                aria-label="Search workspaces"
              />

              {searchQuery && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() =>
                    setSearchQuery("")
                  }
                  aria-label="Clear workspace search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <span className="workspace-list-result">
              {filteredWorkspaces.length ===
              safeWorkspaces.length
                ? `${safeWorkspaces.length} total`
                : `${filteredWorkspaces.length} of ${safeWorkspaces.length}`}
            </span>
          </div>

          {filteredWorkspaces.length >
          0 ? (
            <div className="workspace-card-list">
              {filteredWorkspaces.map(
                (workspace) => {
                  const id =
                    getWorkspaceId(
                      workspace
                    );

                  const name =
                    getWorkspaceName(
                      workspace
                    );

                  const isActive =
                    id ===
                    selectedWorkspaceId;

                  const status =
                    getWorkspaceStatus(
                      workspace
                    );

                  return (
                    <div
                      className={
                        isActive
                          ? "workspace-card-wrapper active"
                          : "workspace-card-wrapper"
                      }
                      key={
                        id ||
                        name
                      }
                    >
                      <WorkspaceCard
                        workspace={
                          workspace
                        }
                        onOpen={
                          handleSelectWorkspace
                        }
                      />

                      {isActive && (
                        <span className="workspace-active-badge">
                          <Check
                            size={13}
                          />
                          Active
                        </span>
                      )}

                      {!isActive && (
                        <span
                          className={`workspace-status-dot workspace-status-${status.className}`}
                          title={
                            status.label
                          }
                          aria-label={`Workspace status: ${status.label}`}
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="workspace-empty">
              <div
                className="workspace-empty-icon"
                aria-hidden="true"
              >
                {searchQuery ? (
                  <Search size={28} />
                ) : (
                  <FolderKanban
                    size={28}
                  />
                )}
              </div>

              <h3>
                {searchQuery
                  ? "No matching workspaces"
                  : "No workspaces yet"}
              </h3>

              <p>
                {searchQuery
                  ? "Try a different search term."
                  : "Create your first workspace to start collaborating."}
              </p>

              {searchQuery ? (
                <Button
                  variant="ghost"
                  onClick={() =>
                    setSearchQuery(
                      ""
                    )
                  }
                >
                  Clear search
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={
                    openCreateModal
                  }
                >
                  <Plus
                    size={16}
                  />
                  Create workspace
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* ====================================================
            MEMBERS
        ==================================================== */}

        <Card
          className="workspace-members-card"
          title="Members"
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={
                handleOpenInvite
              }
              disabled={
                !selectedWorkspace
              }
            >
              <UserPlus
                size={15}
              />
              Invite
            </Button>
          }
        >
          {selectedWorkspace ? (
            <>
              <div className="workspace-selected-header">
                <div>
                  <span className="eyebrow">
                    ACTIVE WORKSPACE
                  </span>

                  <h3>
                    {getWorkspaceName(
                      selectedWorkspace
                    )}
                  </h3>

                  {getWorkspaceDescription(
                    selectedWorkspace
                  ) && (
                    <p>
                      {getWorkspaceDescription(
                        selectedWorkspace
                      )}
                    </p>
                  )}
                </div>

                <span className="workspace-member-count">
                  <Users
                    size={14}
                  />

                  {getMemberCount(
                    selectedWorkspace
                  )}{" "}
                  {getMemberCount(
                    selectedWorkspace
                  ) === 1
                    ? "member"
                    : "members"}
                </span>
              </div>

              <div className="workspace-member-summary">
                <div>
                  <ShieldCheck
                    size={16}
                  />

                  <span>
                    Collaboration
                    enabled
                  </span>
                </div>

                <span>
                  {getDocumentCount(
                    selectedWorkspace
                  )}{" "}
                  documents
                </span>
              </div>

              <WorkspaceMembers
                members={getWorkspaceMembers(
                  selectedWorkspace
                )}
                canManage={false}
              />
            </>
          ) : (
            <div className="workspace-members-empty">
              <div
                className="workspace-empty-icon"
                aria-hidden="true"
              >
                <Users size={28} />
              </div>

              <h3>
                Select a workspace
              </h3>

              <p>
                Choose a workspace to
                view its
                collaborators.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* ======================================================
          CREATE WORKSPACE MODAL
      ====================================================== */}

      {createOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <div
            className="modal workspace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-workspace-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  NEW WORKSPACE
                </span>

                <h2 id="create-workspace-title">
                  Create workspace
                </h2>

                <p>
                  Create a dedicated
                  space for your
                  team, documents and
                  collaboration.
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeCreateModal
                }
                disabled={
                  actionLoading
                }
                aria-label="Close create workspace dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="workspace-form"
              onSubmit={
                handleCreateWorkspace
              }
            >
              <label>
                <span>
                  Workspace name
                </span>

                <input
                  type="text"
                  value={
                    workspaceName
                  }
                  onChange={(
                    event
                  ) => {
                    setWorkspaceName(
                      event.target
                        .value
                    );
                    setActionError(
                      ""
                    );
                  }}
                  placeholder="e.g. Product Team"
                  maxLength={
                    MAX_WORKSPACE_NAME_LENGTH
                  }
                  autoFocus
                  autoComplete="off"
                  disabled={
                    actionLoading
                  }
                  required
                />

                <small>
                  {workspaceName.length}/
                  {
                    MAX_WORKSPACE_NAME_LENGTH
                  }{" "}
                  characters
                </small>
              </label>

              <div className="workspace-form-tip">
                <Sparkles
                  size={16}
                />

                <span>
                  Use a clear name that
                  your team will
                  recognize easily.
                </span>
              </div>

              <div className="modal-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={
                    closeCreateModal
                  }
                  disabled={
                    actionLoading
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  loading={
                    actionLoading
                  }
                  disabled={
                    actionLoading ||
                    !workspaceName.trim()
                  }
                >
                  {actionLoading
                    ? "Creating..."
                    : "Create workspace"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================
          INVITE MEMBER MODAL
      ====================================================== */}

      {inviteOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeInviteModal();
            }
          }}
        >
          <div
            className="modal workspace-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invite-member-title"
          >
            <div className="modal-header">
              <div>
                <span className="eyebrow">
                  COLLABORATE
                </span>

                <h2 id="invite-member-title">
                  Invite members
                </h2>

                <p>
                  Invite teammates to
                  collaborate in{" "}
                  <strong>
                    {getWorkspaceName(
                      selectedWorkspace
                    )}
                  </strong>
                  .
                </p>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={
                  closeInviteModal
                }
                disabled={
                  inviteLoading
                }
                aria-label="Close invite dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="workspace-form"
              onSubmit={
                handleInviteMember
              }
            >
              <label>
                <span>
                  Member email
                </span>

                <div className="workspace-input-with-icon">
                  <Mail
                    size={16}
                    aria-hidden="true"
                  />

                  <input
                    type="email"
                    value={
                      inviteEmail
                    }
                    onChange={(
                      event
                    ) => {
                      setInviteEmail(
                        event.target
                          .value
                      );
                      setActionError(
                        ""
                      );
                    }}
                    placeholder="teammate@example.com"
                    maxLength={
                      MAX_INVITE_EMAIL_LENGTH
                    }
                    autoFocus
                    autoComplete="email"
                    disabled={
                      inviteLoading
                    }
                    required
                  />
                </div>

                <small>
                  They will receive an
                  invitation to join
                  this workspace.
                </small>
              </label>

              <div className="workspace-invite-info">
                <Users
                  size={18}
                />

                <div>
                  <strong>
                    Workspace
                  </strong>

                  <span>
                    {getWorkspaceName(
                      selectedWorkspace
                    )}
                  </span>
                </div>
              </div>

              <div className="modal-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={
                    closeInviteModal
                  }
                  disabled={
                    inviteLoading
                  }
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  loading={
                    inviteLoading
                  }
                  disabled={
                    inviteLoading ||
                    !inviteEmail.trim()
                  }
                >
                  {inviteLoading
                    ? "Sending..."
                    : "Send invitation"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}