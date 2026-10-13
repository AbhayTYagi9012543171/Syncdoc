
import React, { Fragment, useMemo } from 'react';
import { Link } from 'react-router-dom';

const DEFAULT_SEPARATOR = '›';

function normalizeLabel(label) {
  if (label === null || label === undefined) {
    return '';
  }

  if (typeof label === 'string' || typeof label === 'number') {
    return String(label).trim();
  }

  if (typeof label === 'object') {
    return (
      label.label ||
      label.name ||
      label.title ||
      'Untitled'
    );
  }

  return String(label);
}

function normalizeItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.filter(Boolean);
}

export default function Breadcrumbs({
  items = [],
  separator = DEFAULT_SEPARATOR,
  className = '',
  ariaLabel = 'Breadcrumb',
  maxItems,
}) {
  const normalizedItems = useMemo(
    () => normalizeItems(items),
    [items]
  );

  const visibleItems = useMemo(() => {
    if (
      !Number.isInteger(maxItems) ||
      maxItems <= 0 ||
      normalizedItems.length <= maxItems
    ) {
      return normalizedItems;
    }

    if (maxItems === 1) {
      return [normalizedItems.at(-1)];
    }

    return [
      normalizedItems[0],
      {
        label: '…',
        isEllipsis: true,
      },
      ...normalizedItems.slice(
        -(maxItems - 2)
      ),
    ];
  }, [maxItems, normalizedItems]);

  if (visibleItems.length === 0) {
    return null;
  }

  const classes = [
    'breadcrumbs',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <nav
      className={classes}
      aria-label={ariaLabel}
    >
      <ol className="breadcrumbs-list">
        {visibleItems.map((item, index) => {
          const label = normalizeLabel(
            item.label
          );

          const isLast =
            index === visibleItems.length - 1;

          const isEllipsis =
            item.isEllipsis === true;

          const key =
            item.id ||
            item.key ||
            item.to ||
            `${label}-${index}`;

          return (
            <Fragment key={key}>
              {index > 0 && (
                <li
                  className="breadcrumbs-separator"
                  aria-hidden="true"
                >
                  {separator}
                </li>
              )}

              <li
                className={`breadcrumbs-item ${
                  isLast
                    ? 'breadcrumbs-current'
                    : ''
                }`.trim()}
              >
                {isEllipsis ? (
                  <span
                    className="breadcrumbs-ellipsis"
                    aria-hidden="true"
                  >
                    {label}
                  </span>
                ) : item.to && !isLast ? (
                  <Link
                    to={item.to}
                    className="breadcrumbs-link"
                  >
                    {label}
                  </Link>
                ) : (
                  <span
                    className="breadcrumbs-label"
                    aria-current={
                      isLast
                        ? 'page'
                        : undefined
                    }
                  >
                    {label}
                  </span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
