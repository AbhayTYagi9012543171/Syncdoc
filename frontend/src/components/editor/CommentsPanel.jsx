
import React, {
  useMemo,
  useState,
} from 'react';

import resolveAssetUrl from '../../utils/resolveAssetUrl';

import Avatar from '../common/Avatar';
import Button from '../common/Button';

const DEFAULT_COMMENTS = [];

const MAX_COMMENT_LENGTH = 1000;

function getAuthorName(author) {
  if (!author) {
    return 'User';
  }

  if (typeof author === 'string') {
    return author.trim() || 'User';
  }

  return (
    author.displayName ||
    author.username ||
    author.name ||
    author.fullName ||
    author.email ||
    'User'
  );
}

function getAuthorAvatar(author) {
  if (!author || typeof author !== 'object') {
    return null;
  }

  return (
    author.avatar ||
    author.avatarUrl ||
    author.photoURL ||
    author.photoUrl ||
    author.profileImage ||
    author.profilePicture ||
    null
  );
}

function getCommentId(comment, index) {
  return (
    comment?.id ||
    comment?._id ||
    `comment-${index}`
  );
}

function getCommentContent(comment) {
  return (
    comment?.content ||
    comment?.text ||
    comment?.body ||
    ''
  );
}

function getCommentDate(comment) {
  return (
    comment?.createdAt ||
    comment?.updatedAt ||
    comment?.time ||
    'Recently'
  );
}

function normalizeComments(
  comments,
  showFallback
) {
  if (
    Array.isArray(comments) &&
    comments.length > 0
  ) {
    return comments;
  }

  return showFallback
    ? DEFAULT_COMMENTS
    : [];
}

export default function CommentsPanel({
  open = true,
  comments,
  loading = false,
  showFallback = true,
  onSubmit,
  onReply,
  onResolve,
  onDelete,
  currentUser,
  placeholder = 'Write a comment...',
  maxLength = MAX_COMMENT_LENGTH,
  className = '',
}) {
  const [comment, setComment] =
    useState('');

  const [submitting, setSubmitting] =
    useState(false);

  const [replyingTo, setReplyingTo] =
    useState(null);

  const people = useMemo(
    () =>
      normalizeComments(
        comments,
        showFallback
      ),
    [comments, showFallback]
  );

  if (!open) {
    return null;
  }

  const trimmedComment =
    comment.trim();

  const canSubmit =
    trimmedComment.length > 0 &&
    !submitting &&
    !loading;

  const handleSubmit = async event => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    const payload = {
      content: trimmedComment,
      ...(replyingTo
        ? {
            parentId:
              replyingTo.id ||
              replyingTo._id,
          }
        : {}),
    };

    try {
      setSubmitting(true);

      if (typeof onSubmit === 'function') {
        await onSubmit(payload);
      }

      setComment('');
      setReplyingTo(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = commentItem => {
    setReplyingTo(commentItem);

    const authorName =
      getAuthorName(
        commentItem?.author ||
          commentItem?.user
      );

    setComment(
      `@${authorName} `
    );
  };

  const handleResolve = commentItem => {
    if (
      typeof onResolve === 'function'
    ) {
      onResolve(commentItem);
    }
  };

  const handleDelete = commentItem => {
    if (
      typeof onDelete === 'function'
    ) {
      onDelete(commentItem);
    }
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setComment('');
  };

  const classes = [
    'comments-panel',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside
      className={classes}
      aria-label="Comments"
    >
      <div className="panel-title">
        <div className="panel-title-content">
          <strong>Comments</strong>

          <span className="comment-count">
            {people.length}
          </span>
        </div>
      </div>

      <div
        className="comment-list"
        aria-live="polite"
      >
        {loading ? (
          <div
            className="comments-loading"
            aria-busy="true"
          >
            <div className="comment-skeleton">
              <span />
              <div>
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="comment-skeleton">
              <span />
              <div>
                <span />
                <span />
                <span />
              </div>
            </div>

            <div className="comment-skeleton">
              <span />
              <div>
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : people.length === 0 ? (
          <div
            className="comments-empty"
            role="status"
          >
            <span
              className="comments-empty-icon"
              aria-hidden="true"
            >
              💬
            </span>

            <strong>
              No comments yet
            </strong>

            <p>
              Start a conversation about
              this document.
            </p>
          </div>
        ) : (
          people.map(
            (commentItem, index) => {
              const id =
                getCommentId(
                  commentItem,
                  index
                );

              const author =
                commentItem?.author ||
                commentItem?.user ||
                commentItem?.createdBy;

              const authorName =
                getAuthorName(author);

              const avatar =
                getAuthorAvatar(author);

              const content =
                getCommentContent(
                  commentItem
                );

              const createdAt =
                getCommentDate(
                  commentItem
                );

              const resolved =
                Boolean(
                  commentItem?.resolved ||
                    commentItem?.isResolved
                );

              return (
                <article
                  className={`comment ${
                    resolved
                      ? 'resolved'
                      : ''
                  }`}
                  key={id}
                >
                  <Avatar
                    user={
                      typeof author ===
                      'object'
                        ? author
                        : undefined
                    }
                    name={authorName}
                    src={resolveAssetUrl(avatar)}
                    size="sm"
                  />

                  <div className="comment-content">
                    <div className="comment-meta">
                      <strong>
                        {authorName}
                      </strong>

                      <time>
                        {createdAt}
                      </time>
                    </div>

                    <p className="comment-text">
                      {content}
                    </p>

                    <div className="comment-actions">
                      {!resolved && (
                        <button
                          type="button"
                          className="text-btn"
                          onClick={() =>
                            handleReply(
                              commentItem
                            )
                          }
                        >
                          Reply
                        </button>
                      )}

                      {!resolved &&
                        onResolve && (
                          <button
                            type="button"
                            className="text-btn"
                            onClick={() =>
                              handleResolve(
                                commentItem
                              )
                            }
                          >
                            Resolve
                          </button>
                        )}

                      {onDelete && (
                        <button
                          type="button"
                          className="text-btn danger"
                          onClick={() =>
                            handleDelete(
                              commentItem
                            )
                          }
                        >
                          Delete
                        </button>
                      )}
                    </div>

                    {resolved && (
                      <span className="resolved-label">
                        <span aria-hidden="true">
                          ✓
                        </span>{' '}
                        Resolved
                      </span>
                    )}
                  </div>
                </article>
              );
            }
          )
        )}
      </div>

      <form
        className="comment-compose"
        onSubmit={handleSubmit}
      >
        {replyingTo && (
          <div className="replying-indicator">
            <span>
              Replying to{' '}
              <strong>
                {getAuthorName(
                  replyingTo.author ||
                    replyingTo.user
                )}
              </strong>
            </span>

            <button
              type="button"
              className="text-btn"
              onClick={
                handleCancelReply
              }
              aria-label="Cancel reply"
            >
              Cancel
            </button>
          </div>
        )}

        <textarea
          value={comment}
          onChange={event =>
            setComment(
              event.target.value.slice(
                0,
                maxLength
              )
            )
          }
          placeholder={placeholder}
          rows={3}
          maxLength={maxLength}
          disabled={
            submitting || loading
          }
          aria-label="Write a comment"
        />

        <div className="comment-compose-footer">
          <span className="comment-character-count">
            {comment.length}/{maxLength}
          </span>

          <Button
            variant="primary"
            size="sm"
            type="submit"
            loading={submitting}
            disabled={!canSubmit}
          >
            {submitting
              ? 'Posting...'
              : replyingTo
                ? 'Reply'
                : 'Comment'}
          </Button>
        </div>
      </form>
    </aside>
  );
}
