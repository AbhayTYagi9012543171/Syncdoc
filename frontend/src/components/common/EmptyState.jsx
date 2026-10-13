
import React from "react";

/* ============================================================
   SYNCDOC — EMPTY STATE
   Reusable empty/loading/no-results state component
============================================================ */

const normalizeText = (value, fallback = "") => {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  if (
    typeof value === "string" ||
    typeof value === "number"
  ) {
    return String(value);
  }

  if (typeof value === "object") {
    return (
      value.label ||
      value.name ||
      value.title ||
      value.message ||
      fallback
    );
  }

  return fallback;
};

export default function EmptyState({
  icon = "□",
  title = "Nothing here yet",
  description = "",
  action = null,

  className = "",

  size = "md",

  role = "status",

  ariaLabel,

  children,
}) {
  const safeTitle = normalizeText(
    title,
    "Nothing here yet"
  );

  const safeDescription = normalizeText(
    description,
    ""
  );

  const normalizedSize = [
    "sm",
    "md",
    "lg",
  ].includes(size)
    ? size
    : "md";

  const classes = [
    "empty-state",
    `empty-state-${normalizedSize}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      role={role}
      aria-label={
        ariaLabel || safeTitle
      }
    >
      {icon !== null &&
        icon !== undefined && (
          <div
            className="empty-icon"
            aria-hidden="true"
          >
            {typeof icon === "object"
              ? icon
              : String(icon)}
          </div>
        )}

      <h3>{safeTitle}</h3>

      {safeDescription && (
        <p>{safeDescription}</p>
      )}

      {children}

      {action && (
        <div className="empty-action">
          {action}
        </div>
      )}
    </div>
  );
}
