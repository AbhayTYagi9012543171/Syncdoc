import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import workspaceService from "../services/workspaceService";
import { useAuth } from "./AuthContext";

/* ============================================================
   SYNCDOC — WORKSPACE CONTEXT
   ============================================================ */

const WorkspaceContext = createContext(null);

/* ============================================================
   CONSTANTS
   ============================================================ */

const TOKEN_KEY = "syncdoc_token";
const ACTIVE_WORKSPACE_KEY = "syncdoc_active_workspace";

/* ============================================================
   HELPERS
   ============================================================ */

/**
 * Safely convert a workspace ID into a string.
 */
function getWorkspaceId(workspace) {
  if (!workspace || typeof workspace !== "object") {
    return "";
  }

  const id =
    workspace.id ||
    workspace._id ||
    workspace.workspaceId ||
    "";

  return id ? String(id) : "";
}

/**
 * Safely get a workspace name.
 */
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

/**
 * Check whether an object is a valid workspace.
 */
function isValidWorkspace(workspace) {
  return (
    workspace &&
    typeof workspace === "object" &&
    getWorkspaceId(workspace)
  );
}

/**
 * Normalize workspace arrays.
 *
 * Removes invalid entries and duplicate IDs.
 */
function normalizeWorkspaces(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set();

  return value.filter((workspace) => {
    if (!isValidWorkspace(workspace)) {
      return false;
    }

    const id = getWorkspaceId(workspace);

    if (seen.has(id)) {
      return false;
    }

    seen.add(id);

    return true;
  });
}

/**
 * Extract workspace list from different backend
 * response structures.
 *
 * Supports:
 *
 * {
 *   workspaces: []
 * }
 *
 * {
 *   data: {
 *     workspaces: []
 *   }
 * }
 *
 * {
 *   data: []
 * }
 */
function extractWorkspaceList(response) {
  if (!response) {
    return [];
  }

  const candidates = [
    response?.workspaces,
    response?.data?.workspaces,
    response?.data?.data?.workspaces,
    response?.data?.data,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return normalizeWorkspaces(candidate);
    }
  }

  return [];
}

/**
 * Extract a single workspace from a backend response.
 */
function extractWorkspace(response) {
  if (!response) {
    return null;
  }

  const candidates = [
    response?.workspace,
    response?.data?.workspace,
    response?.data?.data?.workspace,
    response?.data?.data,
    response?.data,
  ];

  for (const candidate of candidates) {
    if (isValidWorkspace(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Safely read the currently persisted workspace ID.
 */
function getStoredWorkspaceId() {
  try {
    return (
      localStorage.getItem(
        ACTIVE_WORKSPACE_KEY
      ) || ""
    );
  } catch (error) {
    console.warn(
      "SyncDoc: unable to read active workspace:",
      error
    );

    return "";
  }
}

/**
 * Persist the active workspace ID.
 */
function saveWorkspaceId(workspaceId) {
  try {
    if (workspaceId) {
      localStorage.setItem(
        ACTIVE_WORKSPACE_KEY,
        String(workspaceId)
      );
    } else {
      localStorage.removeItem(
        ACTIVE_WORKSPACE_KEY
      );
    }
  } catch (error) {
    console.warn(
      "SyncDoc: unable to save active workspace:",
      error
    );
  }
}

/**
 * Clear the active workspace.
 */
function clearStoredWorkspace() {
  try {
    localStorage.removeItem(
      ACTIVE_WORKSPACE_KEY
    );
  } catch (error) {
    console.warn(
      "SyncDoc: unable to clear active workspace:",
      error
    );
  }
}

/* ============================================================
   PROVIDER
   ============================================================ */

export function WorkspaceProvider({
  children,
}) {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  /* ==========================================================
     STATE
  ========================================================== */

  const [
    workspaces,
    setWorkspaces,
  ] = useState([]);

  const [
    activeWorkspace,
    setActiveWorkspaceState,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const isMountedRef = useRef(true);

  const requestIdRef = useRef(0);

  /* ==========================================================
     MOUNT / UNMOUNT
  ========================================================== */

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /* ==========================================================
     SELECT WORKSPACE
  ========================================================== */

  const selectWorkspace = useCallback(
    (workspace) => {
      if (!isValidWorkspace(workspace)) {
        return null;
      }

      const workspaceId =
        getWorkspaceId(workspace);

      if (!workspaceId) {
        return null;
      }

      setActiveWorkspaceState(workspace);

      saveWorkspaceId(workspaceId);

      return workspace;
    },
    []
  );

  /* ==========================================================
     CLEAR WORKSPACE STATE
  ========================================================== */

  const clearWorkspaceState =
    useCallback(() => {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setError("");

      clearStoredWorkspace();
    }, []);

  /* ==========================================================
     LOAD WORKSPACES
  ========================================================== */

  const loadWorkspaces =
    useCallback(async () => {
      const token =
        localStorage.getItem(TOKEN_KEY);

      /*
       * Never call the protected workspace API
       * when the user is not authenticated.
       */
      if (!token) {
        clearWorkspaceState();
        return [];
      }

      const requestId =
        ++requestIdRef.current;

      if (isMountedRef.current) {
        setLoading(true);
        setError("");
      }

      try {
        const response =
          await workspaceService.getWorkspaces();

        /*
         * Ignore stale responses from older requests.
         */
        if (
          !isMountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return [];
        }

        const workspaceList =
          extractWorkspaceList(response);

        setWorkspaces(workspaceList);

        /*
         * Restore previously selected workspace.
         */
        const savedWorkspaceId =
          getStoredWorkspaceId();

        const savedWorkspace =
          workspaceList.find(
            (workspace) =>
              getWorkspaceId(workspace) ===
              String(savedWorkspaceId)
          );

        /*
         * If saved workspace no longer exists,
         * automatically select the first workspace.
         */
        const nextWorkspace =
          savedWorkspace ||
          workspaceList[0] ||
          null;

        if (nextWorkspace) {
          const nextWorkspaceId =
            getWorkspaceId(nextWorkspace);

          setActiveWorkspaceState(
            nextWorkspace
          );

          saveWorkspaceId(
            nextWorkspaceId
          );
        } else {
          setActiveWorkspaceState(null);
          clearStoredWorkspace();
        }

        return workspaceList;
      } catch (requestError) {
        console.error(
          "SyncDoc: failed to load workspaces:",
          requestError
        );

        if (
          !isMountedRef.current ||
          requestId !== requestIdRef.current
        ) {
          return [];
        }

        const status =
          requestError?.response?.status;

        /*
         * Authentication failures should reset
         * workspace state.
         */
        if (status === 401) {
          clearWorkspaceState();
        } else {
          setError(
            requestError?.response?.data
              ?.message ||
              requestError?.message ||
              "Unable to load workspaces."
          );
        }

        return [];
      } finally {
        if (
          isMountedRef.current &&
          requestId === requestIdRef.current
        ) {
          setLoading(false);
        }
      }
    }, [clearWorkspaceState]);

  /* ==========================================================
     REFRESH WORKSPACES
  ========================================================== */

  const refreshWorkspaces =
    useCallback(async () => {
      return loadWorkspaces();
    }, [loadWorkspaces]);

  /* ==========================================================
     CREATE WORKSPACE
  ========================================================== */

  const createWorkspace =
    useCallback(
      async (workspaceData) => {
        if (
          !workspaceData ||
          typeof workspaceData !== "object"
        ) {
          throw new Error(
            "Workspace data is required."
          );
        }

        try {
          setError("");

          const response =
            await workspaceService.createWorkspace(
              workspaceData
            );

          const createdWorkspace =
            extractWorkspace(response);

          if (!createdWorkspace) {
            throw new Error(
              "Workspace was created, but the server returned an invalid workspace."
            );
          }

          if (!isMountedRef.current) {
            return createdWorkspace;
          }

          setWorkspaces(
            (previousWorkspaces) => {
              const workspaceId =
                getWorkspaceId(
                  createdWorkspace
                );

              const alreadyExists =
                previousWorkspaces.some(
                  (workspace) =>
                    getWorkspaceId(
                      workspace
                    ) === workspaceId
                );

              if (alreadyExists) {
                return previousWorkspaces.map(
                  (workspace) =>
                    getWorkspaceId(
                      workspace
                    ) === workspaceId
                      ? createdWorkspace
                      : workspace
                );
              }

              return [
                ...previousWorkspaces,
                createdWorkspace,
              ];
            }
          );

          /*
           * Automatically make the newly created
           * workspace active.
           */
          selectWorkspace(
            createdWorkspace
          );

          return createdWorkspace;
        } catch (requestError) {
          console.error(
            "SyncDoc: failed to create workspace:",
            requestError
          );

          const message =
            requestError?.response?.data
              ?.message ||
            requestError?.message ||
            "Unable to create workspace.";

          if (isMountedRef.current) {
            setError(message);
          }

          throw requestError;
        }
      },
      [selectWorkspace]
    );

  /* ==========================================================
     UPDATE WORKSPACE
  ========================================================== */

  const updateWorkspace =
    useCallback(
      (updatedWorkspace) => {
        if (
          !isValidWorkspace(
            updatedWorkspace
          )
        ) {
          return null;
        }

        const workspaceId =
          getWorkspaceId(
            updatedWorkspace
          );

        setWorkspaces(
          (previousWorkspaces) =>
            previousWorkspaces.map(
              (workspace) =>
                getWorkspaceId(
                  workspace
                ) === workspaceId
                  ? {
                      ...workspace,
                      ...updatedWorkspace,
                    }
                  : workspace
            )
        );

        setActiveWorkspaceState(
          (currentWorkspace) => {
            if (
              !currentWorkspace ||
              getWorkspaceId(
                currentWorkspace
              ) !== workspaceId
            ) {
              return currentWorkspace;
            }

            return {
              ...currentWorkspace,
              ...updatedWorkspace,
            };
          }
        );

        return updatedWorkspace;
      },
      []
    );

  /* ==========================================================
     REMOVE WORKSPACE FROM LOCAL STATE
  ========================================================== */

  const removeWorkspace =
    useCallback(
      (workspaceId) => {
        if (!workspaceId) {
          return;
        }

        const normalizedId =
          String(workspaceId);

        setWorkspaces(
          (previousWorkspaces) =>
            previousWorkspaces.filter(
              (workspace) =>
                getWorkspaceId(
                  workspace
                ) !== normalizedId
            )
        );

        setActiveWorkspaceState(
          (currentWorkspace) => {
            if (
              !currentWorkspace ||
              getWorkspaceId(
                currentWorkspace
              ) !== normalizedId
            ) {
              return currentWorkspace;
            }

            return null;
          }
        );

        if (
          getStoredWorkspaceId() ===
          normalizedId
        ) {
          clearStoredWorkspace();
        }
      },
      []
    );

  /* ==========================================================
     ACTIVE WORKSPACE HELPERS
  ========================================================== */

  const activeWorkspaceId =
    useMemo(
      () =>
        getWorkspaceId(
          activeWorkspace
        ),
      [activeWorkspace]
    );

  const activeWorkspaceName =
    useMemo(
      () =>
        getWorkspaceName(
          activeWorkspace
        ),
      [activeWorkspace]
    );

  /* ==========================================================
     AUTH → WORKSPACE SYNC
  ========================================================== */

  useEffect(() => {
    /*
     * Authentication is still being restored.
     * Wait before making workspace requests.
     */
    if (authLoading) {
      return;
    }

    /*
     * No authenticated user.
     * Clear all workspace state.
     */
    if (!user) {
      requestIdRef.current += 1;

      clearWorkspaceState();
      setLoading(false);

      return;
    }

    /*
     * Authenticated user exists.
     * Load workspaces.
     */
    loadWorkspaces();
  }, [
    user,
    authLoading,
    loadWorkspaces,
    clearWorkspaceState,
  ]);

  /* ==========================================================
     CONTEXT VALUE
  ========================================================== */

  const value = useMemo(
    () => ({
      /* ------------------------------------------------------
         Workspace collections
      ------------------------------------------------------ */

      workspaces,

      /* ------------------------------------------------------
         Active workspace
      ------------------------------------------------------ */

      activeWorkspace,

      /*
       * Backward compatibility.
       *
       * Existing components can use:
       * currentWorkspace
       */
      currentWorkspace:
        activeWorkspace,

      activeWorkspaceId,

      activeWorkspaceName,

      /* ------------------------------------------------------
         State
      ------------------------------------------------------ */

      loading,
      error,

      /* ------------------------------------------------------
         Workspace actions
      ------------------------------------------------------ */

      loadWorkspaces,
      refreshWorkspaces,

      selectWorkspace,

      /*
       * Backward compatibility with existing code:
       *
       * setActiveWorkspace(workspace)
       */
      setActiveWorkspace:
        selectWorkspace,

      createWorkspace,

      updateWorkspace,

      removeWorkspace,

      /* ------------------------------------------------------
         Utility
      ------------------------------------------------------ */

      hasWorkspaces:
        workspaces.length > 0,

      workspaceCount:
        workspaces.length,
    }),
    [
      workspaces,
      activeWorkspace,
      activeWorkspaceId,
      activeWorkspaceName,
      loading,
      error,
      loadWorkspaces,
      refreshWorkspaces,
      selectWorkspace,
      createWorkspace,
      updateWorkspace,
      removeWorkspace,
    ]
  );

  /* ==========================================================
     PROVIDER
  ========================================================== */

  return (
    <WorkspaceContext.Provider
      value={value}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

/* ============================================================
   USE WORKSPACE
============================================================ */

export function useWorkspace() {
  const context =
    useContext(WorkspaceContext);

  if (!context) {
    throw new Error(
      "useWorkspace must be used inside WorkspaceProvider"
    );
  }

  return context;
}

/* ============================================================
   DEFAULT EXPORT
============================================================ */

export default WorkspaceContext;