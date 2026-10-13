# SyncDoc Premium Common Components

This folder contains the existing common components plus `CommonPremium.css`, a responsive premium styling and motion layer.

## Apply to your project
1. Back up `frontend/src/components/common`.
2. Copy all files from this `common` folder into:
   `E:\syncdoc\SyncDoc-Premium-Upgrade\frontend\src\components\common`
3. Allow Windows to replace matching files.
4. Run in CMD:

```cmd
cd /d E:\syncdoc\SyncDoc-Premium-Upgrade\frontend
npm install
npm run dev
```

The project already declares `framer-motion` and `lucide-react`. Existing component exports and filenames are retained. The stylesheet respects `prefers-reduced-motion` and adds responsive button, card, badge, avatar, modal, command palette, skeleton, empty-state, quick-action, status, and error-boundary styling.

Note: visual behavior depends on each component's existing class names and app-level styles. Test dialogs, focus behavior, and mobile layouts in your browser after applying.
