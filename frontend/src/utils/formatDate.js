/* ============================================================
   SYNCDOC — DATE UTILITIES
   Centralized date formatting helpers.

   Features:
   - Safe invalid-date handling
   - ISO / timestamp / Date support
   - Relative time formatting
   - Future dates
   - Singular/plural handling
   - Configurable locale and options
============================================================ */

/* ============================================================
   CONSTANTS
============================================================ */

const DEFAULT_LOCALE = "en-IN";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/* ============================================================
   HELPERS
============================================================ */

/**
 * Convert a supported value into a valid Date.
 */
function toDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime())
      ? null
      : value;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

/**
 * Create a safe Intl.DateTimeFormat instance.
 */
function createFormatter(
  locale = DEFAULT_LOCALE,
  options = {}
) {
  return new Intl.DateTimeFormat(
    locale,
    options
  );
}

/**
 * Format a number with singular/plural unit.
 */
function formatUnit(
  value,
  singular,
  plural = `${singular}s`
) {
  return `${value} ${value === 1 ? singular : plural
    }`;
}

/* ============================================================
   STANDARD DATE FORMAT
============================================================ */

/**
 * Format date and time.
 *
 * Example:
 * formatDate("2026-09-01T13:00:00")
 *
 * => "1 Sept 2026, 1:00 pm"
 */
export function formatDate(
  value,
  options = {}
) {
  if (!value) {
    return "";
  }

  const date = toDate(value);

  if (!date) {
    return String(value);
  }

  const {
    locale = DEFAULT_LOCALE,
    dateStyle = "medium",
    timeStyle = "short",
  } = options;

  try {
    return createFormatter(
      locale,
      {
        dateStyle,
        timeStyle,
      }
    ).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/* ============================================================
   DATE ONLY
============================================================ */

/**
 * Format only the calendar date.
 *
 * Example:
 * "1 Sept 2026"
 */
export function formatDateOnly(
  value,
  options = {}
) {
  if (!value) {
    return "";
  }

  const date = toDate(value);

  if (!date) {
    return String(value);
  }

  const {
    locale = DEFAULT_LOCALE,
    dateStyle = "medium",
  } = options;

  try {
    return createFormatter(
      locale,
      {
        dateStyle,
      }
    ).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

/* ============================================================
   TIME ONLY
============================================================ */

/**
 * Format only the time.
 *
 * Example:
 * "1:30 pm"
 */
export function formatTime(
  value,
  options = {}
) {
  if (!value) {
    return "";
  }

  const date = toDate(value);

  if (!date) {
    return String(value);
  }

  const {
    locale = DEFAULT_LOCALE,
    timeStyle = "short",
  } = options;

  try {
    return createFormatter(
      locale,
      {
        timeStyle,
      }
    ).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/* ============================================================
   RELATIVE DATE
============================================================ */

/**
 * Format a date relative to the current time.
 *
 * Examples:
 * just now
 * 5 min ago
 * 2 hr ago
 * Yesterday
 * 3 days ago
 * 2 weeks ago
 */
export function formatRelativeDate(
  value,
  options = {}
) {
  if (!value) {
    return "Recently";
  }

  const date = toDate(value);

  if (!date) {
    return String(value);
  }

  const now =
    options.now instanceof Date
      ? options.now.getTime()
      : Date.now();

  const difference =
    now - date.getTime();

  const absoluteDifference =
    Math.abs(difference);

  const future =
    difference < 0;

  /* ----------------------------------------------------------
     Seconds
  ---------------------------------------------------------- */

  if (absoluteDifference < MINUTE) {
    return future
      ? "in a few seconds"
      : "just now";
  }

  /* ----------------------------------------------------------
     Minutes
  ---------------------------------------------------------- */

  if (absoluteDifference < HOUR) {
    const minutes = Math.floor(
      absoluteDifference / MINUTE
    );

    return future
      ? `in ${formatUnit(minutes, "min")}`
      : `${formatUnit(minutes, "min")} ago`;
  }

  /* ----------------------------------------------------------
     Hours
  ---------------------------------------------------------- */

  if (absoluteDifference < DAY) {
    const hours = Math.floor(
      absoluteDifference / HOUR
    );

    return future
      ? `in ${formatUnit(hours, "hr")}`
      : `${formatUnit(hours, "hr")} ago`;
  }

  /* ----------------------------------------------------------
     Days
  ---------------------------------------------------------- */

  if (absoluteDifference < WEEK) {
    const days = Math.floor(
      absoluteDifference / DAY
    );

    if (!future && days === 1) {
      return "Yesterday";
    }

    if (future && days === 1) {
      return "Tomorrow";
    }

    return future
      ? `in ${formatUnit(days, "day")}`
      : `${formatUnit(days, "day")} ago`;
  }

  /* ----------------------------------------------------------
     Weeks
  ---------------------------------------------------------- */

  if (absoluteDifference < 30 * DAY) {
    const weeks = Math.floor(
      absoluteDifference / WEEK
    );

    return future
      ? `in ${formatUnit(weeks, "week")}`
      : `${formatUnit(weeks, "week")} ago`;
  }

  /* ----------------------------------------------------------
     Older dates
  ---------------------------------------------------------- */

  return formatDateOnly(date, options);
}

/* ============================================================
   SHORT RELATIVE DATE
============================================================ */

/**
 * Compact relative format.
 *
 * Examples:
 * now
 * 5m
 * 2h
 * 3d
 * 2w
 */
export function formatRelativeShort(
  value,
  now = Date.now()
) {
  const date = toDate(value);

  if (!date) {
    return "—";
  }

  const difference =
    Math.abs(
      now - date.getTime()
    );

  if (difference < MINUTE) {
    return "now";
  }

  if (difference < HOUR) {
    return `${Math.floor(
      difference / MINUTE
    )}m`;
  }

  if (difference < DAY) {
    return `${Math.floor(
      difference / HOUR
    )}h`;
  }

  if (difference < WEEK) {
    return `${Math.floor(
      difference / DAY
    )}d`;
  }

  return `${Math.floor(
    difference / WEEK
  )}w`;
}

/* ============================================================
   SMART DATE
============================================================ */

/**
 * User-friendly date format.
 *
 * Today:
 *   "Today, 1:30 pm"
 *
 * Yesterday:
 *   "Yesterday, 4:20 pm"
 *
 * Older:
 *   "28 Aug 2026, 4:20 pm"
 */
export function formatSmartDate(
  value,
  options = {}
) {
  if (!value) {
    return "";
  }

  const date = toDate(value);

  if (!date) {
    return String(value);
  }

  const now =
    options.now instanceof Date
      ? options.now
      : new Date();

  const sameDay =
    date.toDateString() ===
    now.toDateString();

  const yesterday = new Date(now);

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  const isYesterday =
    date.toDateString() ===
    yesterday.toDateString();

  const time = formatTime(
    date,
    options
  );

  if (sameDay) {
    return `Today, ${time}`;
  }

  if (isYesterday) {
    return `Yesterday, ${time}`;
  }

  return formatDate(
    date,
    options
  );
}

/* ============================================================
   EXPORT DEFAULT
============================================================ */

export default {
  formatDate,
  formatDateOnly,
  formatTime,
  formatRelativeDate,
  formatRelativeShort,
  formatSmartDate,
};