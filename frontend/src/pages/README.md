# SyncDoc Premium Pages

This package contains the 14 page modules from the prepared SyncDoc frontend plus a shared responsive polish stylesheet. Existing page logic, service calls, context hooks, and route-compatible filenames are preserved.

## Install
1. Back up `frontend/src/pages` (for example, rename it to `pages_backup`).
2. Copy every file in this package into `frontend/src/pages`.
3. Confirm the corresponding `components`, `context`, `hooks`, `services`, and `utils` modules are present in your project. These pages depend on them.
4. Run `npm run dev`, then `npm run build`.

## Files
- Admin.jsx
- Analytics.jsx
- Dashboard.js
- Documents.js
- EditorPage.js
- Login.js
- NotFound.js
- Notifications.jsx
- Profile.jsx
- Projects.jsx
- Register.js
- Settings.js
- Trash.jsx
- Workspace.jsx
- pages-premium.css

The stylesheet adds page entrance motion, accessible focus states, subtle hover lift, responsive page-heading/table behavior, and respects `prefers-reduced-motion`. It does not fabricate backend features; data actions still rely on the existing services and API.

Build/runtime testing was not performed in the user's Windows environment.
