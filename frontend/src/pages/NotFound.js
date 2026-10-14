import "./pages-premium.css";
import "./not-found-premium.css";

import React, { useCallback, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clipboard,
  Compass,
  FileQuestion,
  FolderOpen,
  Home,
  Search,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";

const MAX_PATH_LENGTH = 180;

function getDisplayPath(location) {
  const pathname = location?.pathname || "/";
  const search = location?.search || "";
  const hash = location?.hash || "";
  const fullPath = `${pathname}${search}${hash}`;

  return fullPath.length > MAX_PATH_LENGTH
    ? `${fullPath.slice(0, MAX_PATH_LENGTH - 1)}…`
    : fullPath;
}

export default function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const requestedPath = useMemo(
    () => getDisplayPath(location),
    [location.pathname, location.search, location.hash]
  );

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleCopyPath = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(requestedPath);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [requestedPath]);

  return (
    <main className="not-found not-found-premium">
      {/* Decorative background */}
      <div className="not-found-background" aria-hidden="true">
        <span className="not-found-orb not-found-orb-one" />
        <span className="not-found-orb not-found-orb-two" />
        <span className="not-found-grid" />
        <span className="not-found-ring not-found-ring-one" />
        <span className="not-found-ring not-found-ring-two" />
      </div>

      <div className="not-found-shell">
        {/* Brand */}
        <header className="not-found-topbar">
          <Link
            to="/"
            className="not-found-brand"
            aria-label="SyncDoc home"
          >
            <span className="not-found-brand-mark" aria-hidden="true">
              S
            </span>
            <span className="not-found-brand-name">
              SyncDoc<span>.</span>
            </span>
          </Link>

          <div className="not-found-topbar-badge">
            <span className="not-found-live-dot" />
            Workspace navigation
          </div>
        </header>

        {/* Main content */}
        <section
          className="not-found-content"
          aria-labelledby="not-found-title"
        >
          <div className="not-found-visual" aria-hidden="true">
            <div className="not-found-visual-glow" />

            <div className="not-found-code-wrapper">
              <span className="not-found-code-shadow">404</span>
              <span className="not-found-code">404</span>
            </div>

            <div className="not-found-floating-icon not-found-floating-icon-file">
              <FileQuestion size={25} />
            </div>

            <div className="not-found-floating-icon not-found-floating-icon-folder">
              <FolderOpen size={23} />
            </div>

            <div className="not-found-floating-icon not-found-floating-icon-search">
              <Search size={20} />
            </div>

            <div className="not-found-visual-caption">
              <Compass size={14} />
              <span>Looks like you took a wrong turn</span>
            </div>
          </div>

          <div className="not-found-message">
            <span className="not-found-eyebrow">
              <Sparkles size={14} />
              PAGE NOT FOUND
            </span>

            <h1 id="not-found-title">
              This page is
              <br />
              <span>out of sync.</span>
            </h1>

            <p>
              We couldn’t find the page you were looking for.
              It may have moved, the link may be outdated,
              or the address might contain a typo.
            </p>
          </div>

          {/* Primary navigation */}
          <div className="not-found-actions">
            <Link
              className="not-found-action not-found-action-primary"
              to="/dashboard"
            >
              <Home size={17} aria-hidden="true" />
              <span>Back to dashboard</span>
              <ArrowRight
                className="not-found-action-arrow"
                size={17}
                aria-hidden="true"
              />
            </Link>

            <Link
              className="not-found-action not-found-action-secondary"
              to="/documents"
            >
              <FolderOpen size={17} aria-hidden="true" />
              <span>Browse documents</span>
            </Link>
          </div>

          {/* Helpful navigation */}
          <div className="not-found-quick-links">
            <span className="not-found-quick-label">
              Or try one of these
            </span>

            <div className="not-found-quick-link-row">
              <button
                type="button"
                className="not-found-quick-link"
                onClick={handleGoBack}
              >
                <ArrowLeft size={15} aria-hidden="true" />
                Go back
              </button>

              <span className="not-found-quick-divider" aria-hidden="true" />

              <Link to="/" className="not-found-quick-link">
                <Home size={15} aria-hidden="true" />
                Homepage
              </Link>

              <span className="not-found-quick-divider" aria-hidden="true" />

              <Link to="/workspaces" className="not-found-quick-link">
                <FolderOpen size={15} aria-hidden="true" />
                Workspaces
              </Link>
            </div>
          </div>

          {/* Requested route */}
          <section
            className="not-found-path-card"
            aria-label="Requested page details"
          >
            <div className="not-found-path-icon" aria-hidden="true">
              <ShieldAlert size={18} />
            </div>

            <div className="not-found-path-content">
              <span className="not-found-path-label">
                Requested address
              </span>
              <code title={requestedPath}>{requestedPath}</code>
            </div>

            <button
              type="button"
              className="not-found-copy-button"
              onClick={handleCopyPath}
              aria-label="Copy requested address"
              title="Copy requested address"
            >
              {copied ? (
                <>
                  <Check size={15} aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Clipboard size={15} aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </section>

          <div className="not-found-help">
            <span className="not-found-help-icon" aria-hidden="true">
              <Sparkles size={17} />
            </span>
            <div>
              <strong>Everything you need is still in SyncDoc.</strong>
              <p>
                Head back to your workspace to find your documents
                and continue where you left off.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="not-found-footer">
          <div className="not-found-footer-brand">
            <span className="not-found-footer-dot" />
            SyncDoc workspace
          </div>

          <span className="not-found-footer-message">
            Made for focused work. Built to stay in sync.
          </span>

          <span className="not-found-footer-year">
            © {new Date().getFullYear()} SyncDoc
          </span>
        </footer>
      </div>
    </main>
  );
}