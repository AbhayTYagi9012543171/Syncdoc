import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import dashboardService from '../services/dashboardService';

function hasAuthToken() {
  try {
    return Boolean(localStorage.getItem('syncdoc_token'));
  } catch {
    return false;
  }
}

function extractDashboard(response) {
  const data = response?.data ?? response;

  if (data?.stats || data?.productivity || data?.activity) {
    return data;
  }

  if (data?.data) {
    return data.data;
  }

  return null;
}

export default function useDashboard({ autoLoad = true } = {}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const requestRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const reload = useCallback(async () => {
    const requestId = ++requestRef.current;

    if (!hasAuthToken()) {
      if (mountedRef.current) {
        setDashboard(null);
        setError(null);
        setLoading(false);
      }
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await dashboardService.get();
      const data = extractDashboard(response);

      if (
        mountedRef.current &&
        requestId === requestRef.current
      ) {
        setDashboard(data);
      }

      return data;
    } catch (err) {
      if (!mountedRef.current) {
        return null;
      }

      setError(err);
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

  useEffect(() => {
    if (!autoLoad) {
      setLoading(false);
      return undefined;
    }

    reload();

    return undefined;
  }, [autoLoad, reload]);

  return {
    dashboard,
    stats: dashboard?.stats || [],
    productivity: dashboard?.productivity || {},
    activity: dashboard?.activity || [],
    recentDocuments: dashboard?.recentDocuments || [],
    generatedAt: dashboard?.generatedAt || null,
    loading,
    error,
    reload,
  };
}
