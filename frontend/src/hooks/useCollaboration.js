import { useCallback, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { createCollaborationProvider } from "../utils/yjsProvider";

function normalizeUser(user) {
  const name = user?.displayName || user?.name || user?.username || user?.email || "SyncDoc user";
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) hash = (hash * 31 + name.charCodeAt(index)) | 0;
  const colors = ["#6558d3", "#0e9f8a", "#db7c35", "#2875d7", "#c14d86", "#688b28"];
  return {
    id: String(user?._id || user?.id || user?.userId || user?.email || "anonymous"),
    name: String(name),
    color: colors[Math.abs(hash) % colors.length],
  };
}

function awarenessUsers(provider) {
  const states = provider?.awareness?.getStates?.();
  if (!states) return [];
  const unique = new Map();
  states.forEach((state, clientId) => {
    const user = state?.user;
    if (!user) return;
    const id = String(user.id || clientId);
    unique.set(id, { ...user, id, isOnline: true, status: "online" });
  });
  return Array.from(unique.values());
}

export default function useCollaboration(documentId, { enabled = true, user } = {}) {
  const providerRef = useRef(null);
  const ydocRef = useRef(null);
  const [ydoc, setYdoc] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const userId = user?._id || user?.id || user?.userId || user?.email || "anonymous";
  const userName = user?.displayName || user?.name || user?.username || user?.email || "SyncDoc user";
  const userEmail = user?.email || "";

  useEffect(() => {
    let active = true;
    let nextDoc = null;
    let nextProvider = null;

    setConnected(false);
    setConnecting(Boolean(documentId && enabled));
    setUsers([]);
    setError(null);
    setProvider(null);
    setYdoc(null);
    providerRef.current = null;
    ydocRef.current = null;

    if (!documentId || !enabled) {
      setConnecting(false);
      return () => { active = false; };
    }

    const updateUsers = () => {
      if (active) setUsers(awarenessUsers(nextProvider));
    };

    try {
      nextDoc = new Y.Doc();
      nextProvider = createCollaborationProvider(documentId, nextDoc, {
        connect: false,
        maxBackoffTime: 10000,
      });
      nextProvider.awareness.setLocalStateField("user", normalizeUser({
        id: userId,
        displayName: userName,
        email: userEmail,
      }));
      nextProvider.on("status", ({ status }) => {
        if (!active) return;
        const isConnected = status === "connected";
        setConnected(isConnected);
        setConnecting(status === "connecting");
        if (isConnected) setError(null);
      });
      nextProvider.on("sync", (isSynced) => {
        if (!active) return;
        if (isSynced) {
          setConnecting(false);
          setError(null);
        }
      });
      nextProvider.on("connection-error", (event) => {
        if (!active) return;
        setError(new Error(event?.message || "Unable to connect to live collaboration."));
        setConnecting(false);
      });
      nextProvider.on("connection-close", () => {
        if (!active) return;
        setConnected(false);
      });
      nextProvider.awareness.on("change", updateUsers);
      updateUsers();
      providerRef.current = nextProvider;
      ydocRef.current = nextDoc;
      setYdoc(nextDoc);
      setProvider(nextProvider);
      // EditorContent waits for the provider's sync event before seeding
      // an empty shared document, avoiding overwriting already-synced content.
      nextProvider.connect();
    } catch (providerError) {
      setError(providerError instanceof Error ? providerError : new Error(String(providerError)));
      setConnecting(false);
    }

    return () => {
      active = false;
      if (nextProvider) {
        try { nextProvider.awareness.off("change", updateUsers); } catch (_) { /* no-op */ }
        try { nextProvider.destroy(); } catch (_) { /* no-op */ }
      }
      if (nextDoc) {
        try { nextDoc.destroy(); } catch (_) { /* no-op */ }
      }
      if (providerRef.current === nextProvider) providerRef.current = null;
      if (ydocRef.current === nextDoc) ydocRef.current = null;
    };
  }, [documentId, enabled, userId, userName, userEmail]);

  const broadcast = useCallback((payload) => {
    const current = providerRef.current;
    if (!current?.awareness || !payload || typeof payload !== "object") return false;
    try {
      current.awareness.setLocalStateField("syncdocEvent", {
        ...payload,
        timestamp: payload.timestamp || Date.now(),
      });
      return true;
    } catch (broadcastError) {
      console.warn("SyncDoc collaboration broadcast failed:", broadcastError);
      return false;
    }
  }, []);

  const reconnect = useCallback(() => {
    const current = providerRef.current;
    if (!current) return false;
    setConnecting(true);
    setError(null);
    try {
      current.connect();
      return true;
    } catch (reconnectError) {
      setConnecting(false);
      setError(reconnectError instanceof Error ? reconnectError : new Error(String(reconnectError)));
      return false;
    }
  }, []);

  const disconnect = useCallback(() => {
    const current = providerRef.current;
    if (!current) return false;
    current.disconnect();
    setConnected(false);
    setConnecting(false);
    return true;
  }, []);

  return { ydoc, provider, connected, connecting, users, error, broadcast, reconnect, disconnect };
}
