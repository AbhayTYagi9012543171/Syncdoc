# SyncDoc — Premium Full-Website Upgrade

This bundle combines the supplied SyncDoc frontend, Express backend, docs, infrastructure and helper scripts. The frontend keeps the existing feature pages and premium responsive style layer; the dev script now supports `npm run dev` as requested.

## Requirements
- Node.js 18+ and npm
- MongoDB running locally, or a MongoDB connection string you control
- Redis is optional unless enabled by your current backend configuration

## 1. Install dependencies (Windows CMD)
Open CMD in this extracted `SyncDoc-Premium-Upgrade` folder:

```bat
npm install
npm --prefix backend install
npm --prefix frontend install
```

## 2. Configure environment
```bat
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```
Edit `backend\.env` and set `MONGODB_URI`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` as appropriate. Keep secrets private. The defaults are for local development only.

## 3. Run frontend and backend separately

Terminal 1 — backend:
```bat
cd backend
npm run dev
```
Default backend port is `5000`.

Terminal 2 — frontend:
```bat
cd frontend
npm run dev
```
The React development server runs on port `3000`.

## 4. Run both from the project root
```bat
npm run dev
```
This starts both processes using `concurrently`.

## Important notes
- Frontend API URL is `REACT_APP_API_URL=http://localhost:5000/api`; if your backend uses another port, update `frontend/.env` and restart the frontend.
- `CORS_ORIGIN` must match the frontend origin exactly (normally `http://localhost:3000`).
- Ensure MongoDB is running before testing login, documents, workspaces, and other database-backed features.
- A premium UI does not make unavailable backend routes functional by itself. Verify each workflow against the API and database; do not use production credentials in local `.env` files.
- Build the frontend with `npm --prefix frontend run build`.
