import React, { useMemo } from 'react';
import { AtSign, Bell, Check, FileText, MessageCircle, Share2, ShieldAlert, Sparkles, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '../common/Avatar';

const typeConfig = {
  default: { icon: Bell, tone: 'neutral' }, info: { icon: Sparkles, tone: 'blue' },
  success: { icon: Check, tone: 'green' }, warning: { icon: ShieldAlert, tone: 'amber' },
  danger: { icon: ShieldAlert, tone: 'red' }, comment: { icon: MessageCircle, tone: 'violet' },
  mention: { icon: AtSign, tone: 'violet' }, share: { icon: Share2, tone: 'cyan' },
  document: { icon: FileText, tone: 'blue' },
};

function displayTime(notification) {
  const raw = notification?.createdAt || notification?.created_at || notification?.time;
  if (!raw) return 'Recently';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return String(raw);
  try { return formatDistanceToNow(date, { addSuffix: true }); }
  catch { return date.toLocaleString(); }
}

function displayName(notification) {
  const actor = notification?.actor || notification?.user || notification?.sender;
  if (typeof notification?.name === 'string' && notification.name.trim()) return notification.name.trim();
  if (typeof actor === 'string' && actor.trim()) return actor.trim();
  if (actor && typeof actor === 'object') return actor.displayName || actor.username || actor.name || actor.fullName || actor.email || 'A teammate';
  return notification?.title || 'SyncDoc update';
}

export default function NotificationItem({ notification = {}, onClick, className = '' }) {
  const name = displayName(notification);
  const message = notification.message || notification.body || notification.text || 'There is a new update in your workspace.';
  const isRead = Boolean(notification.isRead ?? notification.read ?? notification.readAt);
  const rawType = String(notification.type || notification.category || 'default').toLowerCase();
  const type = typeConfig[rawType] ? rawType : 'default';
  const config = typeConfig[type];
  const TypeIcon = config.icon;
  const actor = notification.actor || notification.user || notification.sender;
  const avatarUrl = notification.avatar || notification.avatarUrl || actor?.avatar || actor?.avatarUrl || actor?.photoURL || actor?.profileImage;
  const time = useMemo(() => displayTime(notification), [notification]);
  const notificationId = notification.id || notification._id || notification.notificationId;
  const actionable = typeof onClick === 'function';

  const content = (
    <>
      <div className={`sd-notification-avatar sd-tone-${config.tone}`}>
        {avatarUrl || (actor && typeof actor === 'object') ? <Avatar user={typeof actor === 'object' ? actor : undefined} name={name} src={avatarUrl} size="sm" /> : <TypeIcon size={17} strokeWidth={1.8} />}
      </div>
      <div className="sd-notification-item-copy">
        <p className="sd-notification-message"><strong>{name}</strong> <span>{String(message)}</span></p>
        <div className="sd-notification-item-meta"><time>{time}</time>{notification.workspace?.name && <><span className="sd-notification-meta-dot">·</span><span>{notification.workspace.name}</span></>}</div>
      </div>
      {!isRead && <span className="sd-notification-unread-dot" aria-label="Unread" title="Unread" />}
    </>
  );

  if (actionable) return <button type="button" className={`sd-notification-item ${!isRead ? 'is-unread' : ''} ${className}`} data-notification-id={notificationId || undefined} onClick={() => onClick(notification)}>{content}</button>;
  return <article className={`sd-notification-item ${!isRead ? 'is-unread' : ''} ${className}`} data-notification-id={notificationId || undefined}>{content}</article>;
}
