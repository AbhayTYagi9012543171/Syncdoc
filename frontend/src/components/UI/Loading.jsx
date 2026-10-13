import React from "react";

/**
 * ============================================================
 * SYNCDOC — LOADING COMPONENT
 * ============================================================
 *
 * Reusable loading state for:
 * - Full page loading
 * - Inline section loading
 * - Cards
 * - Tables
 * - Buttons / actions
 * - Async page transitions
 *
 * Usage:
 *
 * <Loading />
 *
 * <Loading fullScreen />
 *
 * <Loading label="Loading documents..." />
 *
 * <Loading size="sm" label="Saving..." />
 *
 * <Loading overlay label="Please wait..." />
 * ============================================================
 */

const ALLOWED_SIZES = ["sm", "md", "lg"];

export default function Loading({
  fullScreen = false,
  overlay = false,
  label = "Loading...",
  size = "md",
  className = "",
  showLabel = true,
}) {
  const safeSize = ALLOWED_SIZES.includes(size) ? size : "md";

  const classes = [
    "loading",
    fullScreen ? "loading-fullscreen" : "",
    overlay ? "loading-overlay" : "",
    `loading-${safeSize}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role="status"
      aria-live="polite"
      aria-label={label || "Loading"}
    >
      <span
        className="loading-spinner"
        aria-hidden="true"
      />

      {showLabel && label && (
        <span className="loading-label">
          {label}
        </span>
      )}

      <span className="sr-only">
        {label || "Loading"}
      </span>
    </div>
  );
}