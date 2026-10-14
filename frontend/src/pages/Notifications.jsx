import "./pages-premium.css";
import "./notifications-premium.css";

import React, { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell, CheckCheck, Check, CircleDot, Clock3, Inbox, Search, SlidersHorizontal,
  RefreshCw, X, Sparkles, BellRing, CircleCheck, AlertTriangle, Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import NotificationItem from "../components/notifications/NotificationItem";
import Button from "../components/common/Button";
import useNotifications from "../hooks/useNotifications";

const FILTERS = [
  { id: "all", label: "All activity", icon: Inbox },
  { id: "unread", label: "Unread", icon: CircleDot },
  { id: "read", label: "Read", icon: Check },
];

function notificationId(item, index = 0) {
  return String(item?.id || item?._id || item?.notificationId || `notification-${index}`);
}

function isRead(item) {
  return Boolean(item?.isRead === true || item?.read === true || item?.readAt);
}

function searchableText(item) {
  const actor = item?.actor || item?.user || item?.sender || {};
  const document = item?.document || {};
  return [
    item?.title, item?.message, item?.text, item?.description, item?.type,
    actor?.displayName, actor?.username, actor?.name, actor?.email,
    document?.title, item?.workspace?.name,
  ].filter((value) => value !== null && value !== undefined).join(" ").toLowerCase();
}

function readableError(error) {
  const status = error?.response?.status;
  if (status === 401) return "Your session has expired. Sign in again to continue.";
  if (status === 403) return "You do not have permission to perform this action.";
  if (status === 404) return "The notification endpoint could not be found.";
  if (status >= 500) return "The server encountered an error. Please try again.";
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || "Something went wrong. Please try again.";
}

function StatCard({ icon: Icon, label, value, tone, detail }) {
  return (
    <motion.article className={`np-stat np-stat-${tone}`} whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
      <span className="np-stat-icon"><Icon size={18} strokeWidth={1.9} /></span>
      <div className="np-stat-copy"><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></div>
    </motion.article>
  );
}

function SkeletonRow() {
  return <div className="np-skeleton" aria-hidden="true"><span /><div><i /><i /><i /></div></div>;
}

function EmptyState({ filter, hasSearch, onReset }) {
  const content = hasSearch
    ? { icon: Search, title: "No matches found", description: "Try another keyword or clear your filters." }
    : filter === "unread"
      ? { icon: CircleCheck, title: "You're all caught up", description: "There are no unread notifications waiting for you." }
      : filter === "read"
        ? { icon: CheckCheck, title: "Nothing read yet", description: "Notifications you have read will appear here." }
        : { icon: BellRing, title: "Your inbox is clear", description: "Workspace updates, mentions and document activity will show up here." };
  const Icon = content.icon;
  return (
    <motion.div className="np-empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="np-empty-art"><span /><span /><span /><Icon size={27} /></div>
      <h2>{content.title}</h2><p>{content.description}</p>
      {(hasSearch || filter !== "all") && <button className="np-text-button" type="button" onClick={onReset}>Clear filters <span aria-hidden="true">→</span></button>}
    </motion.div>
  );
}

export default function Notifications() {
  const {
    notifications = [], loading = false, error = null, reload, markAllRead,
    markAsRead, removeNotification,
  } = useNotifications();
  const reduceMotion = useReducedMotion();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [busyAction, setBusyAction] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");

  const items = useMemo(() => (Array.isArray(notifications) ? notifications : []).filter((item) => item && typeof item === "object"), [notifications]);
  const unreadCount = useMemo(() => items.filter((item) => !isRead(item)).length, [items]);
  const readCount = Math.max(0, items.length - unreadCount);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "unread" && isRead(item)) return false;
      if (filter === "read" && !isRead(item)) return false;
      return !query || searchableText(item).includes(query);
    });
  }, [items, filter, search]);
  const hasFilters = Boolean(search.trim()) || filter !== "all";

  const runAction = useCallback(async (key, action, successMessage) => {
    if (busyAction || typeof action !== "function") return;
    setBusyAction(key); setActionError(""); setNotice("");
    try {
      const result = await action();
      if (result === false) throw new Error("The action could not be completed. Please try again.");
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setActionError(readableError(err));
    } finally {
      setBusyAction("");
    }
  }, [busyAction]);

  const refresh = useCallback(() => runAction("refresh", async () => {
    if (typeof reload !== "function") throw new Error("Refresh is not available right now.");
    const result = await reload();
    if (result === undefined && error) throw error;
    return result;
  }), [runAction, reload, error]);

  const markAll = useCallback(() => {
    if (unreadCount === 0) return;
    return runAction("mark-all", async () => {
      if (typeof markAllRead !== "function") throw new Error("Mark all as read is not available.");
      return markAllRead();
    }, "All notifications marked as read.");
  }, [runAction, unreadCount, markAllRead]);

  const resetFilters = useCallback(() => { setFilter("all"); setSearch(""); }, []);

  const onNotificationRead = useCallback((item) => {
    if (isRead(item) || typeof markAsRead !== "function") return;
    return runAction(`read-${notificationId(item)}`, () => markAsRead(item), "Notification marked as read.");
  }, [markAsRead, runAction]);

  const onNotificationRemove = useCallback((item) => {
    if (typeof removeNotification !== "function") {
      setActionError("Delete is not available in the current notification hook.");
      return;
    }
    return runAction(`remove-${notificationId(item)}`, () => removeNotification(item), "Notification removed.");
  }, [removeNotification, runAction]);

  return (
    <main className="page notifications-page np-page" aria-labelledby="notifications-title">
      <motion.div className="np-orb np-orb-one" aria-hidden="true" animate={reduceMotion ? undefined : { y: [0, -12, 0], x: [0, 6, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="np-orb np-orb-two" aria-hidden="true" animate={reduceMotion ? undefined : { y: [0, 10, 0], x: [0, -7, 0] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

      <header className="np-hero">
        <div className="np-hero-copy">
          <div className="np-eyebrow"><span className="np-eyebrow-dot" /> WORKSPACE CENTER <span className="np-eyebrow-separator">/</span> ACTIVITY</div>
          <h1 id="notifications-title">Your updates, <span>in one place.</span></h1>
          <p>Keep up with the people, documents and workspaces that matter.</p>
          <div className="np-live-line"><span className="np-live-pulse" /> {unreadCount ? `${unreadCount} updates need your attention` : "You're up to date"}<span className="np-live-divider" /> <Clock3 size={13} /> Live inbox</div>
        </div>
        <div className="np-hero-art" aria-hidden="true"><div className="np-hero-ring np-ring-one" /><div className="np-hero-ring np-ring-two" /><div className="np-hero-bell"><Bell size={36} strokeWidth={1.5} /><span>{unreadCount > 99 ? "99+" : unreadCount}</span></div><Sparkles className="np-spark np-spark-one" size={18} /><Sparkles className="np-spark np-spark-two" size={13} /></div>
        <div className="np-hero-actions">
          <Button variant="outline" size="sm" onClick={refresh} disabled={Boolean(busyAction) || loading}><RefreshCw size={15} className={busyAction === "refresh" ? "np-spin" : ""} />{busyAction === "refresh" ? "Refreshing" : "Refresh"}</Button>
          <Button variant="primary" size="sm" onClick={markAll} disabled={Boolean(busyAction) || unreadCount === 0 || loading}><CheckCheck size={15} />{busyAction === "mark-all" ? "Marking read…" : "Mark all read"}</Button>
        </div>
      </header>

      <AnimatePresence initial={false}>
        {(actionError || notice) && <motion.div className={`np-feedback ${actionError ? "is-error" : "is-success"}`} role={actionError ? "alert" : "status"} initial={{ opacity: 0, y: -7, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -5, height: 0 }}><span className="np-feedback-icon">{actionError ? <AlertTriangle size={16} /> : <CircleCheck size={16} />}</span><span>{actionError || notice}</span><button type="button" aria-label="Dismiss message" onClick={() => { setActionError(""); setNotice(""); }}><X size={15} /></button></motion.div>}
      </AnimatePresence>

      <section className="np-stats" aria-label="Notification summary">
        <StatCard icon={Inbox} label="Total activity" value={items.length} tone="violet" detail="Across your workspace" />
        <StatCard icon={CircleDot} label="Unread updates" value={unreadCount} tone="blue" detail={unreadCount ? "Ready when you are" : "Nothing pending"} />
        <StatCard icon={CheckCheck} label="Already read" value={readCount} tone="green" detail="You're making progress" />
      </section>

      <section className="np-inbox-card" aria-label="Notification inbox">
        <div className="np-inbox-heading"><div><div className="np-section-kicker">YOUR FEED</div><h2>Recent activity <span>{filteredItems.length}</span></h2><p>Everything happening across your SyncDoc workspace.</p></div><div className="np-inbox-heading-right"><span className="np-secure-pill"><span /> Personal inbox</span></div></div>

        <div className="np-toolbar">
          <div className="np-filter-list" role="group" aria-label="Filter notifications">
            {FILTERS.map(({ id, label, icon: Icon }) => <button key={id} type="button" className={`np-filter ${filter === id ? "is-active" : ""}`} aria-pressed={filter === id} onClick={() => setFilter(id)}><Icon size={15} />{label}{id === "all" ? <span>{items.length}</span> : id === "unread" && unreadCount > 0 ? <span>{unreadCount}</span> : null}</button>)}
          </div>
          <label className="np-search"><Search size={16} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people, documents…" aria-label="Search notifications" autoComplete="off" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button>}</label>
        </div>

        {hasFilters && <div className="np-filter-summary"><SlidersHorizontal size={13} /><span>{filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}{search.trim() ? ` for “${search.trim()}”` : ""}</span><button type="button" onClick={resetFilters}>Clear filters</button></div>}

        <div className="np-feed" aria-live="polite" aria-busy={loading}>
          {loading && <div className="np-skeleton-list"><SkeletonRow /><SkeletonRow /><SkeletonRow /><SkeletonRow /></div>}
          {!loading && error && <div className="np-error-state"><div><AlertTriangle size={21} /></div><h3>We couldn't load your activity</h3><p>{readableError(error)}</p><Button variant="outline" size="sm" onClick={refresh} disabled={Boolean(busyAction)}><RefreshCw size={14} /> Try again</Button></div>}
          {!loading && !error && filteredItems.length === 0 && <EmptyState filter={filter} hasSearch={Boolean(search.trim())} onReset={resetFilters} />}
          {!loading && !error && filteredItems.length > 0 && <motion.div className="np-feed-list" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: reduceMotion ? 0 : 0.035 } } }}>
            {filteredItems.map((item, index) => {
              const id = notificationId(item, index);
              const read = isRead(item);
              const createdAt = item.createdAt || item.created_at || item.time;
              let timeLabel = "Recently";
              if (createdAt && !Number.isNaN(new Date(createdAt).getTime())) {
                try { timeLabel = formatDistanceToNow(new Date(createdAt), { addSuffix: true }); } catch { timeLabel = new Date(createdAt).toLocaleString(); }
              }
              return <motion.article key={`${id}-${index}`} className={`np-feed-row ${read ? "is-read" : "is-unread"}`} variants={{ hidden: { opacity: 0, y: reduceMotion ? 0 : 8 }, show: { opacity: 1, y: 0 } }} layout transition={{ duration: reduceMotion ? 0 : 0.22 }}>
                <div className="np-feed-status" aria-hidden="true">{read ? <Check size={12} /> : <span />}</div>
                <div className="np-feed-item"><NotificationItem notification={item} onClick={() => onNotificationRead(item)} /></div>
                <div className="np-feed-actions">
                  <time title={createdAt ? new Date(createdAt).toLocaleString() : undefined}>{timeLabel}</time>
                  {!read && <button type="button" className="np-icon-action" title="Mark as read" aria-label={`Mark ${item.title || "notification"} as read`} disabled={Boolean(busyAction)} onClick={() => onNotificationRead(item)}><Check size={15} /></button>}
                  {typeof removeNotification === "function" && <button type="button" className="np-icon-action np-delete-action" title="Remove notification" aria-label={`Remove ${item.title || "notification"}`} disabled={Boolean(busyAction)} onClick={() => onNotificationRemove(item)}><Trash2 size={15} /></button>}
                </div>
              </motion.article>;
            })}
          </motion.div>}
        </div>
        {!loading && !error && filteredItems.length > 0 && <footer className="np-feed-footer"><span><span className="np-footer-check"><Check size={12} /></span> You're viewing the latest activity available to your account.</span><span>{filteredItems.length} shown <span className="np-footer-dot">·</span> {items.length} total</span></footer>}
      </section>
      <p className="np-page-footnote"><Sparkles size={13} /> SyncDoc keeps your collaboration in sync, so you can focus on the work.</p>
      <span className="sr-only" aria-live="polite">{unreadCount} unread notifications. {filteredItems.length} notifications currently shown.</span>
    </main>
  );
}
