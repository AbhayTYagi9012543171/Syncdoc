
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import dashboardService from "../services/dashboardService";

/* ============================================================
   HELPERS
   ============================================================ */

function getAuthToken() {
  try {
    return localStorage.getItem("syncdoc_token") || "";
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

  return null;
}

function isCanceledError(error) {
  return (
    error?.code === "ERR_CANCELED" ||
    error?.name === "CanceledError" ||
    error?.name === "AbortError"
  );
}

/* ============================================================
   REQUEST DEDUPLICATION
   ============================================================ */

// Reuse a dashboard request while it is still in progress.
// Token is part of the key so different sessions don't share data.
const inFlightDashboardRequests = new Map();

function getDashboardOnce(token) {
  const existingRequest = inFlightDashboardRequests.get(token);

  if (existingRequest) {
    return existingRequest;
  }

  let request;

  request = Promise.resolve()
    .then(() => dashboardService.get())
    .finally(() => {
      if (inFlightDashboardRequests.get(token) === request) {
        inFlightDashboardRequests.delete(token);
      }
    });

  inFlightDashboardRequests.set(token, request);

  return request;
}

/* ============================================================
   HOOK
   ============================================================ */

export default function useDashboard({ autoLoad = true } = {}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(Boolean(autoLoad));
  const [error, setError] = useState(null);

  const mountedRef = useRef(false);
  const requestRef = useRef(0);

  /* ==========================================================
     MOUNT / UNMOUNT
     ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestRef.current += 1;
    };
  }, []);

  /* ==========================================================
     LOAD / RELOAD DASHBOARD
     ========================================================== */

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

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await getDashboardOnce(token);
      const data = extractDashboard(response);

      // Prevent stale data from overwriting a newer request or session.
      if (
        !mountedRef.current ||
        requestId !== requestRef.current ||
        getAuthToken() !== token
      ) {
        return data;
      }

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

      console.error(
        "SyncDoc: failed to load dashboard:",
        requestError
      );

      setError(requestError);
      setDashboard(null);

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

  /* ==========================================================
     INITIAL LOAD
     ========================================================== */

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return undefined;
    }

    void reload();

    // Keep Recent activity and dashboard metrics fresh while the app remains open.
    const refreshId = setInterval(() => { void reload(); }, 15000);
    return () => clearInterval(refreshId);
  }, [autoLoad, reload]);

  /* ==========================================================
     RETURN DASHBOARD DATA
     ========================================================== */

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
