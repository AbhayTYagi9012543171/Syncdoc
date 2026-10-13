
import React, { useMemo } from 'react';

import Avatar from '../common/Avatar';

const FALLBACK_USERS = [];

const MAX_VISIBLE_USERS = 3;

function getUserName(user) {
  if (!user) {
    return 'User';
  }

  if (typeof user === 'string') {
    return user.trim() || 'User';
  }

  return (
    user.displayName ||
    user.username ||
    user.name ||
    user.fullName ||
    user.email ||
    'User'
  );
}

function getUserId(user, index) {
  if (!user || typeof user !== 'object') {
    return `user-${index}`;
  }

  return (
    user.id ||
    user._id ||
    user.userId ||
    user.email ||
    `user-${index}`
  );
}

function getUserStatus(user) {
  if (!user || typeof user !== 'object') {
    return 'online';
  }

  if (user.status) {
    return user.status;
  }

  if (user.isOnline === false) {
    return 'offline';
  }

  return 'online';
}

function normalizeUsers(users) {
  if (!Array.isArray(users) || users.length === 0) {
    return [];
  }

  return users.filter(Boolean);
}

export default function PresenceIndicator({
  users = [],
  maxVisible = MAX_VISIBLE_USERS,
  showAvatars = true,
  showCount = true,
  className = '',
}) {
  const activeUsers = useMemo(
    () => normalizeUsers(users),
    [users]
  );

  const visibleLimit =
    Number.isInteger(maxVisible) && maxVisible > 0
      ? maxVisible
      : MAX_VISIBLE_USERS;

  const visibleUsers = activeUsers.slice(0, visibleLimit);
  const hiddenCount = Math.max(
    activeUsers.length - visibleUsers.length,
    0
  );

  const onlineCount = activeUsers.filter((user) => {
    return getUserStatus(user) === 'online';
  }).length;

  const classes = [
    'presence-indicator',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const onlineLabel =
    onlineCount === 1
      ? '1 person online'
      : `${onlineCount} people online`;

  return (
    <div
      className={classes}
      role="status"
      aria-label={onlineLabel}
      title={onlineLabel}
    >
      <span
        className="presence-dot"
        aria-hidden="true"
      />

      {showAvatars && (
        <div
          className="presence-avatars"
          aria-hidden="true"
        >
          {visibleUsers.map((user, index) => {
            const userName = getUserName(user);
            const userId = getUserId(user, index);
            const status = getUserStatus(user);

            return (
              <Avatar
                key={userId}
                user={
                  typeof user === 'object'
                    ? user
                    : undefined
                }
                name={userName}
                size="xs"
                status={status}
              />
            );
          })}

          {hiddenCount > 0 && (
            <span
              className="avatar-more"
              title={`${hiddenCount} more collaborator${
                hiddenCount === 1 ? '' : 's'
              }`}
            >
              +{hiddenCount}
            </span>
          )}
        </div>
      )}

      {showCount && (
        <span className="presence-count">
          {onlineCount} online
        </span>
      )}
    </div>
  );
}

