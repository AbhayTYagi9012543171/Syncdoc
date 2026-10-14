import "./pages-premium.css";
import React, { useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  FileQuestion,
  Home,
  Search,
  ShieldAlert,
} from "lucide-react";
import {
  Link,
  useLocation,
} from "react-router-dom";

/* ============================================================
   CONSTANTS
============================================================ */

const MAX_PATH_LENGTH = 180;

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely format the requested route for display.
 *
 * The path is displayed as text only and is never rendered
 * as HTML, preventing markup injection.
 */
function getDisplayPath(location) {
  const pathname =
    location?.pathname || "";

  const search =
    location?.search || "";

  const hash =
    location?.hash || "";

  const fullPath =
    `${pathname}${search}${hash}`;

  if (!fullPath) {
    return "/";
  }

  if (
    fullPath.length <=
    MAX_PATH_LENGTH
  ) {
    return fullPath;
  }

  return (
    `${fullPath.slice(
      0,
      MAX_PATH_LENGTH - 1
    )}…`
  );
}

/* ============================================================
   NOT FOUND PAGE
============================================================ */

export default function NotFound() {
  const location = useLocation();

  const requestedPath = useMemo(
    () => getDisplayPath(location),
    [location]
  );

  return (
    <main
      className="not-found"
      role="main"
      aria-labelledby="not-found-title"
    >
      {/* ======================================================
          DECORATIVE BACKGROUND
      ====================================================== */}

      <div
        className="not-found-background"
        aria-hidden="true"
      >
        <span className="not-found-orb not-found-orb-one" />
        <span className="not-found-orb not-found-orb-two" />
        <span className="not-found-grid" />
      </div>

      {/* ======================================================
          CONTENT
      ====================================================== */}

      <section className="not-found-content">
        {/* ====================================================
            BRAND
        ==================================================== */}

        <Link
          to="/"
          className="not-found-brand"
          aria-label="Go to SyncDoc home"
        >
          <span
            className="brand-mark"
            aria-hidden="true"
          >
            S
          </span>

          <span className="brand-name">
            SyncDoc
          </span>
        </Link>

        {/* ====================================================
            ERROR VISUAL
        ==================================================== */}

        <div className="not-found-visual">
          <div
            className="not-found-code-wrapper"
            aria-hidden="true"
          >
            <span className="not-found-code">
              404
            </span>

            <span
              className="not-found-code-shadow"
            >
              404
            </span>
          </div>

          <div
            className="not-found-error-icon"
            aria-hidden="true"
          >
            <FileQuestion
              size={28}
            />
          </div>
        </div>

        {/* ====================================================
            MESSAGE
        ==================================================== */}

        <div className="not-found-message">
          <span className="eyebrow">
            PAGE NOT FOUND
          </span>

          <h1 id="not-found-title">
            This page is out of sync.
          </h1>

          <p>
            The page you're looking for
            doesn't exist, has been moved,
            or may no longer be available.
          </p>
        </div>

        {/* ====================================================
            ACTIONS
        ==================================================== */}

        <div className="not-found-actions">
          <Link
            className="btn btn-primary"
            to="/dashboard"
          >
            <Home
              size={16}
              aria-hidden="true"
            />

            <span>
              Back to dashboard
            </span>
          </Link>

          <Link
            className="btn btn-secondary"
            to="/documents"
          >
            <Search
              size={16}
              aria-hidden="true"
            />

            <span>
              Browse documents
            </span>
          </Link>
        </div>

        {/* ====================================================
            SECONDARY NAVIGATION
        ==================================================== */}

        <div className="not-found-secondary-actions">
          <Link
            to="/"
            className="not-found-secondary-link"
          >
            <ArrowLeft
              size={15}
              aria-hidden="true"
            />

            <span>
              Go to homepage
            </span>
          </Link>

          <span
            className="not-found-secondary-divider"
            aria-hidden="true"
          >
            /
          </span>

          <Link
            to="/dashboard"
            className="not-found-secondary-link"
          >
            <span>
              Workspace
            </span>

            <ArrowRight
              size={15}
              aria-hidden="true"
            />
          </Link>
        </div>

        {/* ====================================================
            REQUESTED PATH
        ==================================================== */}

        <div
          className="not-found-path"
          aria-label={`Requested path: ${requestedPath}`}
        >
          <div className="not-found-path-label">
            <ShieldAlert
              size={14}
              aria-hidden="true"
            />

            <span>
              Requested path
            </span>
          </div>

          <code>
            {requestedPath}
          </code>
        </div>

        {/* ====================================================
            HELP MESSAGE
        ==================================================== */}

        <div className="not-found-help">
          <strong>
            Need help finding something?
          </strong>

          <span>
            Return to your workspace and
            continue where you left off.
          </span>
        </div>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <footer className="not-found-footer">
          <span
            className="status-dot"
            aria-hidden="true"
          />

          <span>
            SyncDoc workspace
          </span>

          <span
            className="not-found-divider"
            aria-hidden="true"
          >
            •
          </span>

          <span>
            Everything in sync
          </span>
        </footer>
      </section>
    </main>
  );
}