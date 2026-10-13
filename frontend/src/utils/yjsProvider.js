/* ============================================================
   SYNCDOC — COLLABORATION PROVIDER
   Lightweight Socket.io collaboration adapter.

   This adapter provides:
   - Socket connection lifecycle
   - Document room join / leave
   - Presence updates
   - Document update broadcasting
   - Authentication token support
   - Reconnection support
   - Connection errors
   - Safe cleanup
   - Duplicate-event protection

   IMPORTANT:
   This is currently a Socket.io collaboration adapter.

   When Yjs/CRDT is fully connected, this file can become the
   bridge between the React editor and the Yjs provider.
============================================================ */

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_SOCKET_URL = 'http://localhost:5000';

const TOKEN_KEY = 'syncdoc_token';

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

/* ============================================================
   HELPERS
============================================================ */

/**
 * Resolve Socket.io server URL.
 *
 * This project currently uses Create React App style
 * environment variables:
 *
 * REACT_APP_SOCKET_URL=http://localhost:5000
 */
function getSocketUrl() {
  if (
    typeof process !== 'undefined' &&
    process.env?.REACT_APP_SOCKET_URL
  ) {
    return process.env.REACT_APP_SOCKET_URL;
  }

  return DEFAULT_SOCKET_URL;
}

/**
 * Safely read authentication token.
 */
function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.warn(
      'SyncDoc collaboration: unable to read authentication token.',
      error
    );

    return null;
  }
}

/**
 * Validate document ID.
 */
function normalizeDocumentId(documentId) {
  if (
    documentId === undefined ||
    documentId === null
  ) {
    return '';
  }

  return String(documentId).trim();
}

/**
 * Always expose collaborators as an array.
 */
function normalizeUsers(users) {
  return Array.isArray(users)
    ? users.filter(Boolean)
    : [];
}

/**
 * Convert unknown errors to an Error instance.
 */
function normalizeError(error) {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string') {
    return new Error(error);
  }

  return new Error(
    error?.message ||
    'Collaboration connection failed.'
  );
}

/* ============================================================
   SOCKET FACTORY
============================================================ */

/**
 * Create a Socket.io instance.
 *
 * The current implementation supports window.io so the
 * application does not require socket.io-client to be imported
 * directly from this file.
 *
 * If you later install:
 *
 * npm install socket.io-client
 *
 * you can replace window.io with:
 *
 * import { io } from 'socket.io-client';
 */
function createSocket(url, options) {
  if (
    typeof window === 'undefined'
  ) {
    return null;
  }

  if (
    typeof window.io !== 'function'
  ) {
    console.warn(
      'SyncDoc collaboration: Socket.io client is not available.'
    );

    return null;
  }

  return window.io(url, options);
}

/* ============================================================
   COLLABORATION PROVIDER
============================================================ */

export function createCollaborationProvider(
  documentId,
  callbacks = {}
) {
  /* ==========================================================
     DOCUMENT
  ========================================================== */

  const normalizedDocumentId =
    normalizeDocumentId(documentId);

  if (!normalizedDocumentId) {
    const error = new Error(
      'Document ID is required for collaboration.'
    );

    callbacks.onError?.(error);

    return createEmptyProvider();
  }

  /* ==========================================================
     PROVIDER STATE
  ========================================================== */

  let socket = null;

  let connected = false;
  let destroyed = false;
  let joined = false;

  /* ==========================================================
     CALLBACK HELPERS
  ========================================================== */

  const notifyConnect = () => {
    if (destroyed) {
      return;
    }

    callbacks.onConnect?.();
  };

  const notifyDisconnect = (
    reason
  ) => {
    if (destroyed) {
      return;
    }

    callbacks.onDisconnect?.(
      reason
    );
  };

  const notifyUsers = (
    users
  ) => {
    if (destroyed) {
      return;
    }

    callbacks.onUsers?.(
      normalizeUsers(users)
    );
  };

  const notifyMessage = (
    payload
  ) => {
    if (destroyed) {
      return;
    }

    callbacks.onMessage?.(
      payload
    );
  };

  const notifyError = (
    error
  ) => {
    if (destroyed) {
      return;
    }

    const normalized =
      normalizeError(error);

    console.error(
      'SyncDoc collaboration error:',
      normalized
    );

    callbacks.onError?.(
      normalized
    );
  };

  /* ==========================================================
     JOIN DOCUMENT
  ========================================================== */

  const joinDocument = () => {
    if (
      !socket ||
      !connected ||
      joined ||
      destroyed
    ) {
      return false;
    }

    socket.emit(
      EVENTS.JOIN,
      {
        documentId:
          normalizedDocumentId,
      }
    );

    joined = true;

    return true;
  };

  /* ==========================================================
     LEAVE DOCUMENT
  ========================================================== */

  const leaveDocument = () => {
    if (
      !socket ||
      !joined
    ) {
      return false;
    }

    try {
      socket.emit(
        EVENTS.LEAVE,
        {
          documentId:
            normalizedDocumentId,
        }
      );
    } catch (error) {
      console.warn(
        'SyncDoc collaboration: unable to leave document.',
        error
      );
    }

    joined = false;

    return true;
  };

  /* ==========================================================
     EVENT HANDLERS
  ========================================================== */

  const handleConnect = () => {
    if (destroyed) {
      return;
    }

    connected = true;

    /*
     * Reconnection creates a new room membership,
     * therefore allow the document to be joined again.
     */
    joined = false;

    joinDocument();

    notifyConnect();
  };

  const handleDisconnect = (
    reason
  ) => {
    connected = false;
    joined = false;

    /*
     * Clear presence on disconnect so old users
     * are not displayed as online.
     */
    notifyUsers([]);

    notifyDisconnect(reason);
  };

  const handlePresence = (
    users
  ) => {
    notifyUsers(users);
  };

  const handleDocumentUpdate = (
    payload
  ) => {
    /*
     * Ignore updates belonging to another
     * document when the backend includes
     * documentId in the payload.
     */
    if (
      payload?.documentId &&
      String(payload.documentId) !==
      normalizedDocumentId
    ) {
      return;
    }

    notifyMessage(payload);
  };

  const handleConnectError = (
    error
  ) => {
    connected = false;
    joined = false;

    notifyError(error);
  };

  const handleSocketError = (
    error
  ) => {
    notifyError(error);
  };

  /* ==========================================================
     CREATE SOCKET
  ========================================================== */

  try {
    const socketUrl =
      getSocketUrl();

    const token =
      getAuthToken();

    socket = createSocket(
      socketUrl,
      {
        transports: [
          'websocket',
          'polling',
        ],

        /*
         * Allow Socket.io to reconnect automatically.
         */
        reconnection: true,

        reconnectionAttempts: 10,

        reconnectionDelay: 1000,

        reconnectionDelayMax: 5000,

        timeout: 10000,

        withCredentials: true,

        /*
         * Backend Socket.io middleware can read:
         *
         * socket.handshake.auth.token
         */
        auth: token
          ? {
            token,
          }
          : {},
      }
    );

    if (!socket) {
      const error = new Error(
        'Socket.io client is not available.'
      );

      notifyError(error);

      return createEmptyProvider(
        error
      );
    }

    /* ========================================================
       REGISTER EVENTS
    ======================================================== */

    socket.on(
      EVENTS.CONNECT,
      handleConnect
    );

    socket.on(
      EVENTS.DISCONNECT,
      handleDisconnect
    );

    socket.on(
      EVENTS.PRESENCE,
      handlePresence
    );

    socket.on(
      EVENTS.UPDATE,
      handleDocumentUpdate
    );

    socket.on(
      EVENTS.CONNECT_ERROR,
      handleConnectError
    );

    socket.on(
      EVENTS.ERROR,
      handleSocketError
    );
  } catch (error) {
    socket = null;

    notifyError(error);
  }

  /* ==========================================================
     BROADCAST
  ========================================================== */

  const broadcast = (
    payload
  ) => {
    if (
      destroyed ||
      !socket ||
      !connected
    ) {
      return false;
    }

    if (
      !payload ||
      typeof payload !== 'object'
    ) {
      console.warn(
        'SyncDoc collaboration: broadcast payload must be an object.'
      );

      return false;
    }

    try {
      socket.emit(
        EVENTS.UPDATE,
        {
          ...payload,

          /*
           * Always control documentId here instead
           * of trusting the caller.
           */
          documentId:
            normalizedDocumentId,
        }
      );

      return true;
    } catch (error) {
      notifyError(error);

      return false;
    }
  };

  /* ==========================================================
     CONNECT / RECONNECT
  ========================================================== */

  const connect = () => {
    if (
      destroyed ||
      !socket
    ) {
      return false;
    }

    if (socket.connected) {
      connected = true;

      joinDocument();

      return true;
    }

    try {
      socket.connect?.();

      return true;
    } catch (error) {
      notifyError(error);

      return false;
    }
  };

  /* ==========================================================
     DISCONNECT
  ========================================================== */

  const disconnect = () => {
    if (
      destroyed ||
      !socket
    ) {
      return false;
    }

    try {
      leaveDocument();

      socket.disconnect();

      connected = false;

      return true;
    } catch (error) {
      notifyError(error);

      return false;
    }
  };

  /* ==========================================================
     DESTROY
  ========================================================== */

  const destroy = () => {
    if (destroyed) {
      return;
    }

    /*
     * Leave first while the socket is still available.
     */
    leaveDocument();

    destroyed = true;
    connected = false;
    joined = false;

    if (!socket) {
      return;
    }

    try {
      /* ------------------------------------------------------
         Remove our listeners only.
      ------------------------------------------------------ */

      socket.off(
        EVENTS.CONNECT,
        handleConnect
      );

      socket.off(
        EVENTS.DISCONNECT,
        handleDisconnect
      );

      socket.off(
        EVENTS.PRESENCE,
        handlePresence
      );

      socket.off(
        EVENTS.UPDATE,
        handleDocumentUpdate
      );

      socket.off(
        EVENTS.CONNECT_ERROR,
        handleConnectError
      );

      socket.off(
        EVENTS.ERROR,
        handleSocketError
      );

      socket.disconnect();
    } catch (error) {
      console.warn(
        'SyncDoc collaboration cleanup failed:',
        error
      );
    }

    socket = null;
  };

  /* ==========================================================
     PROVIDER API
  ========================================================== */

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

/* ============================================================
   EMPTY PROVIDER
============================================================ */

/**
 * Safe no-op provider.
 *
 * This prevents calling components from crashing when
 * Socket.io is unavailable or the document ID is invalid.
 */
function createEmptyProvider(
  error = null
) {
  return {
    broadcast() {
      return false;
    },

    connect() {
      return false;
    },

    reconnect() {
      return false;
    },

    disconnect() {
      return false;
    },

    destroy() { },

    join() {
      return false;
    },

    leave() {
      return false;
    },

    isConnected() {
      return false;
    },

    getSocket() {
      return null;
    },

    getDocumentId() {
      return '';
    },

    error,
  };
}

export default createCollaborationProvider;