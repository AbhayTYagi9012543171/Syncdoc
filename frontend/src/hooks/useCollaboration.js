
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  createCollaborationProvider,
} from "../utils/yjsProvider";

export default function useCollaboration(documentId) {
  const providerRef = useRef(null);
  const mountedRef = useRef(false);
  const documentIdRef = useRef(documentId || null);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  /*
   * Track whether the hook is mounted.
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /*
   * Create one provider for the current document.
   */
  useEffect(() => {
    let active = true;
    let provider = null;

    documentIdRef.current = documentId || null;

    setConnected(false);
    setConnecting(Boolean(documentId));
    setUsers([]);
    setError(null);

    if (!documentId) {
      providerRef.current = null;
      setConnecting(false);

      return () => {
        active = false;
      };
    }

    const canUpdateState = () =>
      active && mountedRef.current;

    const handleConnect = () => {
      if (!canUpdateState()) return;

      setConnected(true);
      setConnecting(false);
      setError(null);
    };

    const handleDisconnect = (reason) => {
      if (!canUpdateState()) return;

      setConnected(false);
      setConnecting(false);

      // Keep the reason available for debugging.
      if (reason) {
        console.info(
          "SyncDoc collaboration disconnected:",
          reason
        );
      }
    };

    const handleUsers = (nextUsers) => {
      if (!canUpdateState()) return;

      setUsers(
        Array.isArray(nextUsers)
          ? nextUsers.filter(Boolean)
          : []
      );
    };

    const handleError = (providerError) => {
      if (!canUpdateState()) return;

      const normalizedError =
        providerError instanceof Error
          ? providerError
          : new Error(
              String(
                providerError ||
                  "Collaboration connection failed."
              )
            );

      console.error(
        "SyncDoc collaboration error:",
        normalizedError
      );

      setConnected(false);
      setConnecting(false);
      setError(normalizedError);
    };

    try {
      provider = createCollaborationProvider(
        documentId,
        {
          onConnect: handleConnect,
          onDisconnect: handleDisconnect,
          onUsers: handleUsers,
          onError: handleError,
        }
      );

      if (!active) {
        provider?.destroy?.();
        return undefined;
      }

      providerRef.current = provider;

      /*
       * The provider currently connects automatically.
       * Do not call connect() again here.
       */
    } catch (providerError) {
      handleError(providerError);
      providerRef.current = null;
    }

    return () => {
      active = false;

      if (providerRef.current === provider) {
        providerRef.current = null;
      }

      try {
        provider?.destroy?.();
      } catch (cleanupError) {
        console.warn(
          "SyncDoc collaboration cleanup failed:",
          cleanupError
        );
      }
    };
  }, [documentId]);

  /*
   * Broadcast a document collaboration event.
   */
  const broadcast = useCallback((payload) => {
    const provider = providerRef.current;

    if (
      !provider ||
      typeof provider.broadcast !== "function"
    ) {
      return false;
    }

    try {
      return provider.broadcast(payload) === true;
    } catch (broadcastError) {
      console.error(
        "SyncDoc broadcast failed:",
        broadcastError
      );

      return false;
    }
  }, []);

  /*
   * Reconnect the current provider.
   */
  const reconnect = useCallback(() => {
    const provider = providerRef.current;

    if (!provider) {
      return false;
    }

    const reconnectMethod =
      provider.reconnect || provider.connect;

    if (typeof reconnectMethod !== "function") {
      return false;
    }

    try {
      setConnecting(true);
      setError(null);

      const result = reconnectMethod.call(provider);

      if (result === false) {
        setConnecting(false);
        return false;
      }

      return true;
    } catch (reconnectError) {
      setConnecting(false);

      setError(
        reconnectError instanceof Error
          ? reconnectError
          : new Error("Unable to reconnect collaboration.")
      );

      console.error(
        "SyncDoc reconnect failed:",
        reconnectError
      );

      return false;
    }
  }, []);

  /*
   * Disconnect without destroying the provider.
   */
  const disconnect = useCallback(() => {
    const provider = providerRef.current;

    if (!provider) {
      return false;
    }

    const disconnectMethod =
      provider.disconnect || provider.close;

    if (typeof disconnectMethod !== "function") {
      return false;
    }

    try {
      const result = disconnectMethod.call(provider);

      if (result === false) {
        return false;
      }

      setConnected(false);
      setConnecting(false);
      setUsers([]);

      return true;
    } catch (disconnectError) {
      console.error(
        "SyncDoc disconnect failed:",
        disconnectError
      );

      return false;
    }
  }, []);

  const getProvider = useCallback(
    () => providerRef.current,
    []
  );

  const collaboratorCount = users.length;

  return {
    connected,
    connecting,

    users,
    collaboratorCount,
    hasCollaborators: collaboratorCount > 0,

    error,
    hasError: Boolean(error),

    documentId: documentIdRef.current,
    provider: providerRef.current,
    getProvider,

    broadcast,
    reconnect,
    disconnect,
  };
}
