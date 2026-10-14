# SyncDoc Premium Context Upgrade

This folder contains the authentication and workspace state providers used by SyncDoc.

## Files
- `AuthContext.js` — session restoration, login/register/logout, user updates, safe storage helpers, and `sessionStatus` (`restoring`, `authenticated`, or `anonymous`).
- `WorkspaceContext.jsx` — workspace loading, selection, creation/update/removal, active workspace persistence, and dynamic status aliases (`isLoading`, `hasError`, `isReady`).
- `index.js` — optional central exports.

## Install
Back up the current `frontend/src/context` folder first, then copy these files into:
`E:\syncdoc\SyncDoc-Premium-Upgrade\frontend\src\context`

Keep the existing provider order: `AuthProvider` must wrap `WorkspaceProvider`, because the workspace provider reads `useAuth()`.

Example:
```jsx
<AuthProvider>
  <WorkspaceProvider>
    <App />
  </WorkspaceProvider>
</AuthProvider>
```

Existing imports such as `import { useAuth } from "../context/AuthContext"` and `import { useWorkspace } from "../context/WorkspaceContext"` remain supported. No new npm packages are required.

## New dynamic status fields
```js
const { loading, isLoading, isAuthenticated, sessionStatus } = useAuth();
// sessionStatus: "restoring" | "authenticated" | "anonymous"

const { loading, isLoading, error, hasError, isReady } = useWorkspace();
```

Important: these contexts manage application state, not visual styling. Premium visual design belongs in the components and CSS that consume these hooks. API routes and response handling remain aligned with the existing project rather than inventing new endpoints.
