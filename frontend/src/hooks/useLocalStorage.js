import { useCallback, useState } from "react";

function readValue(key, initialValue) {
  if (typeof window === "undefined") return initialValue;
  try {
    const stored = window.localStorage.getItem(key);
    return stored === null ? initialValue : JSON.parse(stored);
  } catch {
    return initialValue;
  }
}

/** Persist serializable UI preferences. Do not use for auth tokens or secrets. */
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readValue(key, initialValue));

  const setStoredValue = useCallback((nextValue) => {
    setValue((current) => {
      const resolved = typeof nextValue === "function" ? nextValue(current) : nextValue;
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(resolved));
      } catch { /* Storage may be disabled or full; in-memory state still works. */ }
      return resolved;
    });
  }, [key]);

  const removeValue = useCallback(() => {
    try { if (typeof window !== "undefined") window.localStorage.removeItem(key); } catch { /* Ignore storage access errors. */ }
    setValue(initialValue);
  }, [initialValue, key]);

  return [value, setStoredValue, removeValue];
}
