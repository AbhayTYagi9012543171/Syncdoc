# SyncDoc Premium Layout Components

Files included from the original SyncDoc layout folder:
- `AppLayout.js` — application shell, responsive sidebar state, global Ctrl/Cmd+K shortcut, command palette and quick actions.
- `Sidebar.js` — navigation, workspace selector, account area and collapse/mobile behavior.
- `Topbar.js` — responsive topbar, search, notification and profile menu.
- `Breadcrumbs.jsx` — reusable breadcrumb navigation.
- `MobileNav.jsx` — accessible mobile menu trigger.
- `LayoutPremium.css` — premium visual layer, responsive polish, hover/entry transitions and reduced-motion support.

## Install
Copy these files into `frontend/src/components/layout`, replacing the matching originals after backing them up. `AppLayout.js` imports `LayoutPremium.css` automatically.

The CSS is an enhancement layer and does not replace authentication, route, workspace, notification, or search logic. It relies on the class names used by the supplied layout components. No additional package is required.

## Verify
Run `npm install` and `npm run dev` from the frontend directory. Test collapsed and expanded sidebar, mobile navigation, search shortcut (Ctrl/Cmd+K), profile menu, breadcrumbs and all routes. Build/browser testing was not run while preparing this archive.
