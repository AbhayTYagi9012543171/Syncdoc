
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import userService from '../services/userService';

/* ============================================================
   HELPERS
============================================================ */

const getInitials = (name = '') => {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return 'U';

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const normalizeRole = (role) => {
  if (!role) return 'User';

  return String(role)
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getRoleValue = (role) => {
  return String(role || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]/g, ' ');
};

const getRoleVariant = (role) => {
  const normalized = getRoleValue(role);

  if (
    normalized === 'admin' ||
    normalized === 'owner' ||
    normalized === 'super admin'
  ) {
    return 'danger';
  }

  if (
    normalized === 'editor' ||
    normalized === 'manager'
  ) {
    return 'primary';
  }

  return 'secondary';
};

const getStatusValue = (status) => {
  return String(status || '')
    .trim()
    .toLowerCase();
};

const getStatusVariant = (status) => {
  return getStatusValue(status) === 'active'
    ? 'success'
    : 'secondary';
};

const getUserName = (user) => {
  return (
    user?.displayName ||
    user?.name ||
    user?.username ||
    'Unknown User'
  );
};

const getUserEmail = (user) => {
  return user?.email || 'No email';
};

const getUserId = (user, index = 0) => {
  return (
    user?.id ||
    user?._id ||
    user?.userId ||
    user?.email ||
    `user-${index}`
  );
};

const getNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const getUserStatus = (user) => {
  if (user?.status) {
    return String(user.status);
  }

  if (
    typeof user?.isOnline === 'boolean'
  ) {
    return user.isOnline
      ? 'Active'
      : 'Inactive';
  }

  if (
    typeof user?.active === 'boolean'
  ) {
    return user.active
      ? 'Active'
      : 'Inactive';
  }

  if (
    typeof user?.isActive === 'boolean'
  ) {
    return user.isActive
      ? 'Active'
      : 'Inactive';
  }

  return 'Inactive';
};

const getLastActive = (user) => {
  return (
    user?.lastActive ||
    user?.lastActivity ||
    user?.lastLogin ||
    'Unknown'
  );
};

/* ============================================================
   STAT CARD
============================================================ */

function AdminStatCard({
  label,
  value,
  description,
  icon,
  trend,
}) {
  return (
    <div className="stat-card admin-stat-card">
      <div className="admin-stat-top">
        <div
          className="admin-stat-icon"
          aria-hidden="true"
        >
          {icon}
        </div>

        {trend && (
          <span className="admin-stat-trend">
            {trend}
          </span>
        )}
      </div>

      <strong>{value}</strong>

      <span>{label}</span>

      {description && (
        <small>{description}</small>
      )}
    </div>
  );
}

/* ============================================================
   LOADING ROW
============================================================ */

function AdminTableLoading() {
  return (
    <div
      className="admin-loading-state"
      role="status"
      aria-live="polite"
    >
      <div
        className="admin-loading-spinner"
        aria-hidden="true"
      />

      <strong>Loading users...</strong>

      <span>
        Fetching the latest administration data.
      </span>
    </div>
  );
}

/* ============================================================
   ADMIN PAGE
============================================================ */

function Admin() {
  const [users, setUsers] = useState([]);
  const [serverStats, setServerStats] = useState(null);

  const [error, setError] = useState('');

  const [search, setSearch] = useState('');

  const [roleFilter, setRoleFilter] =
    useState('all');

  const [statusFilter, setStatusFilter] =
    useState('all');

  const [refreshing, setRefreshing] =
    useState(false);

  const [initialLoading, setInitialLoading] =
    useState(true);

  const mountedRef = useRef(true);

  /* ==========================================================
     MOUNT / UNMOUNT
  ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /* ==========================================================
     NORMALIZE USERS
  ========================================================== */

  const normalizeUsers = useCallback(
    (response) => {
      let list = [];

      if (Array.isArray(response)) {
        list = response;
      } else if (
        Array.isArray(response?.users)
      ) {
        list = response.users;
      } else if (
        Array.isArray(response?.data)
      ) {
        list = response.data;
      } else if (
        Array.isArray(response?.data?.users)
      ) {
        list = response.data.users;
      }

      return list.map((user) => ({
        ...user,
        status: getUserStatus(user),
      }));
    },
    []
  );

  /* ==========================================================
     LOAD ADMIN DATA
  ========================================================== */

  const handleRefresh = useCallback(
    async (isInitialLoad = false) => {
      if (refreshing && !isInitialLoad) {
        return;
      }

      if (isInitialLoad) {
        setInitialLoading(true);
      }

      setRefreshing(true);
      setError('');

      try {
        const [userResponse, statsResponse] =
          await Promise.all([
            userService.list({
              page: 1,
              limit: 100,
            }),
            userService.stats(),
          ]);

        if (!mountedRef.current) {
          return;
        }

        const nextUsers =
          normalizeUsers(userResponse);

        setUsers(nextUsers);
        setServerStats(
          statsResponse || null
        );
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }

        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Unable to load admin data.';

        setError(message);
      } finally {
        if (mountedRef.current) {
          setRefreshing(false);
          setInitialLoading(false);
        }
      }
    },
    [normalizeUsers, refreshing]
  );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    handleRefresh(true);
  }, [handleRefresh]);

  /* ==========================================================
     DERIVED STATISTICS
  ========================================================== */

  const statistics = useMemo(() => {
    const totalUsers = getNumber(
      serverStats?.totalUsers,
      users.length
    );

    const calculatedActiveUsers =
      users.filter(
        (user) =>
          getStatusValue(
            user?.status
          ) === 'active'
      ).length;

    const activeUsers = getNumber(
      serverStats?.activeUsers,
      calculatedActiveUsers
    );

    const administrators =
      users.filter((user) => {
        const role = getRoleValue(
          user?.role
        );

        return (
          role === 'admin' ||
          role === 'super admin' ||
          role === 'owner'
        );
      }).length;

    const totalDocuments = getNumber(
      serverStats?.totalDocuments,
      0
    );

    return {
      totalUsers,
      activeUsers,
      administrators,
      totalDocuments,
    };
  }, [users, serverStats]);

  /* ==========================================================
     FILTER USERS
  ========================================================== */

  const filteredUsers = useMemo(() => {
    const normalizedSearch =
      search.trim().toLowerCase();

    return users.filter((user) => {
      const name =
        getUserName(user).toLowerCase();

      const email =
        getUserEmail(user).toLowerCase();

      const username =
        String(
          user?.username || ''
        ).toLowerCase();

      const role =
        getRoleValue(user?.role);

      const status =
        getStatusValue(user?.status);

      const matchesSearch =
        !normalizedSearch ||
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        username.includes(normalizedSearch);

      const matchesRole =
        roleFilter === 'all' ||
        role ===
          roleFilter.toLowerCase();

      const matchesStatus =
        statusFilter === 'all' ||
        status ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      );
    });
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
  ]);

  /* ==========================================================
     CLEAR FILTERS
  ========================================================== */

  const clearFilters = useCallback(() => {
    setSearch('');
    setRoleFilter('all');
    setStatusFilter('all');
  }, []);

  const hasActiveFilters =
    Boolean(search.trim()) ||
    roleFilter !== 'all' ||
    statusFilter !== 'all';

  /* ==========================================================
     FILTERED COUNTS
  ========================================================== */

  const filteredCountLabel = useMemo(() => {
    return filteredUsers.length === 1
      ? 'user found'
      : 'users found';
  }, [filteredUsers.length]);

  /* ==========================================================
     SERVER INFORMATION
  ========================================================== */

  const growthLabel = useMemo(() => {
    const growth = serverStats?.growth;

    if (Array.isArray(growth)) {
      return growth.length
        ? `${growth.length}d`
        : undefined;
    }

    if (
      typeof growth === 'number' &&
      Number.isFinite(growth)
    ) {
      return `${growth >= 0 ? '+' : ''}${growth}%`;
    }

    return undefined;
  }, [serverStats]);

  const verifiedLabel = useMemo(() => {
    const verified =
      serverStats?.verifiedUsers;

    if (
      verified === null ||
      verified === undefined
    ) {
      return undefined;
    }

    return `${getNumber(verified)} verified`;
  }, [serverStats]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="page admin-page">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <header className="page-heading admin-page-heading">
        <div>
          <span className="eyebrow">
            SYSTEM
          </span>

          <h1>Admin Console</h1>

          <p>
            Monitor users, documents and workspace
            activity from one central dashboard.
          </p>
        </div>

        <div className="page-heading-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={() =>
              handleRefresh(false)
            }
            disabled={refreshing}
            aria-label="Refresh admin data"
          >
            <span
              aria-hidden="true"
              className={
                refreshing
                  ? 'admin-refresh-icon is-spinning'
                  : 'admin-refresh-icon'
              }
            >
              ↻
            </span>

            {refreshing
              ? 'Refreshing...'
              : 'Refresh'}
          </button>
        </div>
      </header>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          className="page-alert"
          role="alert"
        >
          <strong>
            Unable to load admin data.
          </strong>

          <span>{error}</span>

          <button
            type="button"
            className="btn link"
            onClick={() =>
              handleRefresh(false)
            }
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================================
          OVERVIEW STATS
      ====================================================== */}

      <section
        className="stats-grid admin-stats-grid"
        aria-label="System overview"
      >
        <AdminStatCard
          icon="👥"
          value={statistics.totalUsers}
          label="Users"
          description="Registered accounts"
          trend={growthLabel}
        />

        <AdminStatCard
          icon="📄"
          value={statistics.totalDocuments}
          label="Documents"
          description="Documents created"
          trend={verifiedLabel}
        />

        <AdminStatCard
          icon="⚡"
          value={statistics.activeUsers}
          label="Active now"
          description="Currently active users"
        />

        <AdminStatCard
          icon="🛡"
          value={statistics.administrators}
          label="Administrators"
          description="Users with admin access"
        />
      </section>

      {/* ======================================================
          USERS CARD
      ====================================================== */}

      <Card
        title="User Management"
        className="admin-users-card"
      >

        {/* ====================================================
            TOOLBAR
        ==================================================== */}

        <div className="admin-toolbar">

          <div className="admin-search">
            <span
              className="admin-search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search users..."
              aria-label="Search users"
              autoComplete="off"
            />

            {search && (
              <button
                type="button"
                className="admin-search-clear"
                onClick={() =>
                  setSearch('')
                }
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>

          <div className="admin-filters">

            <label className="admin-filter">
              <span>Role</span>

              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(
                    event.target.value
                  )
                }
                aria-label="Filter users by role"
              >
                <option value="all">
                  All roles
                </option>

                <option value="admin">
                  Admin
                </option>

                <option value="editor">
                  Editor
                </option>

                <option value="user">
                  User
                </option>
              </select>
            </label>

            <label className="admin-filter">
              <span>Status</span>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
                aria-label="Filter users by status"
              >
                <option value="all">
                  All status
                </option>

                <option value="active">
                  Active
                </option>

                <option value="inactive">
                  Inactive
                </option>
              </select>
            </label>

          </div>
        </div>

        {/* ====================================================
            RESULT SUMMARY
        ==================================================== */}

        <div className="admin-results-bar">
          <div>
            <strong>
              {filteredUsers.length}
            </strong>

            <span>
              {' '}
              {filteredCountLabel}
            </span>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn link"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>

        {/* ====================================================
            INITIAL LOADING
        ==================================================== */}

        {initialLoading ? (
          <AdminTableLoading />
        ) : filteredUsers.length > 0 ? (

          /* ==================================================
             USERS TABLE
          ================================================== */

          <div className="table-wrap admin-table-wrap">
            <table className="data-table admin-table">

              <thead>
                <tr>
                  <th scope="col">
                    User
                  </th>

                  <th scope="col">
                    Email
                  </th>

                  <th scope="col">
                    Role
                  </th>

                  <th scope="col">
                    Documents
                  </th>

                  <th scope="col">
                    Workspaces
                  </th>

                  <th scope="col">
                    Status
                  </th>

                  <th scope="col">
                    Last active
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(
                  (user, index) => {
                    const name =
                      getUserName(user);

                    const email =
                      getUserEmail(user);

                    const role =
                      normalizeRole(
                        user?.role
                      );

                    const status =
                      getUserStatus(user);

                    const userId =
                      getUserId(
                        user,
                        index
                      );

                    const documents =
                      getNumber(
                        user?.documents ??
                          user?.documentCount
                      );

                    const workspaces =
                      getNumber(
                        user?.workspaces ??
                          user?.workspaceCount
                      );

                    const lastActive =
                      getLastActive(user);

                    return (
                      <tr
                        key={userId}
                      >

                        {/* USER */}

                        <td>
                          <div className="admin-user-cell">

                            <div
                              className="admin-user-avatar"
                              aria-hidden="true"
                            >
                              {getInitials(
                                name
                              )}
                            </div>

                            <div className="admin-user-details">

                              <strong>
                                {name}
                              </strong>

                              {user?.username && (
                                <span>
                                  @{user.username}
                                </span>
                              )}

                            </div>

                          </div>
                        </td>

                        {/* EMAIL */}

                        <td>
                          <span className="admin-email">
                            {email}
                          </span>
                        </td>

                        {/* ROLE */}

                        <td>
                          <Badge
                            variant={getRoleVariant(
                              user?.role
                            )}
                          >
                            {role}
                          </Badge>
                        </td>

                        {/* DOCUMENTS */}

                        <td>
                          <span className="admin-number">
                            {documents}
                          </span>
                        </td>

                        {/* WORKSPACES */}

                        <td>
                          <span className="admin-number">
                            {workspaces}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          <Badge
                            variant={getStatusVariant(
                              status
                            )}
                          >
                            {String(status)}
                          </Badge>
                        </td>

                        {/* LAST ACTIVE */}

                        <td>
                          <span className="admin-last-active">
                            {lastActive}
                          </span>
                        </td>

                      </tr>
                    );
                  }
                )}
              </tbody>

            </table>
          </div>

        ) : (

          /* ==================================================
             EMPTY STATE
          ================================================== */

          <div
            className="admin-empty-state"
            role="status"
          >
            <div
              className="admin-empty-icon"
              aria-hidden="true"
            >
              👥
            </div>

            <h3>
              No users found
            </h3>

            <p>
              {hasActiveFilters
                ? 'Try changing your search or filter criteria.'
                : 'There are no registered users to display.'}
            </p>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn secondary"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        )}

      </Card>

      {/* ======================================================
          SYSTEM INFORMATION
      ====================================================== */}

      <section className="admin-system-grid">

        {/* ====================================================
            SYSTEM HEALTH
        ==================================================== */}

        <Card title="System Health">

          <div className="admin-health-list">

            <div className="admin-health-item">
              <span>
                <i
                  className="admin-health-dot"
                  aria-hidden="true"
                />
                API Server
              </span>

              <Badge variant="success">
                Operational
              </Badge>
            </div>

            <div className="admin-health-item">
              <span>
                <i
                  className="admin-health-dot"
                  aria-hidden="true"
                />
                Database
              </span>

              <Badge variant="success">
                Connected
              </Badge>
            </div>

            <div className="admin-health-item">
              <span>
                <i
                  className="admin-health-dot"
                  aria-hidden="true"
                />
                Collaboration
              </span>

              <Badge variant="success">
                Operational
              </Badge>
            </div>

          </div>

        </Card>

        {/* ====================================================
            ADMINISTRATION
        ==================================================== */}

        <Card title="Administration">

          <div className="admin-quick-actions">

            <button
              type="button"
              className="admin-quick-action"
            >
              <span
                aria-hidden="true"
              >
                👥
              </span>

              <div>
                <strong>
                  Manage Users
                </strong>

                <small>
                  View and manage accounts
                </small>
              </div>

              <span
                aria-hidden="true"
              >
                →
              </span>
            </button>

            <button
              type="button"
              className="admin-quick-action"
            >
              <span
                aria-hidden="true"
              >
                📄
              </span>

              <div>
                <strong>
                  Documents
                </strong>

                <small>
                  Monitor document activity
                </small>
              </div>

              <span
                aria-hidden="true"
              >
                →
              </span>
            </button>

            <button
              type="button"
              className="admin-quick-action"
            >
              <span
                aria-hidden="true"
              >
                ⚙
              </span>

              <div>
                <strong>
                  System Settings
                </strong>

                <small>
                  Configure platform settings
                </small>
              </div>

              <span
                aria-hidden="true"
              >
                →
              </span>
            </button>

          </div>

        </Card>

      </section>

    </div>
  );
}

export default Admin;
