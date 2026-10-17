# SyncDoc frontend upgrade notes

## Run locally
1. Copy `.env.example` to `.env` if provided by your deployment workflow and set `REACT_APP_API_URL` / `REACT_APP_SOCKET_URL` as needed.
2. Run `npm ci`.
3. Run `npm start` for local development or `npm run build` for a production bundle.
4. Run `npm test` for regression tests.

## Changes in this pass
- Workspace response unwrapping accepts known nested API envelopes and normalizes `id`, `_id`, and `workspaceId`. Malformed payloads return `null` rather than being mistaken for a workspace.
- API errors expose a bounded `retryAfterSeconds` value for HTTP 429 responses, without automatically retrying authentication requests or write operations.
- Shared visual polish adds focus indicators, reduced-motion support, responsive overflow protections, card consistency, and avatar image sizing safeguards.

The previous build directory is intentionally omitted; rebuild from source so deployment does not serve stale assets.
