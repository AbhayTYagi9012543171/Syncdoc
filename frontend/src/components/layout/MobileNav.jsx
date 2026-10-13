
import React from 'react';

export default function MobileNav({
  onMenuClick,
  label = 'Menu',
  className = '',
  disabled = false,
}) {
  const classes = [
    'mobile-bottom-menu',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (event) => {
    if (disabled) {
      return;
    }

    onMenuClick?.(event);
  };

  return (
    <button
      type="button"
      className={classes}
      onClick={handleClick}
      disabled={disabled}
      aria-label={label}
      aria-haspopup="true"
      aria-controls="mobile-navigation"
    >
      <span
        className="mobile-bottom-menu-icon"
        aria-hidden="true"
      >
        ☰
      </span>

      <span className="mobile-bottom-menu-label">
        {label}
      </span>
    </button>
  );
}

