import React from 'react';
import { Activity } from 'lucide-react';
import Avatar from '../common/Avatar';
import Card from '../common/Card';
import Skeleton from '../common/Skeleton';
import { formatRelativeDate } from '../../utils/formatDate';
import './DashboardPremium.css';

function ActivitySkeleton() {
  return (
    <div className="activity-list" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div className="activity-item" key={index}>
          <Skeleton variant="circle" width={36} height={36} radius="50%" />
          <div className="activity-content">
            <Skeleton width="75%" height={14} radius={6} />
            <Skeleton width="35%" height={12} radius={6} style={{ marginTop: 7 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ActivityFeed({
  activities = [],
  loading = false,
  onViewAll,
  showViewAll = false,
  title = 'Recent activity',
  limit = 6,
}) {
  const safeActivities = Array.isArray(activities) ? activities.slice(0, Math.max(1, limit)) : [];

  return (
    <Card
      title={title}
      action={
        showViewAll ? (
          <button
            type="button"
            className="text-btn"
            onClick={onViewAll}
            disabled={!onViewAll}
          >
            View all
          </button>
        ) : null
      }
      className="activity-card"
    >
      {loading ? (
        <ActivitySkeleton />
      ) : !safeActivities.length ? (
        <div className="activity-empty" role="status">
          <div className="activity-empty-icon" aria-hidden="true"><Activity size={21} /></div>
          <strong>No recent activity</strong>
          <span>Editing activity will appear here.</span>
        </div>
      ) : (
        <div className="activity-list" role="list">
          {safeActivities.map((activity, index) => {
            const name =
              activity.name ||
              activity.user?.displayName ||
              activity.user?.username ||
              'Unknown user';

            const parsedDate = activity.createdAt ? new Date(activity.createdAt) : null;
            const validDate = parsedDate && !Number.isNaN(parsedDate.getTime());
            let time = 'Recently';
            if (validDate) {
              try { time = formatRelativeDate(parsedDate.toISOString()) || 'Recently'; }
              catch { time = parsedDate.toLocaleDateString(); }
            }

            return (
              <div
                className="activity-item"
                key={activity.id || activity._id || `${activity.createdAt || "activity"}-${index}`}
                role="listitem"
              >
                <Avatar
                  name={name}
                  src={activity.user?.avatar}
                  size="sm"
                />

                <div className="activity-content">
                  <p className="activity-description">
                    <strong>{name}</strong>{' '}
                    {activity.action || 'updated a document'}
                  </p>
                  <time
                    className="activity-time"
                    dateTime={validDate ? parsedDate.toISOString() : undefined}
                    title={validDate ? parsedDate.toLocaleString() : ''}
                  >
                    {time}
                  </time>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
