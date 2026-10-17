import React, { useMemo, useState } from 'react';
import Card from '../common/Card';
import './DashboardPremium.css';

const Y_AXIS_VALUES = [100, 75, 50, 25, 0];
const PERIODS = [{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }, { value: '180', label: 'Last 6 months' }, { value: '365', label: 'Last year' }];

function normalizeValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

export default function ProductivityChart({
  data = {},
  title = 'Document activity',
  loading = false,
  className = '',
  onPeriodChange,
}) {
  const [period, setPeriod] = useState('7');

  const currentData = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.[period] ?? data?.[Number(period)] ?? data?.['7'];
    if (!Array.isArray(list)) return [];

    return list.map((item, index) => ({
      id: item.id || `${period}-${index}`,
      label: item.label || `Item ${index + 1}`,
      value: normalizeValue(item.value),
    }));
  }, [data, period]);

  const chartMax = Math.max(
    ...currentData.map((item) => item.value),
    1
  );

  const handlePeriodChange = (event) => {
    const next = event.target.value;
    setPeriod(next);
    onPeriodChange?.(next);
  };

  return (
    <Card
      title={title}
      className={`productivity-chart-card ${className}`.trim()}
      action={
        <label className="chart-period-control">
          <span className="sr-only">Activity period</span>
          <select
            className="select-small"
            value={period}
            onChange={handlePeriodChange}
            disabled={loading}
            aria-label="Select activity period"
          >
            {PERIODS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </label>
      }
    >
      {loading ? (
        <div className="chart-loading" role="status">
          <div className="chart-loading-bars">
            {Array.from({ length: 7 }, (_, index) => (
              <span
                key={index}
                style={{ height: `${30 + index * 7}%` }}
              />
            ))}
          </div>
          <span>Loading activity...</span>
        </div>
      ) : !currentData.length ? (
        <div className="chart-empty" role="status">
          <strong>No activity yet</strong>
          <span>
            Document editing activity will appear here as your workspace grows.
          </span>
        </div>
      ) : (
        <div
          className="chart"
          role="img"
          aria-label={`${title} for the selected period`}
        >
          <div className="chart-y" aria-hidden="true">
            {Y_AXIS_VALUES.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>

          <div className="chart-area">
            <div className="chart-gridlines" aria-hidden="true">
              {Y_AXIS_VALUES.slice(1, -1).map((value) => (
                <i key={value} />
              ))}
            </div>

            <div className="chart-bars">
              {currentData.map((item) => (
                <div className="chart-bar-wrap" key={item.id}>
                  <div className="chart-bar-container">
                    <div
                      className="chart-bar"
                      style={{
                        height: `${Math.max(item.value > 0 ? 3 : 0, Math.min((item.value / chartMax) * 82, 82))}%`,
                      }}
                      title={`${item.label}: ${item.value} edits`}
                    />
                  </div>
                  <span className="chart-bar-label">{item.label}</span>
                  <span className="chart-bar-value">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
