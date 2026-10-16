import "./pages-premium.css";
import "./editor-experience.css";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { useParams } from "react-router-dom";

import EditorHeader from "../components/editor/EditorHeader";
import EditorToolbar from "../components/editor/EditorToolbar";
import EditorContent from "../components/editor/EditorContent";
import CommentsPanel from "../components/editor/CommentsPanel";
import VersionHistory from "../components/editor/VersionHistory";
import PresenceIndicator from "../components/editor/PresenceIndicator";
import EditorAIAssistant from "../components/editor/EditorAIAssistant";

import useCollaboration from "../hooks/useCollaboration";
import documentService from "../services/documentService";
import { useAuth } from "../context/AuthContext";

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_TITLE = "Untitled document";
const SAVE_DELAY = 700;
const SHARE_MESSAGE_DURATION = 2200;

/* ============================================================
   HELPERS
============================================================ */

function extractDocument(response) {
  if (!response) {
    return null;
  }

  /*
   * Supports multiple common API response structures:
   *
   * { document: {...} }
   * { data: { document: {...} } }
   * { data: { data: { document: {...} } } }
   * { data: {...} }
   * {...}
   */

  return (
    response.document ||
    response.data?.document ||
    response.data?.data?.document ||
    response.data?.data ||
    response.data ||
    response
  );
}

function getDocumentId(document) {
  if (!document || typeof document !== "object") {
    return "";
  }

  return String(
    document.id ||
    document._id ||
    document.documentId ||
    ""
  );
}

function getDocumentTitle(document) {
  if (!document || typeof document !== "object") {
    return DEFAULT_TITLE;
  }

  const title =
    document.title ||
    document.name ||
    DEFAULT_TITLE;

  return String(title).trim() || DEFAULT_TITLE;
}

function getDocumentContent(document) {
  if (!document || typeof document !== "object") {
    return "";
  }

  const content =
    document.content ??
    document.html ??
    document.body ??
    "";

  return typeof content === "string"
    ? content
    : "";
}

function getErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

function isOnline() {
  return typeof navigator === "undefined"
    ? true
    : navigator.onLine !== false;
}

/* ============================================================
   EDITOR PAGE
============================================================ */

export default function EditorPage() {
  const { documentId } = useParams();

  /* ==========================================================
     REFS
  ========================================================== */

  const editorRef = useRef(null);
  const editorApiRef = useRef(null);
  const handleEditorReady = useCallback((instance) => {
    editorApiRef.current = instance;
  }, []);

  const saveTimerRef = useRef(null);

  const mountedRef = useRef(true);

  const latestContentRef = useRef("");

  const savedContentRef = useRef("");

  const pendingContentRef = useRef("");

  const saveRequestRef = useRef(null);

  const saveVersionRef = useRef(0);

  const shareTimerRef = useRef(null);

  /*
   * Used to prevent an old request from changing the
   * state of a newer document/save operation.
   */
  const documentKeyRef = useRef(documentId || "");

  /* ==========================================================
     DOCUMENT STATE
  ========================================================== */

  const [title, setTitle] = useState(
    DEFAULT_TITLE
  );

  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);

  const [loadError, setLoadError] = useState("");

  /* ==========================================================
     SAVE STATE
  ========================================================== */

  const [saveStatus, setSaveStatus] =
    useState("saved");

  /*
   * Supported values:
   *
   * loading
   * saved
   * saving
   * unsaved
   * error
   * offline
   */

  /* ==========================================================
     UI STATE
  ========================================================== */

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [shareMessage, setShareMessage] =
    useState("");

  /* ==========================================================
     COLLABORATION
  ========================================================== */

  const { user } = useAuth();
  const {
    ydoc,
    provider,
    connected,
    connecting,
    users,
    error: collaborationError,
    reconnect: reconnectCollaboration,
  } = useCollaboration(documentId, { enabled: !loading && !loadError, user });

  const claimCollaborationSeed = useCallback(
    () => documentService.claimCollaborationSeed(documentId),
    [documentId]
  );

  const documentStats = React.useMemo(() => {
    const plainText = String(content || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    const words = plainText ? plainText.split(" ").filter(Boolean).length : 0;
    const characters = plainText.length;
    return { words, characters, readingMinutes: Math.max(1, Math.ceil(words / 220)) };
  }, [content]);

  /* ==========================================================
     MOUNT / UNMOUNT
  ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (shareTimerRef.current) {
        clearTimeout(shareTimerRef.current);
        shareTimerRef.current = null;
      }
    };
  }, []);

  /* ==========================================================
     DOCUMENT KEY
  ========================================================== */

  useEffect(() => {
    documentKeyRef.current =
      documentId || "";
  }, [documentId]);

  /* ==========================================================
     LOAD DOCUMENT
  ========================================================== */

  useEffect(() => {
    let active = true;

    const loadDocument = async () => {
      if (!documentId) {
        if (active) {
          setLoading(false);
          setLoadError(
            "Document ID is missing."
          );
          setSaveStatus("error");
        }

        return;
      }

      setLoading(true);
      setLoadError("");

      /*
       * Cancel any scheduled save from a previous
       * document before loading another document.
       */
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      /*
       * Reset save tracking for the new document.
       */
      latestContentRef.current = "";
      savedContentRef.current = "";
      pendingContentRef.current = "";

      setSaveStatus("loading");

      try {
        if (!isOnline()) {
          throw new Error(
            "You are currently offline. Please reconnect and try again."
          );
        }

        const response =
          await documentService.get(
            documentId
          );

        if (!active) {
          return;
        }

        const document =
          extractDocument(response);

        if (!document) {
          throw new Error(
            "Document was not found."
          );
        }

        const nextTitle =
          getDocumentTitle(document);

        const nextContent =
          getDocumentContent(document);

        setTitle(nextTitle);
        setContent(nextContent);

        latestContentRef.current =
          nextContent;

        savedContentRef.current =
          nextContent;

        pendingContentRef.current = "";

        setSaveStatus("saved");
      } catch (error) {
        console.error(
          "SyncDoc: failed to load document:",
          error
        );

        if (!active) {
          return;
        }

        setLoadError(
          getErrorMessage(
            error,
            "Unable to load this document."
          )
        );

        setSaveStatus(
          isOnline()
            ? "error"
            : "offline"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDocument();

    return () => {
      active = false;
    };
  }, [documentId]);

  /* ==========================================================
     PERSIST DOCUMENT
  ========================================================== */

  const persistDocument = useCallback(
    async (html) => {
      if (!documentId) {
        return false;
      }

      if (
        typeof documentService.update !==
        "function"
      ) {
        console.error(
          "SyncDoc: documentService.update is not available."
        );

        if (mountedRef.current) {
          setSaveStatus("error");
        }

        return false;
      }

      /*
       * Do not attempt network save while offline.
       */
      if (!isOnline()) {
        pendingContentRef.current = html;

        if (mountedRef.current) {
          setSaveStatus("offline");
        }

        return false;
      }

      const requestDocumentId = documentId;

      /*
       * Every content change receives a monotonically
       * increasing version.
       */
      const requestVersion =
        ++saveVersionRef.current;

      pendingContentRef.current = html;

      /*
       * If another save is already running, don't start
       * another overlapping request.
       *
       * The latest content will be saved immediately
       * after the current request finishes.
       */
      if (saveRequestRef.current) {
        if (mountedRef.current) {
          setSaveStatus("unsaved");
        }

        return false;
      }

      if (mountedRef.current) {
        setSaveStatus("saving");
      }

      const executeSave = async () => {
        try {
          await documentService.update(
            requestDocumentId,
            {
              content: html,
            }
          );

          /*
           * Ignore results belonging to a different
           * document.
           */
          if (
            documentKeyRef.current !==
            requestDocumentId
          ) {
            return true;
          }

          /*
           * Only mark this content as saved if no newer
           * content was created while the request was running.
           */
          const hasNewerChanges =
            saveVersionRef.current !==
            requestVersion;

          if (!hasNewerChanges) {
            savedContentRef.current = html;
            pendingContentRef.current = "";

            if (mountedRef.current) {
              setSaveStatus("saved");
            }

            return true;
          }

          /*
           * A newer edit happened while this request
           * was running. Save the newest version next.
           */
          if (mountedRef.current) {
            setSaveStatus("unsaved");
          }

          return true;
        } catch (error) {
          console.error(
            "SyncDoc: failed to save document:",
            error
          );

          if (
            documentKeyRef.current !==
            requestDocumentId
          ) {
            return false;
          }

          /*
           * Preserve the latest content locally.
           */
          pendingContentRef.current =
            latestContentRef.current;

          if (mountedRef.current) {
            setSaveStatus(
              isOnline()
                ? "error"
                : "offline"
            );
          }

          return false;
        } finally {
          saveRequestRef.current = null;

          /*
           * If the user continued editing while the
           * previous request was running, save the
           * latest content.
           */
          if (
            documentKeyRef.current ===
            requestDocumentId &&
            mountedRef.current &&
            pendingContentRef.current &&
            pendingContentRef.current !==
            savedContentRef.current
          ) {
            const latest =
              pendingContentRef.current;

            /*
             * Schedule instead of recursively calling
             * the request immediately.
             */
            saveTimerRef.current =
              window.setTimeout(() => {
                saveTimerRef.current = null;

                if (
                  mountedRef.current
                ) {
                  persistDocument(
                    latest
                  );
                }
              }, 0);
          }
        }
      };

      const request =
        executeSave();

      saveRequestRef.current =
        request;

      return request;
    },
    [documentId]
  );

  /* ==========================================================
     DEBOUNCED SAVE
  ========================================================== */

  const scheduleSave = useCallback(
    (html) => {
      if (!documentId) {
        return;
      }

      pendingContentRef.current = html;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      if (!isOnline()) {
        setSaveStatus("offline");
        return;
      }

      /*
       * If the current content already matches the
       * last successfully saved version, don't show
       * an unnecessary unsaved state.
       */
      if (
        html === savedContentRef.current
      ) {
        setSaveStatus("saved");
        return;
      }

      setSaveStatus("unsaved");

      saveTimerRef.current =
        window.setTimeout(() => {
          saveTimerRef.current = null;

          if (!mountedRef.current) {
            return;
          }

          persistDocument(html);
        }, SAVE_DELAY);
    },
    [documentId, persistDocument]
  );

  /* ==========================================================
     CONTENT CHANGE
  ========================================================== */

  const handleContentChange =
    useCallback(
      (html) => {
        if (
          typeof html !== "string"
        ) {
          return;
        }

        if (!documentId) {
          return;
        }

        setContent(html);

        latestContentRef.current =
          html;

        pendingContentRef.current =
          html;

        // Live content is synchronized by Yjs through the editor's shared
        // ProseMirror document. REST autosave remains the durable fallback.
        scheduleSave(html);
      },
      [
        documentId,
        scheduleSave,
      ]
    );

  /* ==========================================================
     FORCE SAVE
  ========================================================== */

  const saveNow = useCallback(
    async () => {
      if (!documentId) {
        return false;
      }

      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current
        );

        saveTimerRef.current = null;
      }

      const latest =
        latestContentRef.current;

      if (
        latest ===
        savedContentRef.current
      ) {
        if (mountedRef.current) {
          setSaveStatus("saved");
        }

        return true;
      }

      if (!isOnline()) {
        pendingContentRef.current =
          latest;

        if (mountedRef.current) {
          setSaveStatus("offline");
        }

        return false;
      }

      /*
       * If a request is currently running, the finally
       * handler will detect the newer version and save it.
       */
      if (saveRequestRef.current) {
        pendingContentRef.current =
          latest;

        if (mountedRef.current) {
          setSaveStatus("unsaved");
        }

        return false;
      }

      return persistDocument(latest);
    },
    [documentId, persistDocument]
  );

  /* ==========================================================
     ONLINE / OFFLINE
  ========================================================== */

  useEffect(() => {
    const handleOnline = () => {
      if (!mountedRef.current) {
        return;
      }

      /*
       * Give the browser a moment to restore its network
       * stack before starting the save request.
       */
      window.setTimeout(() => {
        if (!mountedRef.current) {
          return;
        }

        const latest =
          latestContentRef.current;

        if (
          latest &&
          latest !==
          savedContentRef.current
        ) {
          saveNow();
        } else {
          setSaveStatus("saved");
        }
      }, 150);
    };

    const handleOffline = () => {
      if (!mountedRef.current) {
        return;
      }

      if (
        latestContentRef.current !==
        savedContentRef.current
      ) {
        setSaveStatus("offline");
      } else {
        setSaveStatus("offline");
      }
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    if (!isOnline()) {
      setSaveStatus("offline");
    }

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, [saveNow]);

  /* ==========================================================
     BEFORE UNLOAD
  ========================================================== */

  useEffect(() => {
    const handleBeforeUnload =
      (event) => {
        const hasUnsavedChanges =
          latestContentRef.current !==
          savedContentRef.current;

        if (
          hasUnsavedChanges ||
          saveStatus === "saving" ||
          saveStatus === "unsaved"
        ) {
          event.preventDefault();
          event.returnValue = "";
        }
      };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [saveStatus]);

  /* ==========================================================
     EDITOR COMMAND
  ========================================================== */

  const handleCommand =
    useCallback(
      (command, value) => {
        const editor = editorApiRef.current;
        if (!editor || !command) return;

        const chain = editor.chain().focus();
        try {
          if (command === "bold") chain.toggleBold().run();
          else if (command === "italic") chain.toggleItalic().run();
          else if (command === "underline") chain.toggleUnderline().run();
          else if (command === "insertUnorderedList") chain.toggleBulletList().run();
          else if (command === "insertOrderedList") chain.toggleOrderedList().run();
          else if (command === "createLink") {
            const url = value || window.prompt("Enter URL");
            if (url && /^https?:\/\//i.test(url.trim())) {
              chain.extendMarkRange("link").setLink({ href: url.trim() }).run();
            }
          } else if (command === "formatBlock") {
            const block = String(value || "p").toLowerCase();
            if (block === "h1") chain.toggleHeading({ level: 1 }).run();
            else if (block === "h2") chain.toggleHeading({ level: 2 }).run();
            else if (block === "blockquote") chain.toggleBlockquote().run();
            else if (block === "pre") chain.toggleCodeBlock().run();
            else chain.setParagraph().run();
          }
        } catch (error) {
          console.error("SyncDoc: editor command failed:", error);
        }
      },
      []
    );

  /* ==========================================================
     SHARE DOCUMENT
  ========================================================== */

  const handleShare =
    useCallback(async () => {
      if (shareTimerRef.current) {
        clearTimeout(
          shareTimerRef.current
        );

        shareTimerRef.current = null;
      }

      try {
        const url =
          window.location.href;

        if (
          navigator.clipboard &&
          typeof navigator.clipboard
            .writeText === "function"
        ) {
          await navigator.clipboard.writeText(
            url
          );
        } else {
          /*
           * Clipboard fallback.
           */
          const input =
            document.createElement(
              "textarea"
            );

          input.value = url;
          input.setAttribute(
            "readonly",
            ""
          );

          input.style.position =
            "fixed";
          input.style.opacity = "0";
          input.style.pointerEvents =
            "none";

          document.body.appendChild(
            input
          );

          input.focus();
          input.select();

          const copied =
            document.execCommand(
              "copy"
            );

          input.remove();

          if (!copied) {
            throw new Error(
              "Clipboard copy was not supported."
            );
          }
        }

        if (mountedRef.current) {
          setShareMessage(
            "Link copied"
          );
        }
      } catch (error) {
        console.error(
          "SyncDoc: unable to share document:",
          error
        );

        if (mountedRef.current) {
          setShareMessage(
            "Unable to copy link"
          );
        }
      }

      shareTimerRef.current =
        window.setTimeout(() => {
          if (mountedRef.current) {
            setShareMessage("");
          }

          shareTimerRef.current = null;
        }, SHARE_MESSAGE_DURATION);
    }, []);

  /* ==========================================================
     SAVE STATUS LABEL
  ========================================================== */

  const getSaveLabel = useCallback(() => {
    switch (saveStatus) {
      case "loading":
        return "Loading...";

      case "saving":
        return "Saving...";

      case "unsaved":
        return "Unsaved changes";

      case "offline":
        return "Working offline";

      case "error":
        return "Save failed";

      case "saved":
      default:
        return "Saved";
    }
  }, [saveStatus]);

  /* ==========================================================
     RETRY LOAD
  ========================================================== */

  const handleRetryLoad =
    useCallback(() => {
      /*
       * Reloading the browser guarantees that the
       * existing document-loading effect executes again.
       *
       * Keep this intentionally simple because the page
       * does not currently expose a reloadDocument function.
       */
      window.location.reload();
    }, []);

  /* ==========================================================
     LOADING STATE
  ========================================================== */

  if (loading) {
    return (
      <div
        className="editor-page editor-page-loading"
        aria-busy="true"
      >
        <div
          className="editor-loading-state"
          role="status"
          aria-live="polite"
        >
          <span
            className="spinner"
            aria-hidden="true"
          />

          <strong>
            Loading document...
          </strong>

          <span>
            Preparing your workspace
          </span>
        </div>
      </div>
    );
  }

  /* ==========================================================
     ERROR STATE
  ========================================================== */

  if (loadError) {
    return (
      <div className="editor-page editor-page-error">
        <div
          className="editor-error-state"
          role="alert"
        >
          <div
            className="editor-error-icon"
            aria-hidden="true"
          >
            !
          </div>

          <h1>
            Unable to open document
          </h1>

          <p>
            {loadError}
          </p>

          <div className="editor-error-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={
                handleRetryLoad
              }
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div
      className={`editor-page ${connected
        ? "editor-connected"
        : "editor-disconnected"
        }`}
      data-document-id={
        documentId || ""
      }
    >
      <section className="editor-hero" aria-label="Document overview">
        <div className="editor-hero-copy">
          <span className="editor-eyebrow"><span className="editor-eyebrow-dot" /> SYNCdoc WORKSPACE</span>
          <h2>Make space for <span>great ideas.</span></h2>
          <p>Your work, safely saved and ready to create — together.</p>
        </div>
        <div className="editor-metrics" aria-label="Document statistics">
          <div className="editor-metric"><span className="editor-metric-icon">✎</span><span><strong>{documentStats.words.toLocaleString()}</strong><small>Words</small></span></div>
          <div className="editor-metric"><span className="editor-metric-icon">◷</span><span><strong>{documentStats.readingMinutes} min</strong><small>Read time</small></span></div>
          <div className="editor-metric"><span className="editor-metric-icon">◎</span><span><strong>{users?.length || 0}</strong><small>Collaborators</small></span></div>
        </div>
      </section>
      {/* ======================================================
          EDITOR HEADER
      ====================================================== */}

      <EditorHeader
        title={title}
        saved={
          saveStatus === "saved"
        }
        collaborators={users}
        onHistory={() =>
          setHistoryOpen(true)
        }
        onShare={handleShare}
      />

      <EditorAIAssistant documentId={documentId} content={content} />

      {/* ======================================================
          STATUS BAR
      ====================================================== */}

      <div
        className="editor-statusbar"
        role="status"
        aria-live="polite"
      >
        <div className="editor-status-left">
          <PresenceIndicator
            users={users}
          />

          <span
            className={`editor-connection-status ${connected
              ? "is-connected"
              : "is-disconnected"
              }`}
          >
            <span
              className="status-dot"
              aria-hidden="true"
            />

            {connected
              ? "Live collaboration"
              : connecting
                ? "Connecting collaborators…"
                : "Working locally"}
          </span>
          {!connected && !connecting && documentId && (
            <button type="button" className="editor-reconnect-button" onClick={reconnectCollaboration}>
              Reconnect
            </button>
          )}
          {collaborationError && (
            <span className="editor-collaboration-error" title={collaborationError.message}>
              Collaboration unavailable
            </span>
          )}
        </div>

        <div className="editor-status-right">
          <span
            className={`editor-save-status is-${saveStatus}`}
            aria-live="polite"
          >
            {getSaveLabel()}
          </span>

          {shareMessage && (
            <span
              className="editor-share-message"
              role="status"
              aria-live="polite"
            >
              {shareMessage}
            </span>
          )}
        </div>
      </div>

      <div className="editor-workspace-label">
        <div><span className="editor-workspace-kicker">YOUR CANVAS</span><strong>Document editor</strong><span className="editor-workspace-hint">Changes save automatically</span></div>
        <span className="editor-word-count">{documentStats.characters.toLocaleString()} characters</span>
      </div>

      {/* ======================================================
          WORKSPACE
      ====================================================== */}

      <div className="editor-workspace editor-workspace-premium">
        <main
          className="editor-main"
          aria-label="Document editor"
        >
          <EditorToolbar
            onCommand={handleCommand}
          />

          <EditorContent
            ref={editorRef}
            onEditorReady={handleEditorReady}
            initialContent={content}
            ydoc={ydoc}
            provider={provider}
            user={user}
            claimSeed={claimCollaborationSeed}
            onInput={handleContentChange}
          />
        </main>

        <CommentsPanel />
      </div>

      {/* ======================================================
          VERSION HISTORY
      ====================================================== */}

      <VersionHistory
        open={historyOpen}
        onClose={() =>
          setHistoryOpen(false)
        }
      />

      {/* ======================================================
          ACCESSIBILITY STATUS
      ====================================================== */}

      <span
        className="sr-only"
        aria-live="polite"
      >
        {connected
          ? "Collaboration connected."
          : "Collaboration disconnected."}

        {" "}

        {getSaveLabel()}

        {shareMessage
          ? ` ${shareMessage}.`
          : ""}
      </span>
    </div>
  );
}

