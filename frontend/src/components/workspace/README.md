# SyncDoc Premium Workspace Components

Copy the complete contents of this folder to:

`frontend/src/components/workspace/`

Files:
- `WorkspaceCard.jsx` — responsive workspace selection card, member avatars, document/member counts.
- `WorkspaceMembers.jsx` — workspace member list, role/status metadata, loading/empty/error states, member actions.
- `WorkspaceSwitcher.jsx` — current workspace selector using the existing `WorkspaceContext`.
- `WorkspacePremium.css` — premium responsive styling, hover transitions, animations, dark mode and reduced-motion support.
- `index.js` — named exports.

No new package is required. These components keep the existing workspace context and component prop APIs. Existing JSX files import `WorkspacePremium.css` themselves, so you do not need to add a global CSS import.

Examples:
```jsx
import { WorkspaceCard, WorkspaceMembers, WorkspaceSwitcher } from "../components/workspace";

// Switcher reads workspace/workspaces/setWorkspace from WorkspaceContext.
<WorkspaceSwitcher />

// Card uses the existing workspace object and callback.
<WorkspaceCard workspace={workspace} onOpen={(item) => openWorkspace(item)} />

// Workspace members component supports the existing props in WorkspaceMembers.jsx.
<WorkspaceMembers members={members} />
```

Keep your existing `WorkspaceContext` and backend/API logic. UI styling alone does not add server persistence or permission enforcement. Verify existing prop usage and run `npm run build` after replacing files.
