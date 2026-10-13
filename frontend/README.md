# SyncDoc Frontend High-Level Upgrade

This package contains a production-oriented React/Vite UI scaffold matching the requested
SyncDoc architecture.

## Required dependencies

Make sure the existing frontend has:

- react
- react-dom
- react-router-dom
- axios

Install missing packages from `frontend`:

    npm install react react-dom react-router-dom axios

## Environment

Recommended `.env`:

    VITE_API_URL=http://localhost:5000/api
    VITE_SOCKET_URL=http://localhost:5000

If your backend is on port 5003, use:

    VITE_API_URL=http://localhost:5003/api
    VITE_SOCKET_URL=http://localhost:5003

Restart Vite after changing `.env`.

## Important backend compatibility

The UI calls these API routes when the corresponding feature is used:

- POST /auth/login
- POST /auth/register
- GET /auth/me
- GET /documents
- POST /documents
- GET /documents/:id
- PATCH /documents/:id
- DELETE /documents/:id
- GET /notifications
- PATCH /notifications/:id/read
- PATCH /notifications/read-all
- GET /workspaces
- GET /workspaces/:id
- POST /workspaces
- PATCH /workspaces/:id
- GET /workspaces/:id/members

The document page contains a local demo fallback so the visual UI can be inspected even
while API endpoints are being completed.

## Collaboration note

`src/utils/yjsProvider.js` is intentionally an adapter. It does not install Yjs or Socket.io
client automatically. If the current SyncDoc project already has its own `useCollaboration`
and Yjs provider, merge the existing transport logic into this adapter rather than creating
a second Socket.io connection.

The current adapter can also use `window.io` if Socket.io is loaded globally, but a modern
implementation should import your existing socket client/provider directly.

## Start

    npm run dev

Build:

    npm run build
