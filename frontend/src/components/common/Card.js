import './CommonPremium.css';

import React from 'react';

const normalizeContent = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value);
  }

  if (typeof value === 'object') {
    return (
      value.title ||
      value.name ||
      value.label ||
      value.text ||
      fallback
    );
  }

  return String(value);
};

export default function Card({
  children,
  className = '',
  title,
  subtitle,
  action,
  footer,
  padding = true,
  bordered = true,
  elevated = false,
  hoverable = false,
  compact = false,
  loading = false,
  as: Component = 'section',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  ...props
}) {
  const normalizedTitle = normalizeContent(
    title,
    ''
  );

  const normalizedSubtitle = normalizeContent(
    subtitle,
    ''
  );

  const hasHeader =
    Boolean(normalizedTitle) ||
    Boolean(normalizedSubtitle) ||
    Boolean(action);

  const classes = [
    'card',
    padding ? '' : 'card-no-padding',
    bordered ? '' : 'card-no-border',
    elevated ? 'card-elevated' : '',
    hoverable ? 'card-hoverable' : '',
    compact ? 'card-compact' : '',
    loading ? 'card-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const headerClasses = [
    'card-header',
    headerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const bodyClasses = [
    'card-body',
    bodyClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const footerClasses = [
    'card-footer',
    footerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Component
      className={classes}
      aria-busy={loading || undefined}
      {...props}
    >
      {hasHeader && (
        <header className={headerClasses}>
          <div className="card-heading">
            {normalizedTitle && (
              <h3 className="card-title">
                {normalizedTitle}
              </h3>
            )}

            {normalizedSubtitle && (
              <p className="card-subtitle">
                {normalizedSubtitle}
              </p>
            )}
          </div>

          {action && (
            <div className="card-action">
              {action}
            </div>
          )}
        </header>
      )}

      <div className={bodyClasses}>
        {loading ? (
          <div
            className="card-loading-state"
            role="status"
            aria-live="polite"
          >
            <span
              className="card-spinner"
              aria-hidden="true"
            />
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </div>

      {footer && (
        <footer className={footerClasses}>
          {footer}
        </footer>
      )}
    </Component>
  );
}

