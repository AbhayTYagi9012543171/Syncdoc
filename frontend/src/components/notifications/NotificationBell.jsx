import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import NotificationPanel from './NotificationPanel';

export default function NotificationBell({
  unreadCount = 3,
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener(
        'mousedown',
        handleOutsideClick
      );
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`notification-wrap ${
        open ? 'notification-open' : ''
      }`}
    >
      <button
        type="button"
        className="icon-btn notification-button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span
          className="notification-icon"
          aria-hidden="true"
        >
          🔔
        </span>

        {unreadCount > 0 && (
          <span className="notification-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-popover">
          <NotificationPanel
            onClose={() => setOpen(false)}
          />
        </div>
      )}

      <Link
        to="/notifications"
        className="notification-mobile-link"
        aria-label="View all notifications"
      />
    </div>
  );
}