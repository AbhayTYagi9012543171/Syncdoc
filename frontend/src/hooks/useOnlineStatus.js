import { useEffect, useState } from "react";

/** Reactive network status; this reports browser connectivity, not API health. */
export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
