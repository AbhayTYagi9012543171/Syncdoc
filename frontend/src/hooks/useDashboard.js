
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import dashboardService from "../services/dashboardService";

function getAuthToken() {
  try {
    return (
      localStorage.getItem("syncdoc_token") ||
      localStorage.getItem("token") ||
      ""
    );
  } catch {
    return "";
  }
}

function extractDashboard(response) {
  const data = response?.data ?? response;

  if (!data || typeof data !== "object") {
    return null;
  }

  if (
    data.stats ||
    data.productivity ||
    data.activity ||
    data.recentDocuments
  ) {
    return data;
  }

  if (data.data && typeof data.data === "object") {
    return extractDashboard(data.data);
  }

  return data;
}

function isCanceledError(error) {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
}

const inFlightDashboardRequests = new Map();

function getDashboardOnce(token) {
  const existing = inFlightDashboardRequests.get(token);

  if (existing) {
    return existing;
  }

  const request = Promise.resolve()
    .then(() => dashboardService.get())
    .finally(() => {
      if (inFlightDashboardRequests.get(token) === request) {
        inFlightDashboardRequests.delete(token);
      }
    });

  inFlightDashboardRequests.set(token, request);

  return request;
}

export default function useDashboard({ autoLoad = true } = {}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [error, setError] = useState(null);

  const mountedRef = useRef(false);
  const requestRef = useRef(0);
  const retryAfterRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;
    const token = getAuthToken();

    if (!token) {
      if (mountedRef.current) {
        setDashboard(null);
        setError(null);
        setLoading(false);
      }

      return null;
    }

    // Do not send another request during the server's cooldown.
    if (Date.now() < retryAfterRef.current) {
      return null;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await getDashboardOnce(token);
      const data = extractDashboard(response);

      if (
        !mountedRef.current ||
        requestId !== requestRef.current ||
        getAuthToken() !== token
      ) {
        return data;
      }

      retryAfterRef.current = 0;
      setDashboard(data);

      return data;
    } catch (requestError) {
      if (
        !mountedRef.current ||
        requestId !== requestRef.current ||
        isCanceledError(requestError)
      ) {
        return null;
      }

      const status = requestError?.response?.status;

      if (status === 429) {
        const headers = requestError?.response?.headers || {};

        const rawRetryAfter =
          headers["retry-after"] ??
          headers["Retry-After"];

        const retryAfterSeconds = Number(rawRetryAfter);

        // Fallback to 60 seconds if the server provides no valid value.
        const delaySeconds =
          Number.isFinite(retryAfterSeconds) &&
          retryAfterSeconds > 0
            ? Math.min(retryAfterSeconds, 15 * 60)
            : 60;

        retryAfterRef.current =
          Date.now() + delaySeconds * 1000;

        console.warn(
          `SyncDoc dashboard rate-limited. ` +
          `Pausing retries for ${delaySeconds} seconds.`
        );
      } else {
        console.error(
          "SyncDoc: failed to load dashboard:",
          requestError
        );
      }

      setError(requestError);

      // Preserve existing dashboard data during transient failures.
      return null;
    } finally {
      if (
        mountedRef.current &&
        requestId === requestRef.current
      ) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return undefined;
    }

    void reload();

    // Refresh less frequently to reduce unnecessary API traffic.
    const refreshId = setInterval(() => {
      void reload();
    }, 60000);

    return () => {
      clearInterval(refreshId);
    };
  }, [autoLoad, reload]);

  return {
    dashboard,

    stats: dashboard?.stats ?? [],
    productivity: dashboard?.productivity ?? {},
    activity: dashboard?.activity ?? [],
    recentDocuments: dashboard?.recentDocuments ?? [],
    generatedAt: dashboard?.generatedAt ?? null,

    loading,
    error,

    reload,
  };
}
