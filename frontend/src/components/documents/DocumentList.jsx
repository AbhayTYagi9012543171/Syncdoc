
import React from 'react';
import './DocumentPremium.css';
import { Link } from 'react-router-dom';

import Avatar from '../common/Avatar';
import EmptyState from '../common/EmptyState';
import Skeleton from '../common/Skeleton';

function getUserName(user) {
  if (!user) {
    return 'You';
  }

  if (typeof user === 'string') {
    return user.trim() || 'You';
  }

  if (typeof user === 'object') {
    return (
      user.displayName ||
      user.username ||
      user.name ||
      user.fullName ||
      user.email ||
      'You'
    );
  }

  return 'You';
}

function getDocumentId(document, index) {
  return (
    document?.id ||
    document?._id ||
    document?.documentId ||
    `document-${index}`
  );
}

function getDocumentTitle(document) {
  if (!document) {
    return 'Untitled Document';
  }

  if (
    typeof document.title === 'string' &&
    document.title.trim()
  ) {
    return document.title.trim();
  }

  if (
    typeof document.name === 'string' &&
    document.name.trim()
  ) {
    return document.name.trim();
  }

  return 'Untitled Document';
}

function getCollaboratorCount(collaborators) {
  if (Array.isArray(collaborators)) {
    return collaborators.length;
  }

  if (
    typeof collaborators === 'number' &&
    Number.isFinite(collaborators)
  ) {
    return collaborators;
  }

  return 0;
}

function formatDate(value) {
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
  }).format(date);
}

function getUpdatedValue(document) {
  return (
    document?.updatedAt ||
    document?.modifiedAt ||
    document?.createdAt
  );
}

function getOwner(document) {
  return (
    document?.owner ||
    document?.createdBy ||
    null
  );
}

function DocumentListSkeleton({ count = 6 }) {
  return (
    <div
      className="table-wrap document-list-loading"
      aria-busy="true"
      aria-label="Loading documents"
    >
      <table className="data-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Owner</th>
            <th>Updated</th>
            <th>Collaborators</th>
            <th aria-label="Actions" />
          </tr>
        </thead>

        <tbody>
          {Array.from(
            { length: count },
            (_, index) => (
              <tr key={`skeleton-${index}`}>
                <td>
                  <div className="document-list-skeleton-document">
                    <Skeleton
                      width={34}
                      height={34}
                      radius={8}
                    />

                    <Skeleton
                      width={150}
                      height={16}
                      radius={6}
                    />
                  </div>
                </td>

                <td>
                  <Skeleton
                    width={100}
                    height={15}
                    radius={6}
                  />
                </td>

                <td>
                  <Skeleton
                    width={90}
                    height={15}
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
                      width={25}
                      height={14}
                      radius={6}
                    />
                  </div>
                </td>

                <td>
                  <Skeleton
                    width={30}
                    height={30}
                    radius={7}
                  />
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentList({
  documents = [],
  loading = false,
  skeletonCount = 6,
  onOpen,
  onEdit,
  onDelete,
  onMore,
  className = '',
  emptyTitle = 'No documents found',
  emptyDescription =
    'Create your first document to start working.',
  emptyIcon = '□',
}) {
  if (loading) {
    return (
      <DocumentListSkeleton
        count={skeletonCount}
      />
    );
  }

  const safeDocuments = Array.isArray(documents)
    ? documents.filter(Boolean)
    : [];

  if (safeDocuments.length === 0) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  const classes = [
    'table-wrap',
    'document-list',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleOpen = document => {
    if (typeof onOpen === 'function') {
      onOpen(document);
    }
  };

  const handleMore = (event, document) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onMore === 'function') {
      onMore(document, event);
    }
  };

  const handleEdit = (event, document) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onEdit === 'function') {
      onEdit(document);
    }
  };

  const handleDelete = (event, document) => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onDelete === 'function') {
      onDelete(document);
    }
  };

  return (
    <div className={classes}>
      <table className="data-table">
        <caption className="sr-only">
          Workspace documents
        </caption>

        <thead>
          <tr>
            <th scope="col">Document</th>
            <th scope="col">Owner</th>
            <th scope="col">Updated</th>
            <th scope="col">Collaborators</th>
            <th scope="col" aria-label="Actions" />
          </tr>
        </thead>

        <tbody>
          {safeDocuments.map(
            (document, index) => {
              const documentId =
                getDocumentId(
                  document,
                  index
                );

              const title =
                getDocumentTitle(document);

              const owner =
                getOwner(document);

              const ownerName =
                getUserName(owner);

              const collaboratorCount =
                getCollaboratorCount(
                  document?.collaborators ||
                    document?.members
                );

              const updatedAt =
                formatDate(
                  getUpdatedValue(document)
                );

              const documentPath =
                documentId.startsWith(
                  'document-'
                )
                  ? '/documents'
                  : `/documents/${documentId}`;

              return (
                <tr
                  key={documentId}
                  className="document-list-row"
                >
                  <td>
                    <Link
                      className="doc-name"
                      to={documentPath}
                      onClick={() =>
                        handleOpen(document)
                      }
                      title={title}
                    >
                      <span
                        className="file-icon"
                        aria-hidden="true"
                      >
                        📄
                      </span>

                      <span className="doc-name-text">
                        {title}
                      </span>
                    </Link>
                  </td>

                  <td>
                    <div className="document-owner">
                      <Avatar
                        user={
                          typeof owner ===
                          'object'
                            ? owner
                            : undefined
                        }
                        name={ownerName}
                        size="xs"
                      />

                      <span>
                        {ownerName}
                      </span>
                    </div>
                  </td>

                  <td>
                    <time
                      dateTime={
                        document?.updatedAt ||
                        document?.modifiedAt ||
                        document?.createdAt ||
                        undefined
                      }
                      title={
                        document?.updatedAt ||
                        document?.modifiedAt ||
                        document?.createdAt ||
                        undefined
                      }
                    >
                      {updatedAt}
                    </time>
                  </td>

                  <td>
                    <div
                      className="people-count"
                      aria-label={`${collaboratorCount} collaborators`}
                    >
                      <Avatar
                        name="Team"
                        size="xs"
                      />

                      <span>
                        {collaboratorCount}
                      </span>
                    </div>
                  </td>

                  <td>
                    <div className="document-list-actions">
                      {onEdit && (
                        <button
                          type="button"
                          className="document-action-button"
                          onClick={event =>
                            handleEdit(
                              event,
                              document
                            )
                          }
                          aria-label={`Edit ${title}`}
                        >
                          Edit
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          className="document-action-button danger"
                          onClick={event =>
                            handleDelete(
                              event,
                              document
                            )
                          }
                          aria-label={`Delete ${title}`}
                        >
                          Delete
                        </button>
                      )}

                      {onMore && (
                        <button
                          type="button"
                          className="more"
                          onClick={event =>
                            handleMore(
                              event,
                              document
                            )
                          }
                          aria-label={`More options for ${title}`}
                          title="More options"
                        >
                          ⋯
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DocumentList;

