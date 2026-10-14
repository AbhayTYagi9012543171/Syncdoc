import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../styles/pages-premium.css';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import userService from '../services/userService';

const toArray = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.users)) return response.users;
  if (Array.isArray(response?.data?.users)) return response.data.users;
  if (Array.isArray(response?.data)) return response.data;
  return [];
};
const num = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const nameOf = (u) => u?.displayName || u?.name || u?.username || 'Unknown user';
const emailOf = (u) => u?.email || 'No email';
const roleOf = (role) => String(role || 'user').trim().toLowerCase().replace(/[_-]/g, ' ');
const titleCase = (value) => String(value || 'unknown').replace(/\b\w/g, (c) => c.toUpperCase());
const statusOf = (u) => {
  if (u?.status) return String(u.status);
  if (typeof u?.isActive === 'boolean') return u.isActive ? 'Active' : 'Inactive';
  if (typeof u?.active === 'boolean') return u.active ? 'Active' : 'Inactive';
  if (typeof u?.isOnline === 'boolean') return u.isOnline ? 'Active' : 'Inactive';
  return 'Inactive';
};
const idOf = (u, index) => u?.id || u?._id || u?.userId || u?.email || `user-${index}`;
const initials = (name) => String(name || 'U').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || 'U';
const dateLabel = (value) => {
  if (!value || value === 'Unknown') return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

function StatCard({ icon, label, value, detail, tone = 'violet' }) {
  return <article className={`admin-premium-stat tone-${tone}`}>
    <div className="admin-premium-stat-top"><span className="admin-premium-stat-icon" aria-hidden="true">{icon}</span><span className="admin-premium-stat-mark">↗</span></div>
    <div className="admin-premium-stat-value">{value}</div>
    <div className="admin-premium-stat-label">{label}</div>
    <div className="admin-premium-stat-detail">{detail}</div>
  </article>;
}

function StatusPill({ status }) {
  const active = String(status).toLowerCase() === 'active' || String(status).toLowerCase() === 'healthy' || String(status).toLowerCase() === 'connected' || String(status).toLowerCase() === 'operational';
  const warning = ['degraded', 'warning', 'pending'].includes(String(status).toLowerCase());
  return <span className={`admin-premium-pill ${active ? 'is-good' : warning ? 'is-warning' : 'is-neutral'}`}><i />{titleCase(status)}</span>;
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [serverStats, setServerStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const refreshLock = useRef(false);
  const mounted = useRef(false);
  const tableRef = useRef(null);

  const refresh = useCallback(async ({ initial = false } = {}) => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    if (initial) setInitialLoading(true);
    setRefreshing(true);
    setError('');
    try {
      const [usersResult, statsResult, activityResult] = await Promise.allSettled([
        userService.list({ page: 1, limit: 500 }),
        userService.stats(),
        typeof userService.activity === 'function' ? userService.activity({ limit: 8 }) : Promise.resolve(null),
      ]);
      if (!mounted.current) return;
      if (usersResult.status === 'fulfilled') {
        setUsers(toArray(usersResult.value).map((user) => ({ ...user, status: statusOf(user) })));
      } else {
        throw usersResult.reason;
      }
      if (statsResult.status === 'fulfilled') setServerStats(statsResult.value?.data ?? statsResult.value ?? null);
      if (activityResult.status === 'fulfilled' && activityResult.value) {
        const value = activityResult.value?.data ?? activityResult.value;
        setActivity(Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.activity) ? value.activity : []);
      }
      setLastUpdated(new Date());
    } catch (err) {
      if (mounted.current) setError(err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Could not load administration data.');
    } finally {
      refreshLock.current = false;
      if (mounted.current) { setRefreshing(false); setInitialLoading(false); }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh({ initial: true });
    const interval = window.setInterval(() => refresh(), 30000);
    return () => { mounted.current = false; window.clearInterval(interval); };
  }, [refresh]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const role = roleOf(u.role);
      const status = String(u.status || '').toLowerCase();
      const matchesQuery = !q || [nameOf(u), emailOf(u), u?.username, u?.role].some((v) => String(v || '').toLowerCase().includes(q));
      const matchesRole = roleFilter === 'all' || role === roleFilter;
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  useEffect(() => setPage(1), [search, roleFilter, statusFilter, pageSize]);
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const visibleUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const activeCount = users.filter((u) => String(u.status).toLowerCase() === 'active').length;
  const adminsCount = users.filter((u) => ['admin', 'owner', 'super admin'].includes(roleOf(u.role))).length;
  const documentsCount = num(serverStats?.totalDocuments ?? serverStats?.documentsCount ?? serverStats?.documentCount, users.reduce((sum, u) => sum + num(u.documentCount ?? u.documents), 0));
  const totalUsers = num(serverStats?.totalUsers ?? serverStats?.usersCount, users.length);
  const health = serverStats?.health || serverStats?.systemHealth || {};

  const exportCsv = () => {
    const columns = ['Name', 'Email', 'Username', 'Role', 'Status', 'Documents', 'Workspaces', 'Last active'];
    const rows = filteredUsers.map((u) => [nameOf(u), emailOf(u), u.username || '', titleCase(u.role), u.status, num(u.documentCount ?? u.documents), num(u.workspaceCount ?? u.workspaces), u.lastActive || u.lastActivity || u.lastLogin || '']);
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [columns, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `syncdoc-users-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  return <main className="page admin-page admin-premium-page">
    <div className="admin-premium-orb orb-one" aria-hidden="true" /><div className="admin-premium-orb orb-two" aria-hidden="true" />
    <header className="admin-premium-hero">
      <div className="admin-premium-heading-copy"><div className="admin-premium-eyebrow"><span className="admin-premium-live-dot" /> WORKSPACE CONTROL CENTER</div><h1>Admin <span>Console</span></h1><p>Manage your people, monitor platform health, and keep your workspace moving.</p>
        <div className="admin-premium-meta"><span><i className="admin-premium-meta-dot" /> Live overview</span><span>{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for first sync'}</span></div>
      </div>
      <div className="admin-premium-hero-actions"><button className="admin-premium-btn admin-premium-btn-quiet" type="button" onClick={exportCsv} disabled={!filteredUsers.length}>⇩ <span>Export CSV</span></button><button className="admin-premium-btn admin-premium-btn-primary" type="button" onClick={() => refresh()} disabled={refreshing}><span className={refreshing ? 'admin-premium-refresh-spin' : ''}>↻</span> {refreshing ? 'Refreshing…' : 'Refresh data'}</button></div>
    </header>

    {error && <div className="admin-premium-alert" role="alert"><span>!</span><div><strong>We couldn’t refresh all admin data.</strong><p>{error}</p></div><button type="button" onClick={() => refresh()}>Try again</button></div>}

    <section className="admin-premium-stats" aria-label="Workspace statistics">
      <StatCard icon="♙" label="Total users" value={initialLoading ? '—' : totalUsers.toLocaleString()} detail="Registered accounts" tone="violet" />
      <StatCard icon="▤" label="Documents" value={initialLoading ? '—' : documentsCount.toLocaleString()} detail="Across your workspace" tone="blue" />
      <StatCard icon="ϟ" label="Active users" value={initialLoading ? '—' : activeCount.toLocaleString()} detail="Marked active by the API" tone="green" />
      <StatCard icon="✧" label="Administrators" value={initialLoading ? '—' : adminsCount.toLocaleString()} detail="Privileged accounts" tone="amber" />
    </section>

    <section className="admin-premium-main-grid">
      <Card title="User management" className="admin-users-card admin-premium-panel">
        <div className="admin-premium-toolbar"><label className="admin-premium-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder="Search name, email or username…" aria-label="Search users" />{search && <button type="button" aria-label="Clear search" onClick={() => setSearch('')}>×</button>}</label>
          <div className="admin-premium-filter-group"><label><span className="sr-only">Filter by role</span><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="all">All roles</option><option value="admin">Admin</option><option value="super admin">Super admin</option><option value="owner">Owner</option><option value="editor">Editor</option><option value="manager">Manager</option><option value="user">User</option></select></label><label><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="all">All status</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label></div>
        </div>
        <div className="admin-premium-table-caption"><div><strong>{filteredUsers.length.toLocaleString()}</strong> <span>{filteredUsers.length === 1 ? 'account' : 'accounts'} found</span></div><label>Rows <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select></label></div>
        {initialLoading ? <div className="admin-premium-loading" role="status"><span className="admin-premium-loader" /><strong>Loading workspace data</strong><p>Connecting to your administration API…</p></div> : visibleUsers.length ? <div className="admin-premium-table-wrap" ref={tableRef}><table className="admin-premium-table"><thead><tr><th>User</th><th>Role</th><th>Documents</th><th>Workspaces</th><th>Status</th><th>Last active</th></tr></thead><tbody>{visibleUsers.map((u, index) => { const role = roleOf(u.role); const id = idOf(u, index + (page - 1) * pageSize); return <tr key={id}><td><div className="admin-premium-user"><span className="admin-premium-avatar">{initials(nameOf(u))}</span><span className="admin-premium-user-copy"><strong>{nameOf(u)}</strong><small>{emailOf(u)}</small></span></div></td><td><span className={`admin-premium-role role-${role.replace(/\s/g, '-')}`}>{titleCase(role)}</span></td><td><strong className="admin-premium-number">{num(u.documentCount ?? u.documents)}</strong></td><td><strong className="admin-premium-number">{num(u.workspaceCount ?? u.workspaces)}</strong></td><td><StatusPill status={u.status} /></td><td><span className="admin-premium-last-active">{dateLabel(u.lastActive || u.lastActivity || u.lastLogin)}</span></td></tr>; })}</tbody></table></div> : <div className="admin-premium-empty"><span>⌕</span><h3>{users.length ? 'No matching accounts' : 'No users to display yet'}</h3><p>{users.length ? 'Try another search term or clear your filters.' : 'When users are returned by your API, they will appear here.'}</p>{(search || roleFilter !== 'all' || statusFilter !== 'all') && <button className="admin-premium-btn admin-premium-btn-quiet" onClick={() => { setSearch(''); setRoleFilter('all'); setStatusFilter('all'); }}>Clear filters</button>}</div>}
        {!initialLoading && filteredUsers.length > 0 && <footer className="admin-premium-pagination"><span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length}</span><div><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</button><span>Page {page} of {pageCount}</span><button type="button" aria-label="Next page" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>→</button></div></footer>}
      </Card>

      <aside className="admin-premium-side-column">
        <Card title="System health" className="admin-premium-panel admin-premium-health-panel"><div className="admin-premium-health-intro"><span className="admin-premium-health-emblem">⌁</span><div><strong>{health?.status ? titleCase(health.status) : 'Health status unavailable'}</strong><p>{health?.message || 'Connect a health endpoint to show live service status.'}</p></div></div><div className="admin-premium-health-list"><div><span>API server</span><StatusPill status={health?.api || health?.apiStatus || 'Unknown'} /></div><div><span>Database</span><StatusPill status={health?.database || health?.databaseStatus || 'Unknown'} /></div><div><span>Collaboration</span><StatusPill status={health?.collaboration || health?.collaborationStatus || 'Unknown'} /></div></div><small className="admin-premium-health-note">Health indicators reflect API data; unknown states are not assumed operational.</small></Card>
        <Card title="Recent activity" className="admin-premium-panel admin-premium-activity-panel"><div className="admin-premium-activity-head"><span>Latest workspace events</span><span className="admin-premium-activity-count">{activity.length}</span></div>{activity.length ? <div className="admin-premium-activity-list">{activity.slice(0, 8).map((item, i) => <div className="admin-premium-activity-item" key={item.id || item._id || `${item.createdAt || item.timestamp || 'event'}-${i}`}><span className="admin-premium-activity-icon">{item.icon || (String(item.action || item.type || '').toLowerCase().includes('delete') ? '−' : '↗')}</span><div><strong>{item.title || item.message || titleCase(item.action || item.type || 'Workspace update')}</strong><p>{item.description || item.actor?.name || item.user?.name || item.userName || 'Workspace activity'}</p><small>{dateLabel(item.createdAt || item.timestamp || item.updatedAt)}</small></div></div>)}</div> : <div className="admin-premium-activity-empty"><span>◷</span><strong>No recent activity returned</strong><p>Expose <code>userService.activity()</code> from your API service to populate this feed with saved backend events.</p></div>}</Card>
        <Card title="Quick links" className="admin-premium-panel"><nav className="admin-premium-quick-links" aria-label="Administration quick links"><a href="/documents"><span>▤</span><span><strong>Documents</strong><small>Browse workspace documents</small></span><b>↗</b></a><a href="/workspaces"><span>⌘</span><span><strong>Workspaces</strong><small>Review team spaces</small></span><b>↗</b></a><a href="/settings"><span>⚙</span><span><strong>Settings</strong><small>Configure your account</small></span><b>↗</b></a></nav></Card>
      </aside>
    </section>
  </main>;
}
