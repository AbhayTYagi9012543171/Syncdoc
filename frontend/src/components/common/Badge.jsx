
import React from 'react';

const allowedVariants = ['neutral', 'success', 'warning', 'danger', 'info', 'primary'];

const normalizeText = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return (
      value.label ||
      value.name ||
      value.title ||
      value.role ||
      value.status ||
      'Unknown'
    );
  }

  return String(value);
};

export default function Badge({
  children,
  variant = 'neutral',
  className = '',
  title,
  ariaLabel,
  ...props
}) {
  const normalizedVariant = allowedVariants.includes(variant)
    ? variant
    : 'neutral';

  const text = normalizeText(children);

  const classes = [
    'badge',
    `badge-${normalizedVariant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const accessibleLabel = ariaLabel || title || text;

  return (
    <span
      className={classes}
      title={title || text}
      aria-label={accessibleLabel || undefined}
      {...props}
    >
      {text || '—'}
    </span>
  );
}