/** Safe storage wrappers; usable in browsers, tests and restricted contexts. */
function getStorage(kind) {
  try {
    if (typeof window === "undefined") return null;
    return kind === "session" ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

export function getStoredValue(key, fallback = null, kind = "local") {
  if (!key) return fallback;
  const storage = getStorage(kind);
  if (!storage) return fallback;
  try {
    const value = storage.getItem(String(key));
    return value === null ? fallback : value;
  } catch { return fallback; }
}

export function setStoredValue(key, value, kind = "local") {
  if (!key) return false;
  const storage = getStorage(kind);
  if (!storage) return false;
  try { storage.setItem(String(key), String(value)); return true; }
  catch { return false; }
}

export function removeStoredValue(key, kind = "local") {
  if (!key) return false;
  const storage = getStorage(kind);
  if (!storage) return false;
  try { storage.removeItem(String(key)); return true; }
  catch { return false; }
}

export function getStoredJSON(key, fallback = null, kind = "local") {
  const value = getStoredValue(key, null, kind);
  if (value === null) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

export function setStoredJSON(key, value, kind = "local") {
  try { return setStoredValue(key, JSON.stringify(value), kind); }
  catch { return false; }
}

export default { getStoredValue, setStoredValue, removeStoredValue, getStoredJSON, setStoredJSON };

