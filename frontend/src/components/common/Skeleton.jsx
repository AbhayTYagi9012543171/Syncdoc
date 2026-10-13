
import React from 'react';

const allowedVariants = [
  'default',
  'text',
  'circle',
  'avatar',
  'button',
  'card',
];

export default function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  variant = 'default',
  animated = true,
  className = '',
  style = {},
  count = 1,
  ...props
}) {
  const safeVariant = allowedVariants.includes(variant)
    ? variant
    : 'default';

  const classes = [
    'skeleton',
    `skeleton-${safeVariant}`,
    animated ? 'skeleton-animated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const skeletonStyle = {
    width,
    height,
    borderRadius: radius,
    ...style,
  };

  const items = Array.from(
    { length: Math.max(1, count) },
    (_, index) => index
  );

  return (
    <>
      {items.map((index) => (
        <span
          key={index}
          className={classes}
          style={skeletonStyle}
          aria-hidden="true"
          {...props}
        />
      ))}
    </>
  );
}
