import { useEffect, useRef } from "react";

/**
 * Register a keyboard shortcut. Example: useKeyboardShortcut("k", openSearch, { ctrlOrMeta: true }).
 * Inputs and editable elements are ignored unless allowInInputs is true.
 */
export default function useKeyboardShortcut(key, callback, options = {}) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const { ctrl = false, meta = false, ctrlOrMeta = false, shift = false, alt = false, enabled = true, allowInInputs = false } = options;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;
    const handler = (event) => {
      const target = event.target;
      const isEditable = target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if (!allowInInputs && isEditable) return;
      const normalizedKey = String(key || "").toLowerCase();
      if (event.key.toLowerCase() !== normalizedKey) return;
      if (ctrlOrMeta) {
        if (!event.ctrlKey && !event.metaKey) return;
      } else {
        if (event.ctrlKey !== ctrl || event.metaKey !== meta) return;
      }
      if (event.shiftKey !== shift || event.altKey !== alt) return;
      event.preventDefault();
      callbackRef.current?.(event);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, ctrl, meta, ctrlOrMeta, shift, alt, enabled, allowInInputs]);
}
