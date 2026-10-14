const DEFAULT_LOCALE = "en-IN";

export function formatNumber(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  try { return new Intl.NumberFormat(options.locale || DEFAULT_LOCALE, options).format(number); }
  catch { return String(number); }
}

export function formatCompactNumber(value, locale = DEFAULT_LOCALE) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  try { return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(number); }
  catch { return formatNumber(number, { locale }); }
}

export function formatBytes(value, decimals = 1) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / (1024 ** index);
  return `${Number(amount.toFixed(Math.max(0, decimals)))} ${units[index]}`;
}

export function formatPercentage(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return `${number.toFixed(Math.max(0, digits))}%`;
}

export function formatInitials(name, fallback = "U") {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return fallback;
  return words.slice(0, 2).map((word) => Array.from(word)[0]?.toUpperCase() || "").join("");
}

export default { formatNumber, formatCompactNumber, formatBytes, formatPercentage, formatInitials };

