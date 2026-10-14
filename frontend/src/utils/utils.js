/** Small general-purpose helpers shared across SyncDoc screens. */
export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

export function debounce(callback, delay = 250) {
  let timer = null;
  const debounced = (...args) => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; callback(...args); }, Math.max(0, delay));
  };
  debounced.cancel = () => { if (timer !== null) clearTimeout(timer); timer = null; };
  debounced.flush = (...args) => { if (timer !== null) clearTimeout(timer); timer = null; return callback(...args); };
  return debounced;
}

export function uniqueBy(items, keyOrGetter) {
  if (!Array.isArray(items)) return [];
  const getKey = typeof keyOrGetter === "function" ? keyOrGetter : (item) => item?.[keyOrGetter];
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (key === undefined || key === null) return true;
    const normalized = String(key);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

export function sortByDate(items, getter = (item) => item?.updatedAt, direction = "desc") {
  if (!Array.isArray(items)) return [];
  const sign = direction === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const left = new Date(getter(a) || 0).getTime();
    const right = new Date(getter(b) || 0).getTime();
    return ((Number.isFinite(left) ? left : 0) - (Number.isFinite(right) ? right : 0)) * sign;
  });
}

export function createRequestId(prefix = "req") {
  const random = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${random}`;
}

export function isNonEmptyArray(value) { return Array.isArray(value) && value.length > 0; }

export default { clamp, debounce, uniqueBy, sortByDate, createRequestId, isNonEmptyArray };

