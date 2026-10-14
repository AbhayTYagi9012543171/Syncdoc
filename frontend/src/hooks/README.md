# SyncDoc Premium Hooks

Copy every `.js` file in this folder into `frontend/src/hooks/`.

## Included feature hooks
- `useDashboard`, `useDocuments`, `useWorkspace`, `useCollaboration`, `useNotifications`, `useDebounce`

## Reusable UI / UX hooks
- `useMediaQuery(query)` — responsive breakpoints (for example `useMediaQuery("(max-width: 768px)")`).
- `useReducedMotion()` — respects OS reduced-motion preferences for animation.
- `useOnlineStatus()` — returns `{ isOnline, isOffline }`; browser connectivity is not the same as server health.
- `useLocalStorage(key, initialValue)` — returns `[value, setValue, removeValue]` for non-sensitive preferences only.
- `useMounted()` — useful when UI must wait until the client has mounted.
- `usePrevious(value)` — reads the previous committed value.
- `useToggle(initialValue)` — returns `{ value, setValue, toggle, setTrue, setFalse }`.
- `useDocumentTitle(title)` — syncs the tab title and restores it on unmount by default.
- `useKeyboardShortcut(key, callback, options)` — keyboard shortcuts, with editable inputs ignored by default.

## Import examples

```jsx
import { useDebounce, useOnlineStatus, useReducedMotion, useToggle } from "../hooks";

const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 350);
const { isOnline } = useOnlineStatus();
const reduceMotion = useReducedMotion();
const modal = useToggle(false);
```

You can also continue using the existing direct imports, such as `import useDocuments from "../hooks/useDocuments";`.

## Important
- Feature hooks retain the source archive's service integrations and API contracts.
- Hooks are logic utilities; responsive layout and animation styles still belong to components/CSS. Use `useReducedMotion()` to disable or reduce motion where appropriate.
- `useLocalStorage` is for preferences such as theme or sidebar state only. Do not store auth tokens, passwords, or secrets with it.
- No new npm dependencies are required.
