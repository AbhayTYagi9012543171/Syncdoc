import { io } from "socket.io-client";
import { getApiBaseUrl, getAuthToken } from "./api";

/**
 * Socket.IO transport for presence and collaboration events.
 *
 * Set REACT_APP_SOCKET_URL when the socket server uses a different
 * origin. By default this derives the origin from REACT_APP_API_URL,
 * removing the trailing /api path.
 */
export function getSocketBaseUrl() {
  const configured = process.env.REACT_APP_SOCKET_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const apiUrl = getApiBaseUrl();
  try {
    const parsed = new URL(apiUrl, window.location.origin);
    parsed.pathname = parsed.pathname.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/+$/, "");
  } catch {
    return apiUrl.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }
}

/**
 * Create a Socket.IO connection. The caller owns its lifecycle and should
 * call socket.disconnect() when the component/service is no longer needed.
 * Backend currently expects the `authenticate` event with userId and token.
 */
export function createCollaborationSocket({
  userId,
  token = getAuthToken(),
  autoConnect = true,
  onConnect,
  onDisconnect,
  onConnectError,
} = {}) {
  const socket = io(getSocketBaseUrl(), {
    autoConnect: false,
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });

  if (typeof onConnect === "function") socket.on("connect", onConnect);
  if (typeof onDisconnect === "function") socket.on("disconnect", onDisconnect);
  if (typeof onConnectError === "function") socket.on("connect_error", onConnectError);

  if (userId && token) {
    socket.on("connect", () => {
      socket.emit("authenticate", { userId: String(userId), token: String(token) });
    });
  }

  if (autoConnect) socket.connect();

  return socket;
}

const collaborationService = {
  getSocketBaseUrl,
  createSocket: createCollaborationSocket,
};

export default collaborationService;
