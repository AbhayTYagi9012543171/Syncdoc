import React from 'react';
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
}) {
  return (
    <Card
      title="Recent activity"
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
      ) : !activities.length ? (
        <div className="activity-empty" role="status">
          <div className="activity-empty-icon" aria-hidden="true">◷</div>
          <strong>No recent activity</strong>
          <span>Editing activity will appear here.</span>
        </div>
      ) : (
        <div className="activity-list" role="list">
          {activities.map((activity) => {
            const name =
              activity.name ||
              activity.user?.displayName ||
              activity.user?.username ||
              'Unknown user';

            const time = activity.createdAt
              ? formatRelativeDate(activity.createdAt)
              : 'Recently';

            return (
              <div
                className="activity-item"
                key={activity.id || activity._id}
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
                  <small
                    className="activity-time"
                    title={activity.createdAt || ''}
                  >
                    {time}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
