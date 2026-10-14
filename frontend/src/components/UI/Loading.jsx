import React from "react";
import "./Loading.css";

const ALLOWED_SIZES = ["sm", "md", "lg", "xl"];
const ALLOWED_VARIANTS = ["spinner", "dots", "orbit", "bars"];

export default function Loading({
  fullScreen = false,
  overlay = false,
  label = "Loading...",
  description = "",
  size = "md",
  variant = "orbit",
  className = "",
  showLabel = true,
  showProgress = false,
  progress,
  backdrop = true,
  brand = "SyncDoc",
  compact = false,
}) {
  const safeSize = ALLOWED_SIZES.includes(size) ? size : "md";
  const safeVariant = ALLOWED_VARIANTS.includes(variant) ? variant : "orbit";
  const hasProgress = showProgress || Number.isFinite(progress);
  const safeProgress = Number.isFinite(progress)
    ? Math.min(100, Math.max(0, progress))
    : undefined;

  const classes = [
    "sd-loading",
    `sd-loading--${safeSize}`,
    `sd-loading--${safeVariant}`,
    fullScreen ? "sd-loading--fullscreen" : "",
    overlay ? "sd-loading--overlay" : "",
    backdrop ? "sd-loading--backdrop" : "",
    compact ? "sd-loading--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const visual = (
    <div className="sd-loading__content">
      <div className={`sd-loading__visual sd-loading__visual--${safeVariant}`} aria-hidden="true">
        {safeVariant === "dots" && (
          <span className="sd-loading__dots">
            <i /><i /><i />
          </span>
        )}
        {safeVariant === "bars" && (
          <span className="sd-loading__bars">
            <i /><i /><i /><i /><i />
          </span>
        )}
        {safeVariant === "spinner" && (
          <span className="sd-loading__spinner" />
        )}
        {safeVariant === "orbit" && (
          <span className="sd-loading__orbit">
            <i className="sd-loading__orbit-ring" />
            <i className="sd-loading__orbit-ring sd-loading__orbit-ring--inner" />
            <i className="sd-loading__orbit-core">S</i>
          </span>
        )}
      </div>

      {(showLabel && label) || description ? (
        <div className="sd-loading__copy">
          {showLabel && label && <span className="sd-loading__label">{label}</span>}
          {description && <span className="sd-loading__description">{description}</span>}
        </div>
      ) : null}

      {hasProgress && (
        <div
          className="sd-loading__progress"
          role={safeProgress === undefined ? "status" : "progressbar"}
          aria-label={label || "Loading progress"}
          aria-valuemin={safeProgress === undefined ? undefined : 0}
          aria-valuemax={safeProgress === undefined ? undefined : 100}
          aria-valuenow={safeProgress}
        >
          <span
            className={`sd-loading__progress-fill ${safeProgress === undefined ? "is-indeterminate" : ""}`}
            style={safeProgress === undefined ? undefined : { width: `${safeProgress}%` }}
          />
        </div>
      )}

      <span className="sd-loading__sr-only" role="status" aria-live="polite">
        {label || "Loading"}
        {safeProgress !== undefined ? ` ${safeProgress}%` : ""}
      </span>
    </div>
  );

  if (fullScreen || overlay) {
    return (
      <div className={classes} aria-label={label || "Loading"}>
        <div className="sd-loading__backdrop" />
        <div className="sd-loading__surface">
          {fullScreen && brand && (
            <div className="sd-loading__brand" aria-label={brand}>
              <span className="sd-loading__brand-mark">S</span>
              <span>{brand}</span>
            </div>
          )}
          {visual}
          {fullScreen && <span className="sd-loading__secure">A moment while we get things ready</span>}
        </div>
      </div>
    );
  }

  return <div className={classes}>{visual}</div>;
}
