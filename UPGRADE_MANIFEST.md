# SyncDoc Enterprise Upgrade Manifest

## Core app retained
The existing SyncDoc React application, Express API, MongoDB models, document editor, workspaces, analytics, notifications, settings, and admin pages are retained in this project bundle.

## New enterprise-oriented work in this upgrade
- Optional AI assistant in the document editor with summarize, proofread, rewrite, action-item extraction, and document Q&A actions.
- Authenticated AI endpoint that checks document access, caps input size, limits request frequency, times out provider requests, and returns explicit configuration/provider errors.
- WebSocket Yjs document access checks against the active user and document owner/collaborator records.
- Live Yjs editing access restricted to owners, admins, and collaborators with edit/write permission. Viewer access remains available through authorized read APIs.
- Socket.IO JWT verification and account checks; supplied user IDs must match the JWT identity.
- Socket.IO document-room joins require document membership.
- Configurable Express proxy trust for deployment environments.
- Previous frontend/backend compatibility fixes remain included.

## Required before production
1. Install dependencies from each package lock file.
2. Configure production environment variables and secure JWT secrets.
3. Build the React frontend and run the backend/frontend test suites.
4. Test two-account access boundaries and simultaneous collaboration against a real MongoDB instance.
5. Configure AI provider credentials only if AI functionality is wanted; document text is sent to that configured provider when the user requests AI assistance.
6. Deploy to staging and verify CORS, proxy trust, WebSocket paths, database indexes, logging, backups, and monitoring before production rollout.

No API keys or production `.env` files are included in this bundle.

## Collaboration repair and UI refinement (2026-10-16)
- Fixed the broken Yjs provider call contract by creating a real `Y.Doc`, passing it to `WebsocketProvider`, and subscribing to provider status/sync/awareness events.
- Replaced the plain `contentEditable` document surface with Tiptap/ProseMirror and the Yjs Collaboration + CollaborationCursor extensions so text, formatting, cursor presence, and collaborator identity share one live document model.
- Updated toolbar commands to use Tiptap editor commands rather than direct `document.execCommand` DOM mutation.
- Added `POST /api/documents/:documentId/collaboration/seed-claim`, protected by authentication and document edit permissions, to elect a single client to seed an empty live room from saved HTML.
- Added retries/reconnect state and aligned `REACT_APP_YJS_URL` configuration with the environment example.
- Added a global premium polish stylesheet for shared page transitions, card interactions, accessibility focus, responsive tables, editor cursor labels, mobile Admin layout, and reduced-motion preferences.

## Current verification caveat
Frontend JavaScript/JSX syntax and backend JavaScript syntax checks pass. The production frontend build, automated tests, and two-browser real-time collaboration test still need to be run after dependencies are installed and the updated backend/frontend are deployed together. Yjs room state is in-memory; MongoDB document HTML remains the durable fallback through REST autosave.
