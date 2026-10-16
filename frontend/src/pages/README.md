# SyncDoc Admin Console Premium UI Upgrade

## Files
- `Admin.jsx` — upgraded admin page component; preserves the existing userService API calls, filters, pagination, CSV export, activity feed, and health indicators.
- `admin-console-premium.css` — responsive premium dark visual layer with animated cards, responsive layouts, focus states, and reduced-motion support.

## Install
1. Replace your current Admin page component with `Admin.jsx` (keep the filename/path your router currently imports).
2. Copy `admin-console-premium.css` to `frontend/src/styles/admin-console-premium.css`.
3. Confirm the component imports both:
   `import '../styles/pages-premium.css';`
   `import '../styles/admin-console-premium.css';`
4. Start the frontend with `npm run dev`.

The stylesheet is scoped to `.admin-premium-page`, so it should not restyle unrelated pages. No backend API contract was changed. The UI continues to show API-derived values; it does not fabricate system health or activity events.
