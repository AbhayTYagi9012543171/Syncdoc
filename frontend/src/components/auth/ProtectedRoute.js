
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, LockKeyhole, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function SessionLoading() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.main
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-live="polite"
      aria-label="Verifying your SyncDoc session"
      style={styles.screen}
    >
      <div style={styles.glowOne} aria-hidden="true" />
      <div style={styles.glowTwo} aria-hidden="true" />

      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        style={styles.card}
      >
        <div style={styles.brandRow}>
          <div style={styles.logo}>
            <ShieldCheck size={25} strokeWidth={2.2} />
          </div>

          <div>
            <div style={styles.brandName}>SyncDoc</div>
            <div style={styles.brandCaption}>WORKSPACE SECURITY</div>
          </div>

          <Sparkles
            size={19}
            color="#818cf8"
            style={{ marginLeft: "auto" }}
            aria-hidden="true"
          />
        </div>

        <div style={styles.visual}>
          <motion.div
            animate={
              reduceMotion
                ? undefined
                : { rotate: 360 }
            }
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear",
            }}
            style={styles.orbit}
            aria-hidden="true"
          />

          <motion.div
            animate={
              reduceMotion
                ? undefined
                : { scale: [1, 1.06, 1] }
            }
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={styles.lockCircle}
          >
            <LockKeyhole size={31} color="#c7d2fe" />
          </motion.div>
        </div>

        <h1 style={styles.heading}>Securing your workspace</h1>

        <p style={styles.description}>
          Please wait while we verify your session
          and prepare your documents.
        </p>

        <div style={styles.progressTrack} aria-hidden="true">
          <motion.div
            initial={{ width: "8%" }}
            animate={
              reduceMotion
                ? { width: "70%" }
                : { width: ["12%", "68%", "42%", "82%"] }
            }
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={styles.progressBar}
          />
        </div>

        <div style={styles.statusRow}>
          <span style={styles.statusDot} />
          <span>Checking authentication</span>
        </div>

        <div style={styles.footer}>
          Your workspace is protected by SyncDoc
        </div>
      </motion.section>
    </motion.main>
  );
}

export default function ProtectedRoute() {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Wait for AuthContext to finish restoring the session.
  if (loading) {
    return <SessionLoading />;
  }

  // Prefer the explicit authentication status when available.
  const authenticated =
    typeof isAuthenticated === "boolean"
      ? isAuthenticated
      : Boolean(user);

  if (!authenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    );
  }

  return <Outlet />;
}

const styles = {
  screen: {
    position: "relative",
    isolation: "isolate",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    width: "100%",
    overflow: "hidden",
    boxSizing: "border-box",
    padding: "24px 16px",
    background:
      "radial-gradient(ellipse at top, #172554 0%, #0b1120 45%, #060914 100%)",
    color: "#f8fafc",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  glowOne: {
    position: "absolute",
    zIndex: -1,
    width: "320px",
    height: "320px",
    top: "-150px",
    left: "-100px",
    borderRadius: "50%",
    background: "rgba(79, 70, 229, 0.2)",
    filter: "blur(75px)",
    pointerEvents: "none",
  },
  glowTwo: {
    position: "absolute",
    zIndex: -1,
    width: "300px",
    height: "300px",
    bottom: "-150px",
    right: "-80px",
    borderRadius: "50%",
    background: "rgba(14, 165, 233, 0.14)",
    filter: "blur(75px)",
    pointerEvents: "none",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    boxSizing: "border-box",
    padding: "clamp(24px, 6vw, 42px)",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    borderRadius: "26px",
    background: "rgba(15, 23, 42, 0.78)",
    boxShadow:
      "0 30px 100px rgba(0, 0, 0, 0.38), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
    backdropFilter: "blur(20px)",
    textAlign: "center",
  },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    textAlign: "left",
  },
  logo: {
    display: "grid",
    placeItems: "center",
    width: "46px",
    height: "46px",
    flexShrink: 0,
    borderRadius: "15px",
    color: "#e0e7ff",
    background: "linear-gradient(135deg, #6366f1, #4338ca)",
    boxShadow: "0 8px 24px rgba(79, 70, 229, 0.3)",
  },
  brandName: {
    fontSize: "19px",
    fontWeight: 800,
    letterSpacing: "-0.5px",
  },
  brandCaption: {
    marginTop: "4px",
    fontSize: "9px",
    fontWeight: 700,
    letterSpacing: "1.7px",
    color: "#94a3b8",
  },
  visual: {
    position: "relative",
    display: "grid",
    placeItems: "center",
    width: "118px",
    height: "118px",
    margin: "38px auto 26px",
  },
  orbit: {
    position: "absolute",
    inset: "2px",
    borderRadius: "50%",
    border: "1px solid rgba(129, 140, 248, 0.45)",
    borderTopColor: "#818cf8",
    borderRightColor: "rgba(56, 189, 248, 0.8)",
  },
  lockCircle: {
    display: "grid",
    placeItems: "center",
    width: "76px",
    height: "76px",
    borderRadius: "24px",
    border: "1px solid rgba(129, 140, 248, 0.3)",
    background:
      "linear-gradient(145deg, rgba(79, 70, 229, 0.28), rgba(30, 41, 59, 0.85))",
    boxShadow: "0 0 40px rgba(99, 102, 241, 0.15)",
  },
  heading: {
    margin: "0",
    fontSize: "clamp(21px, 5vw, 26px)",
    lineHeight: 1.3,
    fontWeight: 750,
    letterSpacing: "-0.8px",
  },
  description: {
    maxWidth: "300px",
    margin: "12px auto 26px",
    fontSize: "14px",
    lineHeight: 1.8,
    color: "#94a3b8",
  },
  progressTrack: {
    height: "5px",
    width: "100%",
    overflow: "hidden",
    borderRadius: "20px",
    background: "#1e293b",
  },
  progressBar: {
    height: "100%",
    borderRadius: "20px",
    background: "linear-gradient(90deg, #6366f1, #38bdf8)",
    boxShadow: "0 0 15px rgba(99, 102, 241, 0.45)",
  },
  statusRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "9px",
    marginTop: "19px",
    fontSize: "12px",
    color: "#cbd5e1",
  },
  statusDot: {
    width: "7px",
    height: "7px",
    flexShrink: 0,
    borderRadius: "50%",
    background: "#34d399",
    boxShadow: "0 0 12px rgba(52, 211, 153, 0.55)",
  },
  footer: {
    marginTop: "29px",
    paddingTop: "19px",
    borderTop: "1px solid rgba(148, 163, 184, 0.13)",
    fontSize: "11px",
    color: "#64748b",
  },
};
