/** Safe text and search helpers for user-generated content. */
export function toPlainText(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value.trim() || fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function truncateText(value, maxLength = 120, suffix = "…") {
  const text = toPlainText(value);
  const limit = Math.max(0, Number(maxLength) || 0);
  if (text.length <= limit) return text;
  if (limit <= suffix.length) return suffix.slice(0, limit);
  return `${text.slice(0, limit - suffix.length).trimEnd()}${suffix}`;
}

export function normalizeSearchText(value) {
  return toPlainText(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();
}

export function includesSearch(value, query) {
  const needle = normalizeSearchText(query);
  return !needle || normalizeSearchText(value).includes(needle);
}

export function escapeRegExp(value) {
  return String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(value) {
  return normalizeSearchText(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function getWordCount(value) {
  const text = toPlainText(value).trim();
  return text ? text.split(/\s+/u).length : 0;
}

export default { toPlainText, truncateText, normalizeSearchText, includesSearch, escapeRegExp, slugify, getWordCount };

