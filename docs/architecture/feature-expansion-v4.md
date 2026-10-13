# SyncDoc v4 Feature Expansion

## Global Search
`GET /api/search?q=<term>&limit=<n>` returns only resources visible to the authenticated user: documents, workspaces and people.

## Document Recovery
`GET /api/documents/trash/list` lists deleted documents accessible to the current user.
`POST /api/documents/:documentId/restore-trash` restores a document for its owner or document admin.

## Favorites
`PUT /api/documents/:documentId` accepts `{ "favorite": true|false }` and persists the user's favorite state in `starredBy`.

## Frontend
The Topbar opens a command palette from the existing Ctrl/Cmd+K shortcut and routes search results directly to the relevant application area. Trash is available as a protected application route at `/trash`.
