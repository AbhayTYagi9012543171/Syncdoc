import {
  useEffect,
  useRef,
  useState,
} from "react";

/* ============================================================
   SYNCDOC — useDebounce
   ============================================================ */

/**
 * Debounces a changing value.
 *
 * Useful for:
 * - Global search
 * - Document search
 * - Workspace filtering
 * - Autosave
 * - API requests
 * - Live validation
 *
 * Default behavior:
 * - trailing update
 * - 300ms delay
 *
 * Example:
 *
 * const debouncedSearch = useDebounce(
 *   search,
 *   400
 * );
 */

export default function useDebounce(
  value,
  delay = 300
) {
  /* ==========================================================
     STATE
  ========================================================== */

  const [
    debouncedValue,
    setDebouncedValue,
  ] = useState(value);

  /* ==========================================================
     PREVIOUS VALUE
  ========================================================== */

  const previousValueRef =
    useRef(value);

  /* ==========================================================
     NORMALIZE DELAY
  ========================================================== */

  const normalizedDelay =
    Number.isFinite(Number(delay))
      ? Math.max(0, Number(delay))
      : 300;

  /* ==========================================================
     DEBOUNCE EFFECT
  ========================================================== */

  useEffect(() => {
    /*
     * Keep the latest value reference.
     */
    previousValueRef.current =
      value;

    /*
     * No delay means update immediately.
     */
    if (normalizedDelay === 0) {
      setDebouncedValue(value);

      return undefined;
    }

    /*
     * Delay the state update until the
     * user stops changing the value.
     */
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, normalizedDelay);

    /*
     * Cancel the previous timer whenever
     * value or delay changes.
     */
    return () => {
      clearTimeout(timer);
    };
  }, [
    value,
    normalizedDelay,
  ]);

  /* ==========================================================
     RETURN
  ========================================================== */

  return debouncedValue;
}