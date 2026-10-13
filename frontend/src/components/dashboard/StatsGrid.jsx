import React from 'react';
import { FileText, Share2, FolderKanban, Users, BarChart3 } from 'lucide-react';
import Skeleton from '../common/Skeleton';
import './DashboardPremium.css';

const ICONS = { documents: FileText, shared: Share2, projects: FolderKanban, collaborators: Users };

function normalizeStats(stats) {
  if (!Array.isArray(stats)) return [];

  return stats.map((stat, index) => {
    if (!stat || typeof stat !== 'object') return null;

    const change = stat.change ?? '';
    const normalizedChange = String(change).trim();

    return {
      id: stat.id || stat.key || `stat-${index}`,
      label: stat.label || 'Statistic',
      value: stat.value ?? stat.count ?? 0,
      change,
      changeType:
        stat.changeType ||
        (normalizedChange.startsWith('-')
          ? 'negative'
          : normalizedChange.startsWith('+')
            ? 'positive'
            : 'neutral'),
      icon: stat.icon || '•',
      description: stat.description || '',
      onClick: stat.onClick,
    };
  }).filter(Boolean);
}

function StatsSkeleton({ count = 4 }) {
  return (
    <div className="stats-grid stats-grid-loading" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div className="stat-card" key={index}>
          <div className="stat-top">
            <Skeleton width={38} height={38} radius={10} />
            <Skeleton width={42} height={14} radius={6} />
          </div>
          <Skeleton width={70} height={30} radius={7} />
          <Skeleton width={130} height={14} radius={6} />
        </div>
      ))}
    </div>
  );
}

export default function StatsGrid({
  stats = [],
  loading = false,
  className = '',
  onStatClick,
}) {
  if (loading) return <StatsSkeleton />;

  const normalizedStats = normalizeStats(stats);

  if (!normalizedStats.length) {
    return (
      <div className="stats-empty" role="status">
        No statistics available yet.
      </div>
    );
  }

  return (
    <div
      className={`stats-grid ${className}`.trim()}
      aria-label="Workspace statistics"
    >
      {normalizedStats.map((stat) => {
        const clickable =
          typeof stat.onClick === 'function' ||
          typeof onStatClick === 'function';

        const Tag = clickable ? 'button' : 'div';

        return (
          <Tag
            key={stat.id}
            type={clickable ? 'button' : undefined}
            className={`stat-card ${clickable ? 'stat-card-clickable' : ''}`.trim()}
            onClick={
              clickable
                ? () => {
                    if (typeof stat.onClick === 'function') {
                      stat.onClick(stat);
                    } else {
                      onStatClick?.(stat);
                    }
                  }
                : undefined
            }
          >
            <div className="stat-top">
              <span className="stat-icon" aria-hidden="true">
                {React.createElement(ICONS[stat.id] || BarChart3, { size: 17 })}
              </span>

              {stat.change !== '' && (
                <span className={`stat-change stat-change-${stat.changeType}`}>
                  {stat.change}
                </span>
              )}
            </div>

            <strong className="stat-value">
              {typeof stat.value === 'number'
                ? stat.value.toLocaleString()
                : stat.value}
            </strong>

            <span className="stat-label">
              {stat.label}
            </span>

            {stat.description && (
              <small className="stat-description">
                {stat.description}
              </small>
            )}
          </Tag>
        );
      })}
    </div>
  );
}
