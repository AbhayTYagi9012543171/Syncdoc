import React, { useCallback, useEffect } from 'react';
import { CheckCheck, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationItem from './NotificationItem';
import useNotifications from '../../hooks/useNotifications';

export default function NotificationPanel({ onClose }) {
  const { notifications = [], loading, reload, markAllRead } = useNotifications({ autoLoad: true });
  useEffect(() => { reload?.(); }, [reload]);
  const handleReadAll = useCallback(async () => { await markAllRead?.(); }, [markAllRead]);

  return <section className="notification-panel" role="dialog" aria-label="Notifications">
    <header className="notification-panel-head"><div><strong>Notifications</strong><span className="notification-panel-subtitle">Live workspace activity</span></div><button type="button" className="text-btn" onClick={handleReadAll} disabled={!notifications.length}><CheckCheck size={14}/> Mark all read</button></header>
    <div className="notification-list">
      {loading ? <div className="notification-empty"><span className="spinner"/><strong>Loading activity...</strong></div> : notifications.length ? notifications.slice(0,6).map((notification) => <NotificationItem key={notification.id || notification._id} notification={{ ...notification, user: notification.actor, text: notification.message, type: 'document' }} />) : <div className="notification-empty"><Bell size={20}/><strong>You're all caught up</strong><p>No new notifications.</p></div>}
    </div>
    <footer className="notification-footer"><Link to="/notifications" onClick={onClose}>View all notifications <span aria-hidden="true">→</span></Link></footer>
  </section>;
}
