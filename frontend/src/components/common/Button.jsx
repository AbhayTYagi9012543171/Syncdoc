import './CommonPremium.css';

import React from 'react';

const allowedVariants = [
  'primary',
  'secondary',
  'danger',
  'success',
  'ghost',
  'outline',
  'link',
];

const allowedSizes = ['xs', 'sm', 'md', 'lg', 'xl'];

const getSafeValue = (value, allowedValues, fallback) =>
  allowedValues.includes(value) ? value : fallback;

export default function Button({
  children,
  variant = 'secondary',
  size = 'md',
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon = null,
  rightIcon = null,
  loadingText = 'Loading...',
  className = '',
  ariaLabel,
  ...props
}) {
  const safeVariant = getSafeValue(
    variant,
    allowedVariants,
    'secondary'
  );

  const safeSize = getSafeValue(
    size,
    allowedSizes,
    'md'
  );

  const isDisabled = disabled || loading;

  const classes = [
    'btn',
    `btn-${safeVariant}`,
    `btn-${safeSize}`,
    fullWidth ? 'btn-full-width' : '',
    loading ? 'btn-loading' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const accessibleLabel =
    ariaLabel ||
    (typeof children === 'string' ? children : undefined);

  return (
    <button
      {...props}
      type={type}
      className={classes}
      disabled={isDisabled}
      aria-label={accessibleLabel}
      aria-busy={loading}
      aria-disabled={isDisabled}
    >
      {loading ? (
        <>
          <span
            className="btn-spinner"
            aria-hidden="true"
          />

          <span className="btn-loading-text">
            {loadingText}
          </span>
        </>
      ) : (
        <>
          {leftIcon && (
            <span
              className="btn-icon btn-icon-left"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          )}

          <span className="btn-content">
            {children}
          </span>

          {rightIcon && (
            <span
              className="btn-icon btn-icon-right"
              aria-hidden="true"
            >
              {rightIcon}
            </span>
          )}
        </>
      )}
    </button>
  );
}

