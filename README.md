# SyncDoc — upgraded source bundle

This bundle preserves the supplied React frontend and Express/Mongoose backend, including existing document editor and collaboration modules. It is a source upgrade, not a replacement demo.

## Project layout

- `frontend/` — React application and existing UI pages/components/services/styles.
- `backend/` — Express API, Mongoose models, Socket.IO/Yjs collaboration, controllers, routes, middleware and services.
- `UPGRADE_REPORT.md` — audited findings, changes, and verification status.

## Windows local setup

Use two VS Code terminals. Configure `backend/.env` from `backend/.env.example` and `frontend/.env` from `frontend/.env.example`. Never commit these files.

**Backend** (from `SyncDoc/backend`):

```cmd
npm install
npm run dev
```

If `npm run dev` is unavailable in your checked-out package, use `npm start`. The backend package supplied in this bundle defines both scripts.

**Frontend** (from `SyncDoc/frontend`):

```cmd
npm install
npm start
```

The frontend is Create React App based; its development URL is normally `http://localhost:3000`. The backend defaults to port `5000`. MongoDB must be reachable using `MONGODB_URI` (or the environment variable named in `backend/.env.example`).

## Build and tests

```cmd
cd frontend
npm test -- --watchAll=false
npm run build
```

In another terminal:

```cmd
cd backend
npm test
npm run lint
```

The supplied source archives do not include installed dependencies or live service credentials. Build, database, deployment, and multi-client collaboration verification must be run in your environment before deploying.

## Deployment reminders

- Set `REACT_APP_API_URL` to the production API base URL and `REACT_APP_SOCKET_URL` to the production Socket.IO host.
- Set `CORS_ORIGIN` to the exact frontend origin(s) on the backend.
- Set strong, independent JWT secrets; never use example values in production.
- Configure MongoDB network access and credentials privately.
- Configure `TRUST_PROXY`/proxy behavior to match your host. The supplied server currently trusts one proxy hop, which is appropriate only when the deployment topology actually has one trusted hop.
- Confirm the Yjs websocket route and Socket.IO connection from the deployed frontend.
- Do not upload `.env`, user uploads, logs, or generated build folders to source control.


## Enterprise features added in this bundle

- Optional editor AI assistant (summarize, rewrite, proofread, action items, document Q&A). Configure `AI_API_KEY` and optionally `AI_BASE_URL` / `AI_MODEL` on the backend only.
- AI requests are authenticated, document-access checked, bounded in input size, time-limited, and rate-limited.
- Yjs and Socket.IO document rooms now validate authenticated user identity and document access.
- `TRUST_PROXY` is configurable for deployment topology.

See `UPGRADE_REPORT.md` for setup and verification notes.

## Collaboration notes

The editor now uses Tiptap + Yjs + `y-websocket` for live shared document editing and awareness cursors. Keep these settings aligned:

- `REACT_APP_API_URL` — API base URL ending in `/api`.
- `REACT_APP_SOCKET_URL` — backend origin for Socket.IO.
- `REACT_APP_YJS_URL` — Yjs WebSocket base URL ending in `/yjs` (for example, `wss://your-backend.example.com/yjs`).
- Backend `JWT_SECRET` (or supported `JWT_ACCESS_SECRET`) must match the secret used to sign login tokens.

Deploy the backend and frontend from this ZIP together. The backend must include `POST /api/documents/:documentId/collaboration/seed-claim`. Live edits are synchronized in real time while collaborators are connected; normal document HTML is persisted through the existing document autosave API and is used to seed a fresh Yjs room after a backend restart.

### Collaboration smoke test

1. Sign in as an owner/editor and open an existing document in two separate browser sessions.
2. Confirm both show “Live collaboration” and each other's presence.
3. Type in one session; verify the other session updates without reloading.
4. Try headings, bold, lists, and links; verify formatting appears in both sessions.
5. Wait for the save status to show “Saved”, reload both sessions, and confirm the saved document content remains.
6. Open a document as a viewer (if supported by the app) and verify editing is denied by backend permissions.
