
import React from 'react';
import { Link } from 'react-router-dom';

import Avatar from '../common/Avatar';
import Skeleton from '../common/Skeleton';

const MAX_VISIBLE_COLLABORATORS = 4;

function getUserName(user) {
  if (!user) {
    return 'User';
  }

  if (typeof user === 'string') {
    return user.trim() || 'User';
  }

  if (typeof user === 'object') {
    return (
      user.displayName ||
      user.username ||
      user.name ||
      user.fullName ||
      user.email ||
      'User'
    );
  }

  return 'User';
}

function getUserAvatar(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return (
    user.avatar ||
    user.avatarUrl ||
    user.photoURL ||
    user.photoUrl ||
    user.profileImage ||
    user.profilePicture ||
    null
  );
}

function getUserId(user) {
  if (!user || typeof user !== 'object') {
    return null;
  }

  return user.id || user._id || user.userId || null;
}

function getCollaboratorUser(member) {
  if (
    member &&
    typeof member === 'object' &&
    member.user
  ) {
    return member.user;
  }

  return member;
}

function normalizeCollaborators(document) {
  const collaborators =
    document?.collaborators ||
    document?.members ||
    document?.sharedWith ||
    [];

  if (!Array.isArray(collaborators)) {
    return [];
  }

  return collaborators
    .map(getCollaboratorUser)
    .filter(Boolean);
}

function getDocumentId(document) {
  return document?.id || document?._id || '';
}

function getDocumentTitle(document) {
  const title =
    typeof document?.title === 'string'
      ? document.title.trim()
      : '';

  if (title) {
    return title;
  }

  const name =
    typeof document?.name === 'string'
      ? document.name.trim()
      : '';

  return name || 'Untitled document';
}

function getDocumentDate(document) {
  return (
    document?.updatedAt ||
    document?.modifiedAt ||
    document?.createdAt ||
    null
  );
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

function getCollaboratorCount(document, collaborators) {
  if (typeof document?.collaboratorCount === 'number') {
    return document.collaboratorCount;
  }

  if (typeof document?.memberCount === 'number') {
    return document.memberCount;
  }

  return collaborators.length;
}

function DocumentCardSkeleton() {
  return (
    <article className="document-card document-card-loading">
      <div className="document-card-link">
        <div className="document-card-icon">
          <Skeleton width={44} height={44} radius={12} />
        </div>

        <div className="document-card-content">
          <div className="document-card-top">
            <Skeleton
              width="65%"
              height={20}
              radius={6}
            />
          </div>

          <div className="document-card-owner">
            <Skeleton
              width={32}
              height={32}
              radius="50%"
            />

            <Skeleton
              width={90}
              height={14}
              radius={5}
            />
          </div>

          <div className="document-card-footer">
            <Skeleton
              width={110}
              height={13}
              radius={5}
            />

            <Skeleton
              width={45}
              height={24}
              radius={12}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

function DocumentCard({
  document: documentProp,
  doc,
  onDelete,
  onEdit,
  onOpen,
  className = '',
  loading = false,
  icon = '📄',
  showOwner = true,
  showCollaborators = true,
}) {
  if (loading) {
    return <DocumentCardSkeleton />;
  }

  const document = documentProp || doc || {};

  const documentId = getDocumentId(document);
  const title = getDocumentTitle(document);

  const owner =
    document.owner ||
    document.createdBy ||
    document.author ||
    null;

  const ownerName = getUserName(owner);
  const ownerAvatar = getUserAvatar(owner);

  const collaborators =
    normalizeCollaborators(document);

  const collaboratorCount =
    getCollaboratorCount(
      document,
      collaborators
    );

  const updatedAt = formatDate(
    getDocumentDate(document)
  );

  const visibleCollaborators =
    collaborators.slice(
      0,
      MAX_VISIBLE_COLLABORATORS
    );

  const remainingCollaborators =
    Math.max(
      collaboratorCount -
      MAX_VISIBLE_COLLABORATORS,
      0
    );

  const cardClasses = [
    'document-card',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleOpen = () => {
    if (typeof onOpen === 'function') {
      onOpen(document);
    }
  };

  const handleEdit = event => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onEdit === 'function') {
      onEdit(document);
    }
  };

  const handleDelete = event => {
    event.preventDefault();
    event.stopPropagation();

    if (typeof onDelete === 'function') {
      onDelete(document);
    }
  };

  return (
    <article
      className={cardClasses}
      data-document-id={
        documentId || undefined
      }
    >
      {documentId ? (
        <Link
          to={`/documents/${documentId}`}
          className="document-card-link"
          onClick={handleOpen}
          aria-label={`Open ${title}`}
        >
          <div
            className="document-card-icon"
            aria-hidden="true"
          >
            <span>{icon}</span>
          </div>

          <div className="document-card-content">
            <div className="document-card-top">
              <h3
                className="document-card-title"
                title={title}
              >
                {title}
              </h3>
            </div>

            {showOwner && (
              <div className="document-card-owner">
                <Avatar
                  user={
                    typeof owner === 'object'
                      ? owner
                      : undefined
                  }
                  name={ownerName}
                  src={ownerAvatar}
                  size="sm"
                  online={Boolean(
                    owner?.isOnline
                  )}
                />

                <span className="document-owner-name">
                  {ownerName}
                </span>
              </div>
            )}

            <div className="document-card-footer">
              <span
                className="document-updated"
                title={
                  document.updatedAt ||
                  document.modifiedAt ||
                  ''
                }
              >
                Updated {updatedAt}
              </span>

              {showCollaborators && (
                <div
                  className="document-collaborators"
                  aria-label={`${collaboratorCount} collaborator${collaboratorCount === 1
                    ? ''
                    : 's'
                    }`}
                >
                  {visibleCollaborators.length > 0 ? (
                    <div className="avatar-stack">
                      {visibleCollaborators.map(
                        (member, index) => {
                          const memberId =
                            getUserId(member) ||
                            `collaborator-${index}`;

                          const memberName =
                            getUserName(member);

                          return (
                            <Avatar
                              key={memberId}
                              user={
                                typeof member ===
                                  'object'
                                  ? member
                                  : undefined
                              }
                              name={memberName}
                              src={getUserAvatar(
                                member
                              )}
                              size="xs"
                              online={Boolean(
                                member?.isOnline
                              )}
                            />
                          );
                        }
                      )}

                      {remainingCollaborators >
                        0 && (
                          <span
                            className="avatar-more"
                            aria-hidden="true"
                          >
                            +
                            {
                              remainingCollaborators
                            }
                          </span>
                        )}
                    </div>
                  ) : (
                    <span className="collaborator-count">
                      {collaboratorCount || 0}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      ) : (
        <div className="document-card-link document-card-link-disabled">
          <div
            className="document-card-icon"
            aria-hidden="true"
          >
            <span>{icon}</span>
          </div>

          <div className="document-card-content">
            <div className="document-card-top">
              <h3
                className="document-card-title"
                title={title}
              >
                {title}
              </h3>
            </div>

            {showOwner && (
              <div className="document-card-owner">
                <Avatar
                  name={ownerName}
                  src={ownerAvatar}
                  size="sm"
                />

                <span className="document-owner-name">
                  {ownerName}
                </span>
              </div>
            )}

            <div className="document-card-footer">
              <span className="document-updated">
                Updated {updatedAt}
              </span>
            </div>
          </div>
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="document-card-actions">
          {typeof onEdit === 'function' && (
            <button
              type="button"
              className="document-action-button"
              onClick={handleEdit}
              aria-label={`Edit ${title}`}
            >
              Edit
            </button>
          )}

          {typeof onDelete === 'function' && (
            <button
              type="button"
              className="document-action-button danger"
              onClick={handleDelete}
              aria-label={`Delete ${title}`}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default DocumentCard;
