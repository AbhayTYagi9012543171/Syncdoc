
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

// Context Providers
import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";

// Global Styles
import "./styles/index.css";
import "./styles/layout.css";
import "./styles/sidebar.css";
import "./styles/dashboard.css";
import "./styles/analytics.css";
import "./styles/documents.css";
import "./styles/notifications.css";
import "./styles/settings.css";
import "./styles/premium.css";
import "./styles/editor.css";
import "./styles/responsive.css";

/**
 * SyncDoc — Main Entry Point
 */

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error(
    "SyncDoc could not start because the #root element was not found."
  );
}

/**
 * Application Providers
 *
 * Keep providers mounted in a consistent order.
 */
function AppProviders({ children }) {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <WorkspaceProvider>{children}</WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

/**
 * React Root
 */
const root = ReactDOM.createRoot(rootElement);

/**
 * Render Application
 *
 * StrictMode helps identify unsafe side effects during development.
 */
root.render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
