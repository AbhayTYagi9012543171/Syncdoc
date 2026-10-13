import React, {
  Suspense,
  lazy,
  useEffect,
} from "react";

import {
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicRoute from "./components/auth/PublicRoute";
import AppLayout from "./components/layout/AppLayout";
import Loading from "./components/UI/Loading";

/* ============================================================
   SYNCDOC — APPLICATION ROUTER
   Centralized, lazy-loaded and production-ready routing
============================================================ */

/* ============================================================
   LAZY PAGE HELPER
============================================================ */

const lazyPage = (loader) => lazy(loader);

/* ============================================================
   PUBLIC / AUTH PAGES
============================================================ */

const Login = lazyPage(
  () => import("./pages/Login")
);

const Register = lazyPage(
  () => import("./pages/Register")
);

/* ============================================================
   APPLICATION PAGES
============================================================ */

const Dashboard = lazyPage(
  () => import("./pages/Dashboard")
);

const Documents = lazyPage(
  () => import("./pages/Documents")
);

const EditorPage = lazyPage(
  () => import("./pages/EditorPage")
);

const Projects = lazyPage(
  () => import("./pages/Projects")
);

const Workspace = lazyPage(
  () => import("./pages/Workspace")
);

const Analytics = lazyPage(
  () => import("./pages/Analytics")
);

const Notifications = lazyPage(
  () => import("./pages/Notifications")
);

const Trash = lazyPage(
  () => import("./pages/Trash")
);

const Settings = lazyPage(
  () => import("./pages/Settings")
);

const Profile = lazyPage(
  () => import("./pages/Profile")
);

/* ============================================================
   ADMIN
============================================================ */

const Admin = lazyPage(
  () => import("./pages/Admin")
);

/* ============================================================
   ERROR PAGE
============================================================ */

const NotFound = lazyPage(
  () => import("./pages/NotFound")
);

/* ============================================================
   LOADING FALLBACK
============================================================ */

function RouteFallback() {
  return (
    <div
      className="route-loading"
      role="status"
      aria-live="polite"
      aria-label="Loading SyncDoc"
    >
      <Loading />
    </div>
  );
}

/* ============================================================
   SCROLL RESTORATION
============================================================ */

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, [pathname]);

  return null;
}

/* ============================================================
   ROUTE CONFIGURATION
============================================================ */

function AppRoutes() {
  return (
    <>
      <ScrollToTop />

      <Suspense fallback={<RouteFallback />}>
        <Routes>

          {/* ==================================================
              PUBLIC ROUTES
          ================================================== */}

          <Route element={<PublicRoute />}>

            <Route
              path="/login"
              element={<Login />}
            />

            <Route
              path="/register"
              element={<Register />}
            />

          </Route>

          {/* ==================================================
              PROTECTED APPLICATION
          ================================================== */}

          <Route element={<ProtectedRoute />}>

            <Route element={<AppLayout />}>

              {/* =================================================
                  DEFAULT
              ================================================= */}

              <Route
                index
                element={
                  <Navigate
                    to="/dashboard"
                    replace
                  />
                }
              />

              {/* =================================================
                  DASHBOARD
              ================================================= */}

              <Route
                path="dashboard"
                element={<Dashboard />}
              />

              {/* =================================================
                  DOCUMENTS
              ================================================= */}

              <Route
                path="documents"
                element={<Documents />}
              />

              {/* =================================================
                  DOCUMENT EDITOR
              ================================================= */}

              <Route
                path="documents/:documentId"
                element={<EditorPage />}
              />

              {/* =================================================
                  PROJECTS
              ================================================= */}

              <Route
                path="projects"
                element={<Projects />}
              />

              {/* =================================================
                  WORKSPACE
              ================================================= */}

              <Route
                path="workspace"
                element={<Workspace />}
              />

              {/* =================================================
                  ANALYTICS
              ================================================= */}

              <Route
                path="analytics"
                element={<Analytics />}
              />

              {/* =================================================
                  NOTIFICATIONS
              ================================================= */}

              <Route
                path="notifications"
                element={<Notifications />}
              />

              <Route
                path="trash"
                element={<Trash />}
              />

              {/* =================================================
                  SETTINGS
              ================================================= */}

              <Route
                path="settings"
                element={<Settings />}
              />

              {/* =================================================
                  PROFILE
              ================================================= */}

              <Route
                path="profile"
                element={<Profile />}
              />

              {/* =================================================
                  ADMIN
              ================================================= */}

              <Route
                path="admin"
                element={<Admin />}
              />

            </Route>
          </Route>

          {/* ==================================================
              404
          ================================================== */}

          <Route
            path="*"
            element={<NotFound />}
          />

        </Routes>
      </Suspense>
    </>
  );
}

/* ============================================================
   APPLICATION
============================================================ */

export default function App() {
  return <AppRoutes />;
}