import { useEffect, useState } from "react";

/** Returns true after the component has mounted in the browser. */
export default function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  return mounted;
}
