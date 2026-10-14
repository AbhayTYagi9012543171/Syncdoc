import React, { useCallback } from 'react';
import { Bell, CheckCheck, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationItem from './NotificationItem';

export default function NotificationPanel({ onClose, notificationState }) {
  const {
    notifications = [], loading, error, reload, markAllRead,
    markAsRead, unreadCount = 0, markingAllRead = false,
  } = notificationState || {};

  const handleMarkAllRead = useCallback(async () => {
    if (typeof markAllRead === 'function') await markAllRead();
  }, [markAllRead]);

  const handleNotificationClick = useCallback(async (notification) => {
    if (typeof markAsRead === 'function' && !(notification?.isRead || notification?.read)) {
      await markAsRead(notification);
    }
  }, [markAsRead]);

  return (
    <section className="sd-notification-panel" role="dialog" aria-label="Notifications">
      <header className="sd-notification-panel-head">
        <div className="sd-notification-heading-icon"><Bell size={18} /></div>
        <div className="sd-notification-heading-copy">
          <div className="sd-notification-title-row"><h2>Notifications</h2><span className="sd-notification-live"><i /> Live</span></div>
          <p>{unreadCount ? `${unreadCount} unread update${unreadCount === 1 ? '' : 's'}` : 'You’re all caught up'}</p>
        </div>
        <button type="button" className="sd-notification-icon-action" onClick={() => reload?.()} disabled={loading} aria-label="Refresh notifications" title="Refresh">
          <RefreshCw size={16} className={loading ? 'sd-spin' : ''} />
        </button>
      </header>
      <div className="sd-notification-toolbar">
        <span>RECENT ACTIVITY</span>
        <button type="button" className="sd-notification-mark-all" onClick={handleMarkAllRead} disabled={!unreadCount || markingAllRead}>
          <CheckCheck size={14} /> {markingAllRead ? 'Updating…' : 'Mark all read'}
        </button>
      </div>
      <div className="sd-notification-list" aria-live="polite">
        {loading && notifications.length === 0 ? (
          <div className="sd-notification-state"><span className="sd-notification-loader" /><strong>Gathering your updates</strong><p>Just a moment…</p></div>
        ) : error && notifications.length === 0 ? (
          <div className="sd-notification-state"><div className="sd-notification-state-icon is-error"><RefreshCw size={20} /></div><strong>Couldn’t load notifications</strong><p>Check your connection and try again.</p><button type="button" className="sd-notification-retry" onClick={() => reload?.()}>Try again</button></div>
        ) : notifications.length ? (
          notifications.slice(0, 6).map((notification) => (
            <NotificationItem key={notification.id || notification._id} notification={notification} onClick={handleNotificationClick} />
          ))
        ) : (
          <div className="sd-notification-state"><div className="sd-notification-state-icon"><Sparkles size={21} /></div><strong>All clear!</strong><p>New mentions, shares and document activity will appear here.</p></div>
        )}
      </div>
      <footer className="sd-notification-footer"><Link to="/notifications" onClick={onClose}>View all notifications <ChevronRight size={16} /></Link></footer>
    </section>
  );
}
