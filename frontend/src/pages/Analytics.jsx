import "./pages-premium.css";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Activity,
  BarChart3,
  FileText,
  MessageSquare,
  RefreshCw,
  Users,
} from 'lucide-react';

import Card from '../components/common/Card';
import Skeleton from '../components/common/Skeleton';
import analyticsService from '../services/analyticsService';
import { formatRelativeDate } from '../utils/formatDate';

/* ============================================================
   CONSTANTS
============================================================ */

const ICONS = {
  users: Users,
  documents: FileText,
  edits: Activity,
  comments: MessageSquare,
};

const PERIODS = [
  {
    value: 30,
    label: 'Last 30 days',
  },
  {
    value: 90,
    label: 'Last 90 days',
  },
  {
    value: 180,
    label: 'Last 180 days',
  },
  {
    value: 365,
    label: 'Last year',
  },
];

/* ============================================================
   HELPERS
============================================================ */

const toNumber = (value, fallback = 0) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const formatNumber = (value) => {
  return toNumber(value).toLocaleString();
};

const getActivityUserName = (user) => {
  return (
    user?.displayName ||
    user?.name ||
    user?.username ||
    'User'
  );
};

const getActivityType = (type) => {
  if (!type) return 'updated';

  return String(type)
    .replace(/[_-]/g, ' ')
    .trim();
};

const getActivityTitle = (item) => {
  return (
    item?.title ||
    item?.document?.title ||
    'a document'
  );
};

const getItemId = (item, index = 0) => {
  return (
    item?.id ||
    item?._id ||
    `${item?.createdAt || 'activity'}-${index}`
  );
};

const normalizeAnalyticsResponse = (response) => {
  const source =
    response?.data &&
    typeof response.data === 'object'
      ? response.data
      : response || {};

  return {
    stats: Array.isArray(source.stats)
      ? source.stats
      : [],

    documents: Array.isArray(source.documents)
      ? source.documents
      : [],

    recentActivity: Array.isArray(
      source.recentActivity
    )
      ? source.recentActivity
      : [],

    activity: Array.isArray(source.activity)
      ? source.activity
      : [],
  };
};

/* ============================================================
   ACTIVITY CHART
============================================================ */

function ActivityChart({ data = [] }) {
  const chartData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      label:
        item?.label ||
        item?.date ||
        item?.name ||
        `${index + 1}`,

      value: toNumber(
        item?.value ??
          item?.count ??
          item?.edits
      ),
    }));
  }, [data]);

  const maxValue = useMemo(() => {
    if (!chartData.length) {
      return 1;
    }

    return Math.max(
      ...chartData.map(
        (item) => item.value
      ),
      1
    );
  }, [chartData]);

  if (!chartData.length) {
    return (
      <div
        className="analytics-empty"
        role="status"
      >
        <BarChart3
          size={24}
          aria-hidden="true"
        />

        <strong>
          No activity yet
        </strong>

        <span>
          Editing activity will appear here.
        </span>
      </div>
    );
  }

  return (
    <div
      className="analytics-chart"
      role="img"
      aria-label="Workspace activity chart"
    >
      <div className="analytics-bars">
        {chartData.map(
          (item, index) => {
            const percentage =
              maxValue > 0
                ? (item.value / maxValue) *
                  100
                : 0;

            const height =
              item.value > 0
                ? Math.max(
                    6,
                    percentage
                  )
                : 4;

            return (
              <div
                className="analytics-bar-column"
                key={`${item.label}-${index}`}
                title={`${item.label}: ${item.value}`}
              >
                <div className="analytics-bar-value">
                  {item.value > 0
                    ? formatNumber(
                        item.value
                      )
                    : ''}
                </div>

                <div
                  className="analytics-bar"
                  style={{
                    height: `${height}%`,
                  }}
                  aria-hidden="true"
                />

                <span>
                  {item.label}
                </span>
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}

/* ============================================================
   STAT SKELETON
============================================================ */

function AnalyticsStatsSkeleton() {
  return (
    <>
      {Array.from(
        { length: 4 },
        (_, index) => (
          <div
            className="stat-card analytics-stat-card"
            key={`stat-skeleton-${index}`}
          >
            <div className="stat-top">
              <Skeleton
                width={40}
                height={40}
              />

              <Skeleton
                width={55}
                height={14}
              />
            </div>

            <Skeleton
              width={90}
              height={28}
            />

            <Skeleton
              width={130}
              height={15}
            />

            <Skeleton
              width={170}
              height={12}
            />
          </div>
        )
      )}
    </>
  );
}

/* ============================================================
   ACTIVITY SKELETON
============================================================ */

function ActivityListSkeleton() {
  return (
    <div className="activity-list">
      {Array.from(
        { length: 5 },
        (_, index) => (
          <div
            className="activity-item"
            key={`activity-skeleton-${index}`}
          >
            <div className="activity-content">
              <Skeleton
                width="85%"
                height={14}
              />

              <Skeleton
                width={90}
                height={11}
              />
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* ============================================================
   DOCUMENT SKELETON
============================================================ */

function DocumentsSkeleton() {
  return (
    <div className="analytics-document-list">
      {Array.from(
        { length: 5 },
        (_, index) => (
          <div
            className="analytics-document-row"
            key={`document-skeleton-${index}`}
          >
            <Skeleton
              width={25}
              height={18}
            />

            <Skeleton
              width="55%"
              height={16}
            />

            <Skeleton
              width={65}
              height={13}
            />
          </div>
        )
      )}
    </div>
  );
}

/* ============================================================
   ANALYTICS PAGE
============================================================ */

export default function Analytics() {
  const [days, setDays] = useState(30);

  const [data, setData] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState('');

  const mountedRef =
    useRef(true);

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
     LOAD ANALYTICS
  ========================================================== */

  const load = useCallback(
    async ({
      isRefresh = false,
    } = {}) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const response =
          await analyticsService.get(
            days
          );

        if (!mountedRef.current) {
          return;
        }

        setData(
          normalizeAnalyticsResponse(
            response
          )
        );
      } catch (err) {
        if (!mountedRef.current) {
          return;
        }

        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Unable to load analytics.';

        setError(message);
      } finally {
        if (!mountedRef.current) {
          return;
        }

        setLoading(false);
        setRefreshing(false);
      }
    },
    [days]
  );

  /* ==========================================================
     INITIAL / PERIOD LOAD
  ========================================================== */

  useEffect(() => {
    load();
  }, [load]);

  /* ==========================================================
     NORMALIZED DATA
  ========================================================== */

  const stats = useMemo(
    () =>
      Array.isArray(data?.stats)
        ? data.stats
        : [],
    [data]
  );

  const documents = useMemo(
    () =>
      Array.isArray(data?.documents)
        ? data.documents
        : [],
    [data]
  );

  const activity = useMemo(
    () =>
      Array.isArray(
        data?.recentActivity
      )
        ? data.recentActivity
        : [],
    [data]
  );

  const chartActivity = useMemo(
    () =>
      Array.isArray(data?.activity)
        ? data.activity
        : [],
    [data]
  );

  /* ==========================================================
     SAFE STATISTICS
  ========================================================== */

  const displayStats = useMemo(() => {
    return stats.slice(0, 4);
  }, [stats]);

  /* ==========================================================
     REFRESH HANDLER
  ========================================================== */

  const handleRefresh = useCallback(() => {
    load({
      isRefresh: true,
    });
  }, [load]);

  /* ==========================================================
     PERIOD HANDLER
  ========================================================== */

  const handlePeriodChange = useCallback(
    (event) => {
      const nextDays = Number(
        event.target.value
      );

      if (
        Number.isFinite(nextDays) &&
        nextDays > 0
      ) {
        setDays(nextDays);
      }
    },
    []
  );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <main className="page analytics-page">

      {/* ======================================================
          PAGE HEADER
      ====================================================== */}

      <header className="page-heading analytics-page-heading">

        <div>
          <span className="eyebrow">
            INSIGHTS
          </span>

          <h1>
            Analytics
          </h1>

          <p>
            Real activity measured from
            your SyncDoc workspace.
          </p>
        </div>

        <div className="page-heading-actions">

          <label
            className="analytics-period-label"
            htmlFor="analytics-period"
          >
            <span className="sr-only">
              Analytics period
            </span>

            <select
              id="analytics-period"
              className="analytics-period"
              value={days}
              onChange={
                handlePeriodChange
              }
              disabled={loading}
              aria-label="Analytics period"
            >
              {PERIODS.map(
                (period) => (
                  <option
                    key={period.value}
                    value={
                      period.value
                    }
                  >
                    {period.label}
                  </option>
                )
              )}
            </select>
          </label>

          <button
            type="button"
            className="btn secondary"
            onClick={
              handleRefresh
            }
            disabled={
              loading ||
              refreshing
            }
            aria-label="Refresh analytics"
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? 'is-spinning'
                  : ''
              }
              aria-hidden="true"
            />

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
            Analytics unavailable
          </strong>

          <span>
            {error}
          </span>

          <button
            type="button"
            className="btn link"
            onClick={
              handleRefresh
            }
            disabled={refreshing}
          >
            Try again
          </button>
        </div>
      )}

      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <section
        className="stats-grid analytics-stats-grid"
        aria-label="Analytics overview"
      >

        {loading ? (
          <AnalyticsStatsSkeleton />
        ) : displayStats.length > 0 ? (

          displayStats.map(
            (stat, index) => {
              const Icon =
                ICONS[
                  String(
                    stat?.id || ''
                  ).toLowerCase()
                ] ||
                BarChart3;

              const value =
                stat?.value ?? 0;

              return (
                <article
                  className="stat-card analytics-stat-card"
                  key={
                    stat?.id ||
                    stat?.label ||
                    `stat-${index}`
                  }
                >

                  <div className="stat-top">

                    <span
                      className="stat-icon"
                      aria-hidden="true"
                    >
                      <Icon size={17} />
                    </span>

                    {stat?.change !==
                      undefined &&
                      stat?.change !==
                        null && (
                        <span className="stat-change">
                          {String(
                            stat.change
                          )}
                        </span>
                      )}

                  </div>

                  <strong>
                    {formatNumber(
                      value
                    )}
                  </strong>

                  <span>
                    {stat?.label ||
                      'Metric'}
                  </span>

                  {stat?.description && (
                    <small>
                      {
                        stat.description
                      }
                    </small>
                  )}

                </article>
              );
            }
          )

        ) : (

          <div className="analytics-empty">
            <BarChart3
              size={24}
              aria-hidden="true"
            />

            <strong>
              No analytics available
            </strong>

            <span>
              There is not enough activity
              data to display statistics.
            </span>
          </div>

        )}

      </section>

      {/* ======================================================
          MAIN ANALYTICS GRID
      ====================================================== */}

      <section
        className="analytics-main-grid"
        aria-label="Workspace analytics"
      >

        {/* ====================================================
            ACTIVITY CHART
        ==================================================== */}

        <Card
          title={`Activity · ${days} days`}
          className="analytics-chart-card"
        >

          {loading ? (
            <div
              className="dashboard-loading-card"
              role="status"
              aria-label="Loading activity chart"
            >
              <span
                className="spinner"
                aria-hidden="true"
              />

              <span>
                Loading activity...
              </span>
            </div>
          ) : (
            <ActivityChart
              data={
                chartActivity
              }
            />
          )}

        </Card>

        {/* ====================================================
            RECENT ACTIVITY
        ==================================================== */}

        <Card
          title="Recent activity"
          className="analytics-activity-card"
        >

          {loading ? (
            <ActivityListSkeleton />
          ) : activity.length > 0 ? (

            <div className="activity-list">

              {activity
                .slice(0, 8)
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      className="activity-item"
                      key={getItemId(
                        item,
                        index
                      )}
                    >

                      <div
                        className="activity-icon"
                        aria-hidden="true"
                      >
                        <Activity
                          size={15}
                        />
                      </div>

                      <div className="activity-content">

                        <p>
                          <strong>
                            {getActivityUserName(
                              item?.user
                            )}
                          </strong>{' '}

                          {getActivityType(
                            item?.type
                          )}{' '}

                          <strong>
                            {getActivityTitle(
                              item
                            )}
                          </strong>
                        </p>

                        <small>
                          {item?.createdAt
                            ? formatRelativeDate(
                                item.createdAt
                              )
                            : 'Recently'}
                        </small>

                      </div>

                    </div>
                  )
                )}

            </div>

          ) : (

            <div
              className="analytics-empty"
              role="status"
            >
              <Activity
                size={24}
                aria-hidden="true"
              />

              <strong>
                No recent activity
              </strong>

              <span>
                Recent workspace activity
                will appear here.
              </span>
            </div>

          )}

        </Card>

      </section>

      {/* ======================================================
          MOST EDITED DOCUMENTS
      ====================================================== */}

      <Card
        title="Most edited documents"
        className="analytics-documents-card"
      >

        {loading ? (
          <DocumentsSkeleton />
        ) : documents.length > 0 ? (

          <div className="analytics-document-list">

            {documents.map(
              (
                document,
                index
              ) => {

                const edits =
                  toNumber(
                    document?.edits ??
                      document?.editCount
                  );

                const title =
                  document?.title ||
                  'Untitled document';

                const documentId =
                  document?.id ||
                  document?._id ||
                  `document-${index}`;

                return (
                  <div
                    className="analytics-document-row"
                    key={
                      documentId
                    }
                  >

                    <span
                      className="analytics-document-rank"
                      aria-label={`Rank ${index + 1}`}
                    >
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <div className="analytics-document-info">

                      <strong
                        title={title}
                      >
                        {title}
                      </strong>

                      {document?.updatedAt && (
                        <small>
                          Updated{' '}
                          {formatRelativeDate(
                            document.updatedAt
                          )}
                        </small>
                      )}

                    </div>

                    <span className="analytics-document-edits">
                      {formatNumber(
                        edits
                      )}{' '}
                      {edits === 1
                        ? 'edit'
                        : 'edits'}
                    </span>

                  </div>
                );
              }
            )}

          </div>

        ) : (

          <div
            className="analytics-empty"
            role="status"
          >
            <FileText
              size={24}
              aria-hidden="true"
            />

            <strong>
              No document activity
            </strong>

            <span>
              Create and edit a document
              to populate analytics.
            </span>
          </div>

        )}

      </Card>

      {/* ======================================================
          ACCESSIBILITY LIVE REGION
      ====================================================== */}

      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {loading
          ? 'Loading analytics'
          : `Showing analytics for the last ${days} days`}
      </div>

    </main>
  );
}

