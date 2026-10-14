
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

import config from "../config";
import { getAuthToken } from "../services/api";

/* ============================================================
   SYNCDOC — YJS COLLABORATION PROVIDER
   ============================================================ */

function normalizeDocumentId(documentId) {
  if (
    documentId === undefined ||
    documentId === null ||
    String(documentId).trim() === ""
  ) {
    throw new Error(
      "SyncDoc collaboration requires a document ID."
    );
  }

  return String(documentId).trim();
}

function getWebSocketBaseUrl() {
  const configuredUrl = config.yjsUrl || config.socketUrl;

  if (!configuredUrl) {
    throw new Error(
      "SyncDoc WebSocket URL is not configured."
    );
  }

  const url = String(configuredUrl)
    .trim()
    .replace(/\/+$/, "")
    .replace(/^https:/i, "wss:")
    .replace(/^http:/i, "ws:");

  if (!/^wss?:\/\//i.test(url)) {
    throw new Error(
      "Invalid SyncDoc WebSocket URL configuration."
    );
  }

  return url;
}

/**
 * Create a Yjs WebSocket provider.
 *
 * Supported:
 * createCollaborationProvider(documentId, ydoc, options)
 * createCollaborationProvider({
 *   documentId,
 *   ydoc,
 *   token,
 *   options
 * })
 *
 * Pass the same Y.Doc instance that the editor uses.
 */
export function createCollaborationProvider(
  documentIdOrConfig,
  suppliedYdoc,
  suppliedOptions = {}
) {
  let documentId;
  let ydoc;
  let options;
  let explicitToken;

  if (
    documentIdOrConfig &&
    typeof documentIdOrConfig === "object" &&
    !(documentIdOrConfig instanceof Y.Doc)
  ) {
    const input = documentIdOrConfig;

    documentId = input.documentId || input.docId;
    ydoc = input.ydoc || input.doc;
    options = input.options || {};
    explicitToken = input.token;
  } else {
    documentId = documentIdOrConfig;
    ydoc = suppliedYdoc;
    options = suppliedOptions || {};
    explicitToken = options.token;
  }

  documentId = normalizeDocumentId(documentId);

  if (!(ydoc instanceof Y.Doc)) {
    throw new Error(
      "A valid Y.Doc instance is required for collaboration."
    );
  }

  const token = explicitToken || getAuthToken();

  if (!token) {
    throw new Error(
      "A valid authentication token is required for collaboration."
    );
  }

  const serverUrl = getWebSocketBaseUrl();

  const provider = new WebsocketProvider(
    serverUrl,
    documentId,
    ydoc,
    {
      connect: options.connect !== false,
      resyncInterval: options.resyncInterval || 5000,
      maxBackoffTime: options.maxBackoffTime || 2500,

      // Backend expects JWT in the WebSocket query string.
      params: {
        ...(options.params || {}),
        token,
      },
    }
  );

  return provider;
}

export function destroyCollaborationProvider(provider) {
  if (!provider) return;

  try {
    provider.disconnect();
  } catch (error) {
    console.warn(
      "SyncDoc: error disconnecting collaboration provider.",
      error
    );
  }

  try {
    provider.destroy();
  } catch (error) {
    console.warn(
      "SyncDoc: error destroying collaboration provider.",
      error
    );
  }
}

export default createCollaborationProvider;
