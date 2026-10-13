
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

function PublicRouteLoading() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.main
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      role="status"
      aria-live="polite"
      aria-label="Loading SyncDoc"
      style={styles.screen}
    >
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={styles.card}
      >
        <motion.div
          animate={reduceMotion ? undefined : { scale: [1, 1.05, 1] }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={styles.logo}
        >
          <ShieldCheck size={30} color="#ffffff" />
        </motion.div>

        <div style={styles.brand}>
          SyncDoc
          <Sparkles
            size={15}
            color="#818cf8"
            style={{ marginLeft: 7 }}
            aria-hidden="true"
          />
        </div>

        <h1 style={styles.heading}>Getting things ready</h1>

        <p style={styles.description}>
          Preparing your secure document workspace.
          This will only take a moment.
        </p>

        <div style={styles.loaderTrack} aria-hidden="true">
          <motion.div
            style={styles.loaderBar}
            animate={
              reduceMotion
                ? { width: "65%" }
                : { width: ["15%", "75%", "45%", "90%"] }
            }
            transition={{
              duration: 2.4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>

        <div style={styles.footer}>
          Secure collaboration starts here.
        </div>
      </motion.section>
    </motion.main>
  );
}

function getSafeRedirect(location) {
  const from = location.state?.from;

  const pathname =
    typeof from?.pathname === "string"
      ? from.pathname
      : "";

  // Only allow internal application paths.
  if (
    !pathname.startsWith("/") ||
    pathname.startsWith("//") ||
    pathname === "/login" ||
    pathname === "/register"
  ) {
    return "/dashboard";
  }

  const search =
    typeof from?.search === "string" &&
    from.search.startsWith("?")
      ? from.search
      : "";

  const hash =
    typeof from?.hash === "string" &&
    from.hash.startsWith("#")
      ? from.hash
      : "";

  return `${pathname}${search}${hash}`;
}

export default function PublicRoute() {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  // Never redirect until session restoration has completed.
  if (loading) {
    return <PublicRouteLoading />;
  }

  const authenticated =
    typeof isAuthenticated === "boolean"
      ? isAuthenticated
      : Boolean(user);

  if (authenticated) {
    return (
      <Navigate
        to={getSafeRedirect(location)}
        replace
      />
    );
  }

  return <Outlet />;
}

const styles = {
  screen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
    width: "100%",
    minHeight: "100dvh",
    padding: "24px 16px",
    color: "#f8fafc",
    background:
      "radial-gradient(ellipse at top, #172554 0%, #0b1120 48%, #060914 100%)",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    boxSizing: "border-box",
    width: "100%",
    maxWidth: "400px",
    padding: "clamp(26px, 6vw, 42px)",
    textAlign: "center",
    borderRadius: "26px",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    background: "rgba(15, 23, 42, 0.78)",
    boxShadow: "0 30px 90px rgba(0, 0, 0, 0.35)",
    backdropFilter: "blur(20px)",
  },
  logo: {
    display: "grid",
    placeItems: "center",
    width: "64px",
    height: "64px",
    margin: "0 auto 17px",
    borderRadius: "21px",
    background: "linear-gradient(135deg, #6366f1, #4338ca)",
    boxShadow: "0 10px 30px rgba(79, 70, 229, 0.3)",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "21px",
    fontWeight: 800,
    letterSpacing: "-0.6px",
  },
  heading: {
    margin: "30px 0 10px",
    fontSize: "clamp(21px, 5vw, 25px)",
    lineHeight: 1.35,
    letterSpacing: "-0.6px",
  },
  description: {
    maxWidth: "300px",
    margin: "0 auto 25px",
    fontSize: "14px",
    lineHeight: 1.8,
    color: "#94a3b8",
  },
  loaderTrack: {
    width: "100%",
    height: "5px",
    overflow: "hidden",
    borderRadius: "20px",
    background: "#1e293b",
  },
  loaderBar: {
    height: "100%",
    borderRadius: "20px",
    background: "linear-gradient(90deg, #6366f1, #38bdf8)",
  },
  footer: {
    marginTop: "23px",
    paddingTop: "18px",
    borderTop: "1px solid rgba(148, 163, 184, 0.13)",
    fontSize: "11px",
    color: "#64748b",
  },
};
