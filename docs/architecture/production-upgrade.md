# SyncDoc Production Upgrade v2

## Backend
- Request correlation via `X-Request-ID`.
- Global API rate limiting with configurable limits.
- Readiness endpoint at `/api/system/ready`.
- Service health endpoint at `/api/system/health`.
- Standardized success/error response helpers for new endpoints.
- Persistent user preferences and notification preferences.
- Audit-log model and non-blocking audit utility.
- Notification CRUD parity with the frontend service.
- Existing JWT, Socket.IO and authenticated Yjs collaboration are preserved.

## Frontend
- Settings are persisted through `/api/settings`.
- Profile changes use `/api/auth/profile`.
- Password changes use `/api/auth/password`.
- Every API request receives a correlation ID.
- Existing dashboard, documents, analytics, notifications, workspace and editor services remain compatible.

## Recommended deployment
Use HTTPS, strong JWT secrets, a managed MongoDB/Redis deployment, a reverse proxy, structured log shipping, automated backups and CI/CD. Never commit `.env` files or production credentials.
