
import React from 'react';

import DocumentCard from './DocumentCard';
import EmptyState from '../common/EmptyState';
import Skeleton from '../common/Skeleton';

const DEFAULT_SKELETON_COUNT = 6;

function getDocumentKey(document, index) {
  return (
    document?.id ||
    document?._id ||
    document?.documentId ||
    `document-${index}`
  );
}

function DocumentGridSkeleton({
  count = DEFAULT_SKELETON_COUNT,
}) {
  return (
    <div
      className="document-grid document-grid-loading"
      aria-busy="true"
      aria-label="Loading documents"
    >
      {Array.from(
        { length: count },
        (_, index) => (
          <article
            className="document-card document-card-loading"
            key={`skeleton-${index}`}
          >
            <div className="document-card-link">
              <div className="document-card-icon">
                <Skeleton
                  width={44}
                  height={44}
                  radius={12}
                />
              </div>

              <div className="document-card-content">
                <div className="document-card-top">
                  <Skeleton
                    width="70%"
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
                    width={100}
                    height={14}
                    radius={6}
                  />
                </div>

                <div className="document-card-footer">
                  <Skeleton
                    width={110}
                    height={13}
                    radius={6}
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
        )
      )}
    </div>
  );
}

function DocumentGrid({
  documents = [],
  loading = false,
  skeletonCount = DEFAULT_SKELETON_COUNT,
  onDelete,
  onEdit,
  onOpen,
  onFavorite,
  className = '',
  emptyTitle = 'No documents found',
  emptyDescription =
    'Create your first document to start working.',
  emptyIcon = '□',
}) {
  if (loading) {
    return (
      <DocumentGridSkeleton
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
    'document-grid',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="list"
      aria-label="Documents"
    >
      {safeDocuments.map(
        (document, index) => (
          <div
            className="document-grid-item"
            key={getDocumentKey(
              document,
              index
            )}
            role="listitem"
          >
            <DocumentCard
              document={document}
              onDelete={onDelete}
              onEdit={onEdit}
              onOpen={onOpen}
              onFavorite={onFavorite}
            />
          </div>
        )
      )}
    </div>
  );
}

export default DocumentGrid;

