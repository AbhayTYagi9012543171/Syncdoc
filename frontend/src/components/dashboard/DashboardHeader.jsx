
import React from 'react';

import Button from '../common/Button';
import './DashboardPremium.css';

export default function DashboardHeader({
  onCreate,
  title = 'Good to see you again 👋',
  subtitle = 'Keep your ideas moving and your team in sync.',
  eyebrow = 'YOUR WORKSPACE',
  createLabel = 'New document',
  createIcon = '＋',
  creating = false,
  disabled = false,
  secondaryAction = null,
  className = '',
}) {
  const classes = [
    'dashboard-header',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleCreate = () => {
    if (
      typeof onCreate === 'function' &&
      !creating &&
      !disabled
    ) {
      onCreate();
    }
  };

  return (
    <header className={classes}>
      <div className="dashboard-header-content">
        <span className="eyebrow">
          {eyebrow}
        </span>

        <h1>
          {title}
        </h1>

        <p>
          {subtitle}
        </p>
      </div>

      <div className="dashboard-header-actions">
        {secondaryAction && (
          <div className="dashboard-header-secondary">
            {secondaryAction}
          </div>
        )}

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={handleCreate}
          loading={creating}
          disabled={disabled || creating || !onCreate}
          loadingText="Creating..."
          ariaLabel={createLabel}
        >
          <span
            className="dashboard-header-button-content"
          >
            <span
              className="dashboard-header-button-icon"
              aria-hidden="true"
            >
              {createIcon}
            </span>

            <span>
              {createLabel}
            </span>
          </span>
        </Button>
      </div>
    </header>
  );
}
