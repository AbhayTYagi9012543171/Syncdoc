
import React from 'react';

import Avatar from '../common/Avatar';

const DEFAULT_NOTIFICATION = {
  name: 'SyncDoc',
  text: 'You have a new notification.',
  time: 'Recently',
  type: 'default',
  read: false,
};

function getNotificationValue(notification, key, fallback) {
  const value = notification?.[key];

  if (value === null || value === undefined) {
    return fallback;
  }

  return value;
}

function getUserName(notification) {
  const user = notification?.user;

  if (typeof notification?.name === 'string' && notification.name.trim()) {
    return notification.name.trim();
  }

  if (typeof user === 'string' && user.trim()) {
    return user.trim();
  }

  if (user && typeof user === 'object') {
    return (
      user.displayName ||
      user.username ||
      user.name ||
      user.fullName ||
      user.email ||
      'User'
    );
  }

  return 'SyncDoc';
}

function getAvatarSource(notification) {
  const user = notification?.user;

  if (notification?.avatar || notification?.avatarUrl) {
    return notification.avatar || notification.avatarUrl;
  }

  if (user && typeof user === 'object') {
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

  return null;
}

function getNotificationType(notification) {
  const type = String(
    notification?.type ||
      notification?.category ||
      'default'
  ).toLowerCase();

  const allowedTypes = [
    'default',
    'info',
    'success',
    'warning',
    'danger',
    'comment',
    'mention',
    'share',
    'document',
  ];

  return allowedTypes.includes(type) ? type : 'default';
}

export default function NotificationItem({
  notification = DEFAULT_NOTIFICATION,
  onClick,
  className = '',
}) {
  const name = getUserName(notification);

  const text = getNotificationValue(
    notification,
    'text',
    notification?.message || 'You have a new notification.'
  );

  const time = getNotificationValue(
    notification,
    'time',
    notification?.createdAt || 'Recently'
  );

  const type = getNotificationType(notification);

  const isRead =
    notification?.read === true ||
    notification?.isRead === true;

  const avatarSource = getAvatarSource(notification);

  const notificationId =
    notification?.id ||
    notification?._id ||
    undefined;

  const classes = [
    'notification-item',
    `notification-${type}`,
    !isRead ? 'notification-unread' : '',
    onClick ? 'notification-clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <div className="notification-avatar">
        <Avatar
          user={
            notification?.user &&
            typeof notification.user === 'object'
              ? notification.user
              : undefined
          }
          name={name}
          src={avatarSource}
          size="sm"
        />
      </div>

      <div className="notification-content">
        <p className="notification-message">
          <strong>{name}</strong>{' '}
          <span>{String(text)}</span>
        </p>

        <small className="notification-time">
          {String(time)}
        </small>
      </div>

      {!isRead && (
        <span
          className="notification-unread-dot"
          aria-label="Unread"
        />
      )}
    </>
  );

  if (typeof onClick === 'function') {
    return (
      <button
        type="button"
        className={classes}
        data-notification-id={notificationId}
        onClick={() => onClick(notification)}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={classes}
      data-notification-id={notificationId}
      role="article"
    >
      {content}
    </div>
  );
}
