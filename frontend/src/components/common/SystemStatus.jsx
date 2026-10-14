
import "./CommonPremium.css";
import React, { useEffect, useState } from "react";
import { Cloud, CloudOff, ShieldCheck, Zap } from "lucide-react";
import api from "../../services/api";

const CHECK_INTERVAL = 30000;
const REQUEST_TIMEOUT = 4500;

// Share one in-flight request across all SystemStatus instances.
let statusRequest = null;

function checkSystemStatus() {
  if (!statusRequest) {
    statusRequest = api
      .get("/system/status", {
        timeout: REQUEST_TIMEOUT,
      })
      .finally(() => {
        statusRequest = null;
      });
  }

  return statusRequest;
}

export default function SystemStatus() {
  const [online, setOnline] = useState(() => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  });

  const [healthy, setHealthy] = useState(null);

  // Track browser network connectivity.
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
    };

    const handleOffline = () => {
      setOnline(false);
      setHealthy(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Check server health and poll every 30 seconds.
  useEffect(() => {
    let active = true;
    let timerId = null;
    let checking = false;

    const check = async () => {
      if (!active || checking) {
        return;
      }

      if (!navigator.onLine) {
        setHealthy(false);
        return;
      }

      checking = true;

      try {
        const response = await checkSystemStatus();

        if (!active) {
          return;
        }

        // A successful HTTP response means the endpoint is reachable.
        // If your backend returns a health field, also validate it.
        const data = response?.data;

        const isHealthy =
          data?.healthy === false ||
          data?.status === "error" ||
          data?.status === "unhealthy"
            ? false
            : true;

        setHealthy(isHealthy);
      } catch {
        if (active) {
          setHealthy(false);
        }
      } finally {
        checking = false;
      }
    };

    const scheduleNextCheck = () => {
      if (!active) {
        return;
      }

      timerId = window.setTimeout(async () => {
        await check();
        scheduleNextCheck();
      }, CHECK_INTERVAL);
    };

    void check().finally(() => {
      scheduleNextCheck();
    });

    return () => {
      active = false;

      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, []);

  const good = online && healthy !== false;

  const label = !online
    ? "Offline"
    : healthy === false
      ? "Reconnecting"
      : healthy === null
        ? "Checking"
        : "Live";

  return (
    <div
      className={`system-status ${
        good ? "is-good" : "is-warning"
      }`}
      title={
        good
          ? "SyncDoc services are operational"
          : "Connection needs attention"
      }
      role="status"
      aria-live="polite"
    >
      {online ? (
        <Cloud size={14} aria-hidden="true" />
      ) : (
        <CloudOff size={14} aria-hidden="true" />
      )}

      <span>{label}</span>

      {good ? (
        <ShieldCheck size={13} aria-hidden="true" />
      ) : (
        <Zap size={13} aria-hidden="true" />
      )}
    </div>
  );
}
