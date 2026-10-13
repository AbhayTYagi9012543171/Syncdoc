
import React, { useMemo, useState } from 'react';

import Avatar from '../common/Avatar';
import Button from '../common/Button';
import Modal from '../common/Modal';

const FALLBACK_VERSIONS = [];

function getAuthor(version) {
  return (
    version?.author ||
    version?.createdBy ||
    version?.user ||
    version?.owner ||
    'You'
  );
}

function getAuthorName(author) {
  if (!author) {
    return 'You';
  }

  if (typeof author === 'string') {
    return author.trim() || 'You';
  }

  return (
    author.displayName ||
    author.username ||
    author.name ||
    author.fullName ||
    author.email ||
    'You'
  );
}

function getVersionId(version, index) {
  return (
    version?.id ||
    version?._id ||
    version?.versionId ||
    `version-${index}`
  );
}

function getVersionAction(version) {
  return (
    version?.action ||
    version?.message ||
    version?.description ||
    'Document updated'
  );
}

function getVersionDate(version) {
  return (
    version?.createdAt ||
    version?.updatedAt ||
    version?.timestamp ||
    version?.date ||
    null
  );
}

function formatVersionDate(value) {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function normalizeVersions(versions) {
  if (!Array.isArray(versions)) {
    return [];
  }

  return versions.filter(Boolean);
}

export default function VersionHistory({
  open = false,
  onClose,
  versions: versionsProp,
  onRestore,
  loading = false,
  title = 'Version history',
}) {
  const [restoringId, setRestoringId] = useState(null);

  const versions = useMemo(() => {
    if (Array.isArray(versionsProp)) {
      return normalizeVersions(versionsProp);
    }

    return [];
  }, [versionsProp]);

  const handleRestore = async (version) => {
    if (
      typeof onRestore !== 'function' ||
      !version ||
      restoringId
    ) {
      return;
    }

    const versionId = getVersionId(version, 0);

    try {
      setRestoringId(versionId);
      await onRestore(version);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div
        className="version-history"
        aria-live="polite"
      >
        {loading ? (
          <div
            className="version-empty"
            role="status"
          >
            <span
              className="loading-spinner"
              aria-hidden="true"
            />
            <p>Loading version history...</p>
          </div>
        ) : versions.length === 0 ? (
          <div
            className="version-empty"
            role="status"
          >
            <span
              className="version-empty-icon"
              aria-hidden="true"
            >
              ◷
            </span>

            <strong>No version history yet</strong>

            <p>
              Changes to this document will appear here
              automatically.
            </p>
          </div>
        ) : (
          <div className="version-list">
            {versions.map((version, index) => {
              const versionId = getVersionId(
                version,
                index
              );

              const author = getAuthor(version);
              const authorName =
                getAuthorName(author);

              const action =
                getVersionAction(version);

              const dateValue =
                getVersionDate(version);

              const formattedDate =
                formatVersionDate(dateValue);

              const isLatest = index === 0;
              const isRestoring =
                restoringId === versionId;

              return (
                <article
                  className={`version-item ${
                    isLatest
                      ? 'version-item-latest'
                      : ''
                  }`}
                  key={versionId}
                >
                  <div className="version-marker">
                    <span
                      className="version-dot"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="version-author">
                    <Avatar
                      user={
                        typeof author === 'object'
                          ? author
                          : undefined
                      }
                      name={authorName}
                      size="sm"
                    />
                  </div>

                  <div className="version-content">
                    <div className="version-main">
                      <strong
                        className="version-action"
                        title={action}
                      >
                        {action}
                      </strong>

                      {isLatest && (
                        <span className="version-badge">
                          Latest
                        </span>
                      )}
                    </div>

                    <small className="version-meta">
                      {authorName}
                      {' · '}
                      {formattedDate}
                    </small>
                  </div>

                  {!isLatest &&
                    typeof onRestore ===
                      'function' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={isRestoring}
                        disabled={
                          Boolean(restoringId) ||
                          loading
                        }
                        onClick={() =>
                          handleRestore(version)
                        }
                        aria-label={`Restore version: ${action}`}
                      >
                        {isRestoring
                          ? 'Restoring...'
                          : 'Restore'}
                      </Button>
                    )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}

