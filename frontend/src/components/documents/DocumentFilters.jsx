
import React from 'react';
import './DocumentPremium.css';

const FILTER_OPTIONS = [
  {
    value: 'all',
    label: 'All documents',
  },
  {
    value: 'mine',
    label: 'My documents',
  },
  {
    value: 'shared',
    label: 'Shared with me',
  },
  {
    value: 'favorite',
    label: 'Favorites',
  },
];

const SORT_OPTIONS = [
  {
    value: 'updated',
    label: 'Recently updated',
  },
  {
    value: 'name',
    label: 'Name',
  },
  {
    value: 'created',
    label: 'Recently created',
  },
];

const VIEW_OPTIONS = [
  {
    value: 'grid',
    label: 'Grid view',
    icon: '▦',
  },
  {
    value: 'list',
    label: 'List view',
    icon: '☷',
  },
];

export default function DocumentFilters({
  filter = 'all',
  setFilter,
  sort = 'updated',
  setSort,
  view = 'grid',
  setView,
  disabled = false,
  className = '',
}) {
  const handleFilterChange = event => {
    if (typeof setFilter === 'function') {
      setFilter(event.target.value);
    }
  };

  const handleSortChange = event => {
    if (typeof setSort === 'function') {
      setSort(event.target.value);
    }
  };

  const handleViewChange = nextView => {
    if (
      disabled ||
      nextView === view ||
      typeof setView !== 'function'
    ) {
      return;
    }

    setView(nextView);
  };

  const classes = [
    'document-filters',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      role="toolbar"
      aria-label="Document filters and view options"
    >
      <div className="document-filter-group">
        <label
          className="sr-only"
          htmlFor="document-filter"
        >
          Filter documents
        </label>

        <select
          id="document-filter"
          className="document-filter-select"
          value={filter}
          onChange={handleFilterChange}
          disabled={disabled}
          aria-label="Filter documents"
        >
          {FILTER_OPTIONS.map(option => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="document-filter-group">
        <label
          className="sr-only"
          htmlFor="document-sort"
        >
          Sort documents
        </label>

        <select
          id="document-sort"
          className="document-filter-select"
          value={sort}
          onChange={handleSortChange}
          disabled={disabled}
          aria-label="Sort documents"
        >
          {SORT_OPTIONS.map(option => (
            <option
              key={option.value}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div
        className="view-toggle"
        role="group"
        aria-label="Document view"
      >
        {VIEW_OPTIONS.map(option => {
          const isActive =
            view === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={
                isActive
                  ? 'active'
                  : ''
              }
              onClick={() =>
                handleViewChange(
                  option.value
                )
              }
              disabled={disabled}
              aria-label={option.label}
              aria-pressed={isActive}
              title={option.label}
            >
              <span aria-hidden="true">
                {option.icon}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

