import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";

import { AuthProvider } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";

/* ============================================================
   SYNCDOC — GLOBAL STYLES
   ------------------------------------------------------------
   Import order:
   1. Global / base styles
   2. Application layout
   3. Sidebar / navigation
   4. Dashboard
   5. Analytics
   6. Documents
   7. Notifications
   8. Settings
   9. Editor
   10. Responsive overrides
============================================================ */

import "./styles/index.css";
import "./styles/layout.css";
import "./styles/sidebar.css";
import "./styles/dashboard.css";
import "./styles/analytics.css";
import "./styles/documents.css";
import "./styles/notifications.css";
import "./styles/settings.css";
import "./styles/premium.css";
import "./styles/v5-product.css";
import "./styles/editor.css";
import "./styles/responsive.css";
import "./styles/enterprise-polish.css";
import "./styles/premium-system.css";

/* ============================================================
   ROOT ELEMENT
============================================================ */

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error(
        "SyncDoc failed to start: #root element was not found."
    );
}

/* ============================================================
   REACT ROOT
============================================================ */

const root = ReactDOM.createRoot(rootElement);

/* ============================================================
   APPLICATION PROVIDERS
   ------------------------------------------------------------
   BrowserRouter
        ↓
   AuthProvider
        ↓
   WorkspaceProvider
        ↓
   App
============================================================ */

function AppProviders({ children }) {
    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
                <WorkspaceProvider>
                    {children}
                </WorkspaceProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

/* ============================================================
   APPLICATION BOOTSTRAP
============================================================ */

root.render(
    <React.StrictMode>
        <AppProviders>
            <App />
        </AppProviders>
    </React.StrictMode>
);
