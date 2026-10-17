# SyncDoc backend upgrade notes

## Run locally
1. Copy `.env.example` to `.env` and replace the JWT secrets with long random values.
2. Set `MONGODB_URI` to a development/test database.
3. Keep `TRUST_PROXY=0` for direct local access. For a standard single-hop Render deployment, set `TRUST_PROXY=1` in Render's environment settings; otherwise use the exact trusted proxy hop count/range.
4. Run `npm ci`, then `npm start`.
5. Run `npm test` and `npm run lint` before deployment.

## Rate limiting
- Global API limit: `GLOBAL_RATE_LIMIT` requests per 15 minutes (default 1200; values below 100 fall back to the safe default).
- Local development global limit: `DEV_GLOBAL_RATE_LIMIT` (default 50000; localhost requests are skipped in development).
- Login: 5 failed attempts per 15 minutes; successful responses are not counted. Registration remains separately limited.
- A 429 response includes standard rate-limit headers and numeric `Retry-After`. Do not remove rate limiting to fix an incorrectly configured proxy.
- The default store is process memory. For multiple backend instances, configure a compatible shared store before relying on cross-instance counters.

## Workspace create contract
`POST /api/workspaces` returns HTTP 201 and `{ success, message, data }`. `data` contains the saved workspace and stable `id`, `_id`, and `workspaceId` aliases for the same MongoDB identifier. The owner is initialized as an admin member and `memberCount` starts at 1. Only recognized workspace settings are accepted.

## Verification caveat
The generated project archive is source-only. Install dependencies and run tests/builds in your own environment; no live Render or production MongoDB access was performed during this upgrade.
