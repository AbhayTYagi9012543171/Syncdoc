import { useWorkspace as useWorkspaceContext } from "../context/WorkspaceContext";

/* ============================================================
   SYNCDOC — WORKSPACE HOOK
============================================================ */

/**
 * Access the global SyncDoc workspace context.
 *
 * This hook intentionally delegates to WorkspaceContext so
 * components do not need to know where workspace state lives.
 *
 * Available values typically include:
 *
 * - workspaces
 * - activeWorkspace
 * - currentWorkspace
 * - loading
 * - loadWorkspaces
 * - selectWorkspace
 * - setActiveWorkspace
 * - createWorkspace
 *
 * @returns {Object} Workspace context
 *
 * @example
 *
 * const {
 *   workspaces,
 *   currentWorkspace,
 *   loading,
 *   selectWorkspace,
 * } = useWorkspace();
 */
export default function useWorkspace() {
  return useWorkspaceContext();
}