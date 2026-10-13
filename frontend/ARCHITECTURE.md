# SyncDoc frontend architecture

src/
  components/
    auth/
    common/
    documents/
    editor/
    layout/
  context/
  hooks/
  pages/
  services/
  styles/

Data flow:
React pages -> hooks -> services/api.js -> REST backend
EditorPage -> Y.Doc -> y-websocket -> collaboration backend
EditorPage -> Socket.IO -> presence/room events

Security:
- JWT is stored in localStorage in this starter contract because the existing backend expects Bearer auth.
- For higher-security deployments, prefer secure, httpOnly, same-site cookies and CSRF protection.
- Never put MongoDB credentials, JWT secrets, or other server secrets in REACT_APP_* variables.
