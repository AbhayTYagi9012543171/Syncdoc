import './CommonPremium.css';
import resolveAssetUrl from '../../utils/resolveAssetUrl';
import React, { useMemo, useState } from 'react';

/* ============================================================
   SYNCDOC — AVATAR COMPONENT
============================================================ */

/* ============================================================
   HELPERS
============================================================ */

/**
 * Safely extract a display name from a string or user object.
 */
const getUserName = (value) => {
  if (!value) {
    return 'User';
  }

  if (typeof value === 'string') {
    return value.trim() || 'User';
  }

  if (typeof value === 'object') {
    return (
      value.displayName ||
      value.username ||
      value.name ||
      value.fullName ||
      value.email ||
      'User'
    );
  }

  return 'User';
};

/**
 * Safely extract an avatar URL from a user object.
 */
const getAvatarUrl = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return (
    value.avatar ||
    value.avatarUrl ||
    value.photoURL ||
    value.photoUrl ||
    value.profileImage ||
    value.profilePicture ||
    null
  );
};

/**
 * Generate initials from a name or user object.
 */
const getInitials = (value) => {
  const name = getUserName(value);

  if (!name) {
    return 'U';
  }

  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'U';
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`
    .toUpperCase();
};

/**
 * Safely extract user ID.
 */
const getUserId = (value) => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  return (
    value.id ||
    value._id ||
    value.userId ||
    null
  );
};

/* ============================================================
   AVATAR COMPONENT
============================================================ */

const Avatar = ({
  name,
  user,

  src,
  avatar,

  size = 'md',

  online = false,
  isOnline = false,

  alt,
  title,

  className = '',

  showStatus = false,

  status,
  statusLabel,

  clickable = false,
  onClick,

  bordered = false,

  fallback = 'initials',

  loading = 'lazy',

  ...rest
}) => {
  const [imageError, setImageError] =
    useState(false);

  /* ==========================================================
     USER DATA
  ========================================================== */

  const person = user || name;

  const displayName = useMemo(
    () => getUserName(person),
    [person]
  );

  const initials = useMemo(
    () => getInitials(person),
    [person]
  );

  const userId = useMemo(
    () => getUserId(person),
    [person]
  );

  /* ==========================================================
     AVATAR IMAGE
  ========================================================== */

  const rawImageUrl =
    src ||
    avatar ||
    getAvatarUrl(person);

  const imageUrl = resolveAssetUrl(rawImageUrl);

  const hasImage =
    Boolean(imageUrl) &&
    !imageError;

  /* ==========================================================
     ONLINE STATUS
  ========================================================== */

  const isUserOnline =
    Boolean(online || isOnline);

  const normalizedStatus =
    status ||
    (showStatus || isUserOnline
      ? isUserOnline
        ? 'online'
        : 'offline'
      : null);

  /* ==========================================================
     SIZE
  ========================================================== */

  const validSizes = [
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
  ];

  const normalizedSize =
    validSizes.includes(size)
      ? size
      : 'md';

  /* ==========================================================
     FALLBACK
  ========================================================== */

  const normalizedFallback =
    fallback === 'icon'
      ? 'icon'
      : 'initials';

  /* ==========================================================
     CSS CLASSES
  ========================================================== */

  const classes = [
    'avatar',
    `avatar-${normalizedSize}`,

    hasImage
      ? 'avatar-has-image'
      : 'avatar-no-image',

    bordered
      ? 'avatar-bordered'
      : '',

    clickable || onClick
      ? 'avatar-clickable'
      : '',

    normalizedStatus
      ? `avatar-status-${normalizedStatus}`
      : '',

    className,
  ]
    .filter(Boolean)
    .join(' ');

  /* ==========================================================
     ACCESSIBILITY
  ========================================================== */

  const accessibleLabel =
    alt || displayName;

  const accessibleTitle =
    title || displayName;

  const isInteractive =
    Boolean(clickable || onClick);

  /* ==========================================================
     CLICK HANDLER
  ========================================================== */

  const handleClick = (event) => {
    if (!isInteractive) {
      return;
    }

    if (typeof onClick === 'function') {
      onClick(event, {
        id: userId,
        name: displayName,
        user: person,
      });
    }
  };

  /* ==========================================================
     KEYBOARD HANDLER
  ========================================================== */

  const handleKeyDown = (event) => {
    if (!isInteractive) {
      return;
    }

    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      handleClick(event);
    }
  };

  /* ==========================================================
     IMAGE ERROR
  ========================================================== */

  const handleImageError = () => {
    setImageError(true);
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <span
      className={classes}
      title={accessibleTitle}
      aria-label={accessibleLabel}
      role={
        isInteractive
          ? 'button'
          : undefined
      }
      tabIndex={
        isInteractive
          ? 0
          : undefined
      }
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-user-id={
        userId || undefined
      }
      data-user-name={displayName}
      {...rest}
    >
      {/* ======================================================
          IMAGE
      ====================================================== */}

      {hasImage && (
        <img
          src={imageUrl}
          alt={accessibleLabel}
          className="avatar-image"
          loading={loading}
          draggable="false"
          onError={handleImageError}
        />
      )}

      {/* ======================================================
          INITIALS FALLBACK
      ====================================================== */}

      {!hasImage &&
        normalizedFallback === 'initials' && (
          <span
            className="avatar-fallback"
            aria-hidden="true"
          >
            {initials}
          </span>
        )}

      {/* ======================================================
          ICON FALLBACK
      ====================================================== */}

      {!hasImage &&
        normalizedFallback === 'icon' && (
          <span
            className="avatar-icon"
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                fill="currentColor"
              />

              <path
                d="M21 22C21 17.0294 16.9706 13 12 13C7.02944 13 3 17.0294 3 22H21Z"
                fill="currentColor"
              />
            </svg>
          </span>
        )}

      {/* ======================================================
          STATUS INDICATOR
      ====================================================== */}

      {normalizedStatus && (
        <span
          className="avatar-status"
          aria-label={
            statusLabel ||
            normalizedStatus
          }
          title={
            statusLabel ||
            normalizedStatus
          }
        />
      )}
    </span>
  );
};

export default Avatar;