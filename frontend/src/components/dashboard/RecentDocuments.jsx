
import React from 'react';
import { Link } from 'react-router-dom';

import Avatar from '../common/Avatar';
import Skeleton from '../common/Skeleton';

const getDocumentId = (document) => {
  if (!document) {
    return null;
  }

  return document.id || document._id || document.documentId || null;
};

const getDocumentTitle = (document) => {
  if (!document) {
    return 'Untitled Document';
  }

  return (
    document.title ||
    document.name ||
    document.documentTitle ||
    'Untitled Document'
  );
};

const getUserName = (user) => {
  if (!user) {
    return 'You';
  }

  if (typeof user === 'string') {
    return user;
  }

  return (
    user.displayName ||
    user.username ||
    user.name ||
    user.email ||
    'You'
  );
};

const getCollaborators = (collaborators) => {
  if (!Array.isArray(collaborators)) {
    return [];
  }

  return collaborators.filter(Boolean);
};

const getCollaboratorCount = (collaborators) => {
  if (Array.isArray(collaborators)) {
    return collaborators.length;
  }

  if (
    typeof collaborators === 'number' &&
    Number.isFinite(collaborators)
  ) {
    return Math.max(0, collaborators);
  }

  return 0;
};

const formatUpdatedAt = (value) => {
  if (!value) {
    return 'Recently';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getDocumentInitial = (title) => {
  const normalizedTitle = String(title || '').trim();

  if (!normalizedTitle) {
    return 'D';
  }

  return normalizedTitle.charAt(0).toUpperCase();
};

function DocumentSkeleton() {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Owner</th>
            <th>Updated</th>
            <th>Collaborators</th>
          </tr>
        </thead>

        <tbody>
          {Array.from({ length: 4 }, (_, index) => (
            <tr key={index}>
              <td>
                <div className="document-skeleton">
                  <Skeleton
                    width={34}
                    height={34}
                    radius={8}
                  />

                  <Skeleton
                    width="160px"
                    height={14}
                    radius={6}
                  />
                </div>
              </td>

              <td>
                <Skeleton
                  width="100px"
                  height={14}
                  radius={6}
                />
              </td>

              <td>
                <Skeleton
                  width="90px"
                  height={14}
                  radius={6}
                />
              </td>

              <td>
                <div className="people-count">
                  <Skeleton
                    width={28}
                    height={28}
                    radius="50%"
                  />

                  <Skeleton
                    width={20}
                    height={14}
                    radius={6}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyDocuments() {
  return (
    <div className="empty-state" role="status">
      <div
        className="empty-state-icon"
        aria-hidden="true"
      >
        📄
      </div>

      <strong>No recent documents</strong>

      <p>
        Documents you create or collaborate on will
        appear here.
      </p>

      <Link
        to="/documents"
        className="empty-state-action"
      >
        Open Documents
      </Link>
    </div>
  );
}

function DocumentsError({ onRetry }) {
  return (
    <div className="empty-state" role="alert">
      <div
        className="empty-state-icon"
        aria-hidden="true"
      >
        ⚠
      </div>

      <strong>
        Unable to load documents
      </strong>

      <p>
        Something went wrong while loading your
        recent documents.
      </p>

      {typeof onRetry === 'function' && (
        <button
          type="button"
          className="text-btn"
          onClick={onRetry}
        >
          Try again
        </button>
      )}
    </div>
  );
}

function CollaboratorAvatars({ collaborators, count }) {
  const safeCollaborators =
    getCollaborators(collaborators);

  const visibleCollaborators =
    safeCollaborators.slice(0, 3);

  if (visibleCollaborators.length === 0) {
    return (
      <div className="people-count">
        <Avatar
          name="Team"
          size="xs"
        />

        <span>
          {count}
        </span>
      </div>
    );
  }

  return (
    <div
      className="people-count"
      title={`${count} collaborator${count === 1 ? '' : 's'}`}
    >
      <div className="people-avatars">
        {visibleCollaborators.map(
          (collaborator, index) => (
            <Avatar
              key={
                collaborator.id ||
                collaborator._id ||
                collaborator.email ||
                index
              }
              name={getUserName(collaborator)}
              size="xs"
            />
          )
        )}
      </div>

      <span>
        {count}
      </span>
    </div>
  );
}

function RecentDocuments({
  documents = [],
  loading = false,
  error = null,
  onRetry,
  maxItems = 5,
  showViewAll = true,
}) {
  const safeDocuments = Array.isArray(documents)
    ? documents.slice(0, maxItems)
    : [];

  return (
    <section className="recent-documents">
      <div className="section-header">
        <div className="section-header-content">
          <span className="eyebrow">
            DOCUMENTS
          </span>

          <h2>
            Recent Documents
          </h2>

          <p className="section-description">
            Your latest workspace documents.
          </p>
        </div>

        {showViewAll && (
          <Link
            to="/documents"
            className="view-all"
            aria-label="View all documents"
          >
            View all
          </Link>
        )}
      </div>

      {error ? (
        <DocumentsError
          onRetry={onRetry}
        />
      ) : loading ? (
        <DocumentSkeleton />
      ) : safeDocuments.length === 0 ? (
        <EmptyDocuments />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">
              Recent SyncDoc documents
            </caption>

            <thead>
              <tr>
                <th scope="col">
                  Document
                </th>

                <th scope="col">
                  Owner
                </th>

                <th scope="col">
                  Updated
                </th>

                <th scope="col">
                  Collaborators
                </th>
              </tr>
            </thead>

            <tbody>
              {safeDocuments.map(
                (document, index) => {
                  const documentId =
                    getDocumentId(document);

                  const title =
                    getDocumentTitle(document);

                  const owner =
                    getUserName(
                      document?.owner
                    );

                  const collaborators =
                    getCollaborators(
                      document?.collaborators
                    );

                  const collaboratorCount =
                    getCollaboratorCount(
                      document?.collaborators
                    );

                  const fallbackId =
                    `document-${index}`;

                  const routeId =
                    documentId || fallbackId;

                  return (
                    <tr
                      key={routeId}
                    >
                      <td>
                        <Link
                          className="doc-name"
                          to={`/documents/${routeId}`}
                          title={`Open ${title}`}
                        >
                          <span
                            className="file-icon"
                            aria-hidden="true"
                          >
                            {getDocumentInitial(
                              title
                            )}
                          </span>

                          <span className="doc-name-text">
                            {title}
                          </span>
                        </Link>
                      </td>

                      <td>
                        <div className="document-owner">
                          <Avatar
                            name={owner}
                            size="xs"
                          />

                          <span>
                            {owner}
                          </span>
                        </div>
                      </td>

                      <td>
                        <time
                          dateTime={
                            document?.updatedAt ||
                            undefined
                          }
                        >
                          {formatUpdatedAt(
                            document?.updatedAt
                          )}
                        </time>
                      </td>

                      <td>
                        <CollaboratorAvatars
                          collaborators={
                            collaborators
                          }
                          count={
                            collaboratorCount
                          }
                        />
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default RecentDocuments;

