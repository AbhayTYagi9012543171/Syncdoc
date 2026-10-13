import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createCollaborationProvider,
} from "../utils/yjsProvider";

/* ============================================================
   SYNCDOC — COLLABORATION HOOK
   ============================================================ */

/**
 * useCollaboration
 *
 * Manages the lifecycle of a real-time collaboration provider
 * for a single document.
 *
 * Responsibilities:
 * - Create collaboration provider
 * - Track connection state
 * - Track online collaborators
 * - Handle provider errors
 * - Broadcast custom events
 * - Clean up provider when document changes
 * - Prevent stale provider callbacks
 * - Expose reconnect functionality when supported
 */

export default function useCollaboration(
  documentId
) {
  /* ==========================================================
     PROVIDER REF
  ========================================================== */

  const providerRef = useRef(null);

  /* ==========================================================
     LIFECYCLE REF
  ========================================================== */

  const mountedRef = useRef(true);

  /* ==========================================================
     CURRENT DOCUMENT REF
  ========================================================== */

  const documentIdRef =
    useRef(documentId);

  /* ==========================================================
     STATE
  ========================================================== */

  const [
    connected,
    setConnected,
  ] = useState(false);

  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    error,
    setError,
  ] = useState(null);

  const [
    connecting,
    setConnecting,
  ] = useState(false);

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
     COLLABORATION PROVIDER
  ========================================================== */

  useEffect(() => {
    /*
     * Always clean up the previous provider when
     * the document changes.
     */
    const previousProvider =
      providerRef.current;

    if (previousProvider) {
      try {
        previousProvider.destroy?.();
      } catch (destroyError) {
        console.warn(
          "SyncDoc: failed to destroy previous collaboration provider:",
          destroyError
        );
      }

      providerRef.current = null;
    }

    documentIdRef.current =
      documentId || null;

    /*
     * No document means there is nothing
     * to collaborate on.
     */
    if (!documentId) {
      setConnected(false);
      setConnecting(false);
      setUsers([]);
      setError(null);

      return undefined;
    }

    let active = true;

    setConnected(false);
    setConnecting(true);
    setUsers([]);
    setError(null);

    /* ========================================================
       PROVIDER CALLBACKS
    ======================================================== */

    const handleConnect = () => {
      if (
        !active ||
        !mountedRef.current
      ) {
        return;
      }

      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    const handleDisconnect = () => {
      if (
        !active ||
        !mountedRef.current
      ) {
        return;
      }

      setConnected(false);
      setConnecting(false);
    };

    const handleUsers = (
      nextUsers
    ) => {
      if (
        !active ||
        !mountedRef.current
      ) {
        return;
      }

      /*
       * Always normalize collaborators to
       * an array so consuming components
       * don't have to perform defensive checks.
       */
      setUsers(
        Array.isArray(nextUsers)
          ? nextUsers
          : []
      );
    };

    const handleError = (
      providerError
    ) => {
      if (
        !active ||
        !mountedRef.current
      ) {
        return;
      }

      console.error(
        "SyncDoc collaboration error:",
        providerError
      );

      setConnected(false);
      setConnecting(false);

      setError(
        providerError instanceof Error
          ? providerError
          : new Error(
            String(
              providerError ||
              "Collaboration connection failed."
            )
          )
      );
    };

    /* ========================================================
       CREATE PROVIDER
    ======================================================== */

    let provider = null;

    try {
      provider =
        createCollaborationProvider(
          documentId,
          {
            onConnect:
              handleConnect,

            onDisconnect:
              handleDisconnect,

            onUsers:
              handleUsers,

            /*
             * Supported by newer versions
             * of the provider.
             */
            onError:
              handleError,
          }
        );

      if (!active) {
        provider?.destroy?.();

        return undefined;
      }

      providerRef.current =
        provider;
    } catch (providerError) {
      console.error(
        "SyncDoc: unable to create collaboration provider:",
        providerError
      );

      if (mountedRef.current) {
        setConnected(false);
        setConnecting(false);

        setError(
          providerError instanceof Error
            ? providerError
            : new Error(
              "Unable to initialize collaboration."
            )
        );
      }

      providerRef.current =
        null;
    }

    /* ========================================================
       CLEANUP
    ======================================================== */

    return () => {
      active = false;

      /*
       * Only destroy the provider created
       * by this effect.
       */
      if (
        providerRef.current ===
        provider
      ) {
        providerRef.current =
          null;
      }

      try {
        provider?.destroy?.();
      } catch (destroyError) {
        console.warn(
          "SyncDoc: collaboration cleanup failed:",
          destroyError
        );
      }

      if (mountedRef.current) {
        setConnected(false);
        setConnecting(false);
        setUsers([]);
      }
    };
  }, [documentId]);

  /* ==========================================================
     BROADCAST
  ========================================================== */

  const broadcast = useCallback(
    (payload) => {
      const provider =
        providerRef.current;

      if (!provider) {
        return false;
      }

      if (
        typeof provider.broadcast !==
        "function"
      ) {
        console.warn(
          "SyncDoc: collaboration provider does not support broadcast()."
        );

        return false;
      }

      try {
        provider.broadcast(
          payload
        );

        return true;
      } catch (broadcastError) {
        console.error(
          "SyncDoc: failed to broadcast collaboration event:",
          broadcastError
        );

        return false;
      }
    },
    []
  );

  /* ==========================================================
     RECONNECT
  ========================================================== */

  const reconnect =
    useCallback(() => {
      const provider =
        providerRef.current;

      if (!provider) {
        return false;
      }

      /*
       * Different providers may expose
       * different reconnect methods.
       */
      const reconnectMethod =
        provider.reconnect ||
        provider.connect;

      if (
        typeof reconnectMethod !==
        "function"
      ) {
        console.warn(
          "SyncDoc: collaboration provider does not support reconnect()."
        );

        return false;
      }

      try {
        setConnecting(true);
        setError(null);

        reconnectMethod.call(
          provider
        );

        return true;
      } catch (reconnectError) {
        console.error(
          "SyncDoc: collaboration reconnect failed:",
          reconnectError
        );

        setConnecting(false);

        setError(
          reconnectError instanceof Error
            ? reconnectError
            : new Error(
              "Unable to reconnect collaboration."
            )
        );

        return false;
      }
    }, []);

  /* ==========================================================
     DISCONNECT
  ========================================================== */

  const disconnect =
    useCallback(() => {
      const provider =
        providerRef.current;

      if (!provider) {
        return false;
      }

      const disconnectMethod =
        provider.disconnect ||
        provider.close;

      if (
        typeof disconnectMethod !==
        "function"
      ) {
        /*
         * Some providers only expose
         * destroy().
         */
        return false;
      }

      try {
        disconnectMethod.call(
          provider
        );

        setConnected(false);
        setConnecting(false);

        return true;
      } catch (disconnectError) {
        console.error(
          "SyncDoc: collaboration disconnect failed:",
          disconnectError
        );

        return false;
      }
    }, []);

  /* ==========================================================
     PROVIDER ACCESS
  ========================================================== */

  const getProvider =
    useCallback(() => {
      return providerRef.current;
    }, []);

  /* ==========================================================
     DERIVED STATE
  ========================================================== */

  const collaboratorCount =
    users.length;

  const hasCollaborators =
    collaboratorCount > 0;

  /* ==========================================================
     RETURN API
  ========================================================== */

  return {
    /* --------------------------------------------------------
       Connection
    -------------------------------------------------------- */

    connected,

    connecting,

    /* --------------------------------------------------------
       Collaborators
    -------------------------------------------------------- */

    users,

    collaboratorCount,

    hasCollaborators,

    /* --------------------------------------------------------
       Errors
    -------------------------------------------------------- */

    error,

    hasError:
      Boolean(error),

    /* --------------------------------------------------------
       Document
    -------------------------------------------------------- */

    documentId:
      documentIdRef.current,

    /* --------------------------------------------------------
       Provider
    -------------------------------------------------------- */

    provider:
      providerRef.current,

    getProvider,

    /* --------------------------------------------------------
       Actions
    -------------------------------------------------------- */

    broadcast,

    reconnect,

    disconnect,
  };
}