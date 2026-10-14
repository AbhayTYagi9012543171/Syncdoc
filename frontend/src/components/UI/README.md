# SyncDoc Premium Loading Component

## Install
Copy `Loading.jsx`, `Loading.css`, and `index.js` into:
`frontend/src/components/UI/`

This preserves imports such as:
`import Loading from "../components/UI/Loading";`

## Examples

```jsx
import Loading from "../components/UI/Loading";

<Loading />
<Loading fullScreen />
<Loading label="Loading documents..." description="Syncing your workspace" />
<Loading size="sm" label="Saving..." variant="dots" compact />
<Loading overlay label="Please wait..." />
<Loading variant="bars" />
<Loading showProgress progress={62} label="Uploading file..." />
<Loading showProgress label="Preparing workspace..." />
```

Supported sizes: `sm`, `md`, `lg`, `xl`.
Supported variants: `orbit`, `spinner`, `dots`, `bars`.

`progress` is optional. When provided, it is clamped between 0 and 100 and rendered as determinate progress. When `showProgress` is true without a numeric `progress`, an animated indeterminate progress bar is shown.

The component uses only React and CSS; no new dependency is required.
