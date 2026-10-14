import { useCallback, useState } from "react";

/** Boolean state with stable toggle, setTrue and setFalse helpers. */
export default function useToggle(initialValue = false) {
  const [value, setValue] = useState(Boolean(initialValue));
  const toggle = useCallback(() => setValue((current) => !current), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  return { value, setValue, toggle, setTrue, setFalse };
}
