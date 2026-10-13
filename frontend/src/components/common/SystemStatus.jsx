import './CommonPremium.css';
import React, { useEffect, useState } from "react";
import { Cloud, CloudOff, ShieldCheck, Zap } from "lucide-react";
import api from "../../services/api";

export default function SystemStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [healthy, setHealthy] = useState(null);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const check = async () => {
      if (!navigator.onLine) {
        if (active) setHealthy(false);
        return;
      }
      try {
        await api.get("/system/status", { timeout: 4500 });
        if (active) setHealthy(true);
      } catch {
        if (active) setHealthy(false);
      }
    };
    check();
    const timer = window.setInterval(check, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const good = online && healthy !== false;
  return (
    <div className={`system-status ${good ? "is-good" : "is-warning"}`} title={good ? "SyncDoc services are operational" : "Connection needs attention"}>
      {online ? <Cloud size={14} /> : <CloudOff size={14} />}
      <span>{!online ? "Offline" : healthy === false ? "Reconnecting" : "Live"}</span>
      {good ? <ShieldCheck size={13} /> : <Zap size={13} />}
    </div>
  );
}
