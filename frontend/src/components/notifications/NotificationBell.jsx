import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import useNotifications from '../../hooks/useNotifications';
import NotificationPanel from './NotificationPanel';
import './notifications.css';

export default function NotificationBell({ unreadCount: unreadCountProp }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const notificationState = useNotifications({ autoLoad: true });
  const unreadCount = Number.isFinite(unreadCountProp)
    ? unreadCountProp
    : notificationState.unreadCount;

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`sd-notification-wrap ${open ? 'is-open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="sd-notification-trigger"
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={19} strokeWidth={1.8} />
        {unreadCount > 0 && <span className="sd-notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}
        <span className="sd-notification-pulse" aria-hidden="true" />
      </button>
      {open && (
        <div className="sd-notification-popover">
          <NotificationPanel
            notificationState={notificationState}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
      <Link to="/notifications" className="sd-notification-mobile-link" onClick={() => setOpen(false)} aria-label="Open all notifications">
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
