
import { io } from 'socket.io-client';

/**
 * SyncDoc Collaboration Provider
 *
 * Responsibilities:
 * - Socket.IO connection management
 * - Document room join / leave
 * - Presence events
 * - Document update events
 * - Authentication token support
 * - Automatic reconnection
 * - Safe event listener cleanup
 *
 * Note:
 * This adapter handles Socket.IO collaboration events.
 * Actual Yjs CRDT synchronization requires a separate Yjs
 * document and update synchronization implementation.
 */

const DEFAULT_SOCKET_URL = 'http://localhost:5000';

const TOKEN_KEYS = [
  'syncdoc_token',
  'token',
  'accessToken',
];

const EVENTS = Object.freeze({
  JOIN: 'document:join',
  LEAVE: 'document:leave',
  UPDATE: 'document:update',
  PRESENCE: 'document:presence',

  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',
  ERROR: 'error',
});

/* ---------------------------------------------------------
   Helpers
--------------------------------------------------------- */

function getSocketUrl() {
  const configuredUrl =
    typeof process !== 'undefined'
      ? process.env?.REACT_APP_SOCKET_URL
      : undefined;

  const url = (
    configuredUrl || DEFAULT_SOCKET_URL
  ).trim();

  return url.replace(/\/+$/, '');
}

function getAuthToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    for (const key of TOKEN_KEYS) {
      const token = window.localStorage.getItem(key);

      if (token) {
        return token;
      }
    }
  } catch (error) {
    console.warn(
      'SyncDoc: unable to read authentication token.',
      error
    );
  }

  return null;
}

function normalizeDocumentId(documentId) {
  if (documentId === undefined || documentId === null) {
    return '';
  }

  return String(documentId).trim();
}

function normalizeUsers(users) {
  return Array.isArray(users)
    ? users.filter(Boolean)
    : [];
}

function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error(
    error?.message || 'Collaboration connection failed.'
  );
}

/* ---------------------------------------------------------
   Empty provider
--------------------------------------------------------- */

function createEmptyProvider(error = null) {
  return {
    broadcast: () => false,
    connect: () => false,
    reconnect: () => false,
    disconnect: () => false,
    destroy: () => {},
    join: () => false,
    leave: () => false,
    isConnected: () => false,
    getSocket: () => null,
    getDocumentId: () => '',
    error,
  };
}

/* ---------------------------------------------------------
   Main provider
--------------------------------------------------------- */

export function createCollaborationProvider(
  documentId,
  callbacks = {}
) {
  const normalizedDocumentId =
    normalizeDocumentId(documentId);

  if (!normalizedDocumentId) {
    const error = new Error(
      'A valid document ID is required for collaboration.'
    );

    callbacks.onError?.(error);

    return createEmptyProvider(error);
  }

  let socket = null;
  let connected = false;
  let joined = false;
  let destroyed = false;

  /* -------------------------------------------------------
     Callback helpers
  ------------------------------------------------------- */

  function notifyConnect() {
    if (!destroyed) {
      callbacks.onConnect?.();
    }
  }

  function notifyDisconnect(reason) {
    if (!destroyed) {
      callbacks.onDisconnect?.(reason);
    }
  }

  function notifyUsers(users) {
    if (!destroyed) {
      callbacks.onUsers?.(normalizeUsers(users));
    }
  }

  function notifyMessage(payload) {
    if (!destroyed) {
      callbacks.onMessage?.(payload);
    }
  }

  function notifyError(error) {
    if (destroyed) {
      return;
    }

    const normalizedError = normalizeError(error);

    console.error(
      'SyncDoc collaboration error:',
      normalizedError
    );

    callbacks.onError?.(normalizedError);
  }

  /* -------------------------------------------------------
     Join / leave document
  ------------------------------------------------------- */

  function joinDocument() {
    if (
      destroyed ||
      !socket ||
      !socket.connected ||
      joined
    ) {
      return false;
    }

    socket.emit(EVENTS.JOIN, {
      documentId: normalizedDocumentId,
    });

    joined = true;

    return true;
  }

  function leaveDocument() {
    if (!socket || !joined) {
      return false;
    }

    try {
      if (socket.connected) {
        socket.emit(EVENTS.LEAVE, {
          documentId: normalizedDocumentId,
        });
      }
    } catch (error) {
      console.warn(
        'SyncDoc: unable to leave the document room.',
        error
      );
    } finally {
      joined = false;
    }

    return true;
  }

  /* -------------------------------------------------------
     Socket event handlers
  ------------------------------------------------------- */

  function handleConnect() {
    if (destroyed) {
      return;
    }

    connected = true;
    joined = false;

    // Join again after every successful reconnection.
    joinDocument();

    notifyConnect();
  }

  function handleDisconnect(reason) {
    connected = false;
    joined = false;

    notifyUsers([]);
    notifyDisconnect(reason);
  }

  function handlePresence(users) {
    notifyUsers(users);
  }

  function handleDocumentUpdate(payload) {
    if (destroyed) {
      return;
    }

    // Ignore updates explicitly belonging to another document.
    if (
      payload?.documentId !== undefined &&
      String(payload.documentId) !== normalizedDocumentId
    ) {
      return;
    }

    notifyMessage(payload);
  }

  function handleConnectError(error) {
    connected = false;
    joined = false;

    notifyError(error);
  }

  function handleSocketError(error) {
    notifyError(error);
  }

  /* -------------------------------------------------------
     Create Socket.IO client
  ------------------------------------------------------- */

  try {
    const socketUrl = getSocketUrl();
    const token = getAuthToken();

    socket = io(socketUrl, {
      /**
       * Start with HTTP long-polling, then attempt to upgrade
       * to WebSocket. This supports servers where WebSocket
       * upgrade may fail but polling is available.
       */
      transports: ['polling', 'websocket'],

      upgrade: true,
      rememberUpgrade: false,

      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,

      timeout: 20000,
      withCredentials: true,

      /**
       * Backend Socket.IO middleware can access:
       * socket.handshake.auth.token
       */
      auth: token ? { token } : {},

      /**
       * Use a separate Manager for this provider so its
       * cleanup does not disconnect another provider that
       * shares the same server URL.
       */
      forceNew: true,
      autoConnect: true,
    });

    socket.on(EVENTS.CONNECT, handleConnect);
    socket.on(EVENTS.DISCONNECT, handleDisconnect);
    socket.on(EVENTS.PRESENCE, handlePresence);
    socket.on(EVENTS.UPDATE, handleDocumentUpdate);
    socket.on(EVENTS.CONNECT_ERROR, handleConnectError);
    socket.on(EVENTS.ERROR, handleSocketError);
  } catch (error) {
    socket = null;

    const normalizedError = normalizeError(error);
    callbacks.onError?.(normalizedError);

    return createEmptyProvider(normalizedError);
  }

  /* -------------------------------------------------------
     Broadcast an update
  ------------------------------------------------------- */

  function broadcast(payload) {
    if (
      destroyed ||
      !socket ||
      !socket.connected
    ) {
      return false;
    }

    if (!payload || typeof payload !== 'object') {
      console.warn(
        'SyncDoc: broadcast payload must be an object.'
      );

      return false;
    }

    try {
      socket.emit(EVENTS.UPDATE, {
        ...payload,

        // Always use this provider's document ID.
        documentId: normalizedDocumentId,
      });

      return true;
    } catch (error) {
      notifyError(error);
      return false;
    }
  }

  /* -------------------------------------------------------
     Connect / reconnect
  ------------------------------------------------------- */

  function connect() {
    if (destroyed || !socket) {
      return false;
    }

    if (socket.connected) {
      connected = true;
      joinDocument();

      return true;
    }

    try {
      socket.connect();

      return true;
    } catch (error) {
      notifyError(error);

      return false;
    }
  }

  /* -------------------------------------------------------
     Disconnect
  ------------------------------------------------------- */

  function disconnect() {
    if (destroyed || !socket) {
      return false;
    }

    try {
      leaveDocument();
      socket.disconnect();

      connected = false;
      joined = false;

      return true;
    } catch (error) {
      notifyError(error);

      return false;
    }
  }

  /* -------------------------------------------------------
     Destroy and clean up
  ------------------------------------------------------- */

  function destroy() {
    if (destroyed) {
      return;
    }

    // Attempt to leave before removing the connection.
    leaveDocument();

    destroyed = true;
    connected = false;
    joined = false;

    if (!socket) {
      return;
    }

    try {
      socket.off(EVENTS.CONNECT, handleConnect);
      socket.off(EVENTS.DISCONNECT, handleDisconnect);
      socket.off(EVENTS.PRESENCE, handlePresence);
      socket.off(EVENTS.UPDATE, handleDocumentUpdate);
      socket.off(EVENTS.CONNECT_ERROR, handleConnectError);
      socket.off(EVENTS.ERROR, handleSocketError);

      socket.disconnect();
    } catch (error) {
      console.warn(
        'SyncDoc: collaboration cleanup failed.',
        error
      );
    } finally {
      socket = null;
    }
  }

  /* -------------------------------------------------------
     Public provider API
  ------------------------------------------------------- */

  return {
    broadcast,

    connect,
    reconnect: connect,

    disconnect,
    destroy,

    join: joinDocument,
    leave: leaveDocument,

    isConnected() {
      return Boolean(
        !destroyed &&
        connected &&
        socket?.connected
      );
    },

    getSocket() {
      return socket;
    },

    getDocumentId() {
      return normalizedDocumentId;
    },
  };
}

export default createCollaborationProvider;
