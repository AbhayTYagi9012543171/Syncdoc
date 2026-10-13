
import React, { useMemo } from 'react';

import Avatar from '../common/Avatar';

const DEFAULT_COLLABORATORS = [];

function getPersonId(person, index) {
  if (!person) {
    return `collaborator-${index}`;
  }

  if (typeof person === 'string') {
    return `collaborator-${person}-${index}`;
  }

  return (
    person.id ||
    person._id ||
    person.userId ||
    person.user?.id ||
    person.user?._id ||
    `collaborator-${index}`
  );
}

function getPersonName(person) {
  if (!person) {
    return 'User';
  }

  if (typeof person === 'string') {
    return person.trim() || 'User';
  }

  if (typeof person === 'object') {
    return (
      person.displayName ||
      person.username ||
      person.name ||
      person.fullName ||
      person.email ||
      person.user?.displayName ||
      person.user?.username ||
      person.user?.name ||
      person.user?.email ||
      'User'
    );
  }

  return 'User';
}

function getPersonAvatar(person) {
  if (!person || typeof person !== 'object') {
    return null;
  }

  const user =
    person.user &&
      typeof person.user === 'object'
      ? person.user
      : person;

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

function getPersonStatus(person, index) {
  if (!person || typeof person !== 'object') {
    return index < 2 ? 'online' : undefined;
  }

  const user =
    person.user &&
      typeof person.user === 'object'
      ? person.user
      : person;

  if (
    user.isOnline === true ||
    user.online === true
  ) {
    return 'online';
  }

  if (
    user.isOnline === false ||
    user.online === false
  ) {
    return 'offline';
  }

  if (
    user.status === 'online' ||
    user.status === 'offline' ||
    user.status === 'away' ||
    user.status === 'busy'
  ) {
    return user.status;
  }

  return undefined;
}

function normalizeCollaborators(
  collaborators,
  useFallback
) {
  if (
    Array.isArray(collaborators) &&
    collaborators.length > 0
  ) {
    return collaborators;
  }

  return useFallback
    ? DEFAULT_COLLABORATORS
    : [];
}

export default function Collaborators({
  collaborators = [],
  maxVisible = 4,
  showFallback = true,
  showCount = true,
  size = 'sm',
  className = '',
  label = 'Document collaborators',
  onCollaboratorClick,
}) {
  const people = useMemo(
    () =>
      normalizeCollaborators(
        collaborators,
        showFallback
      ),
    [collaborators, showFallback]
  );

  const visiblePeople = people.slice(
    0,
    Math.max(1, maxVisible)
  );

  const remainingCount = Math.max(
    people.length - visiblePeople.length,
    0
  );

  const classes = [
    'collaborator-stack',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (people.length === 0) {
    return (
      <div
        className={classes}
        aria-label="No collaborators"
      >
        <span className="collaborator-empty">
          No collaborators
        </span>
      </div>
    );
  }

  const handleCollaboratorClick = (
    event,
    person
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      typeof onCollaboratorClick ===
      'function'
    ) {
      onCollaboratorClick(person);
    }
  };

  return (
    <div
      className={classes}
      role="group"
      aria-label={label}
    >
      {visiblePeople.map(
        (person, index) => {
          const personId =
            getPersonId(
              person,
              index
            );

          const name =
            getPersonName(person);

          const avatar =
            getPersonAvatar(person);

          const status =
            getPersonStatus(
              person,
              index
            );

          const isClickable =
            typeof onCollaboratorClick ===
            'function';

          return (
            <div
              className={
                isClickable
                  ? 'collaborator-item collaborator-item-clickable'
                  : 'collaborator-item'
              }
              key={personId}
              title={name}
              role={
                isClickable
                  ? 'button'
                  : undefined
              }
              tabIndex={
                isClickable
                  ? 0
                  : undefined
              }
              onClick={
                isClickable
                  ? event =>
                    handleCollaboratorClick(
                      event,
                      person
                    )
                  : undefined
              }
              onKeyDown={
                isClickable
                  ? event => {
                    if (
                      event.key ===
                      'Enter' ||
                      event.key ===
                      ' '
                    ) {
                      event.preventDefault();
                      handleCollaboratorClick(
                        event,
                        person
                      );
                    }
                  }
                  : undefined
              }
            >
              <Avatar
                user={
                  typeof person ===
                    'object'
                    ? person?.user ||
                    person
                    : undefined
                }
                name={name}
                src={avatar}
                size={size}
                status={status}
                online={
                  status ===
                  'online'
                }
              />
            </div>
          );
        }
      )}

      {showCount &&
        remainingCount > 0 && (
          <span
            className="avatar-more"
            title={`${remainingCount} more collaborator${remainingCount === 1
              ? ''
              : 's'
              }`}
            aria-label={`${remainingCount} more collaborator${remainingCount === 1
              ? ''
              : 's'
              }`}
          >
            +{remainingCount}
          </span>
        )}
    </div>
  );
}
