import { useEffect, useRef } from "react";

/** Returns the value from the previous committed render (undefined initially). */
export default function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; }, [value]);
  return ref.current;
}
