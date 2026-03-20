# AetherScan

This repository now uses the MongoDB edition of AetherScan as the single maintained application.

## Active app

All current development happens in:

`aetherscan-mongodb/`

That app contains:

- the Next.js dashboard
- the API routes
- MongoDB-backed storage
- the Kali/Linux scan agent
- reporting, alerts, schedules, and settings

## Quick start

```powershell
cd .\aetherscan-mongodb
npm install
npm run dev -- --port 3001
```

Open:

- `http://localhost:3001/login`

## Environment

Create `aetherscan-mongodb/.env.local` with:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
AETHERSCAN_DB_NAME=aetherscan_mongodb
AETHERSCAN_JWT_SECRET=change-me-in-real-deployments
```

## Repository layout

- `aetherscan-mongodb/app` - routes, pages, and API handlers
- `aetherscan-mongodb/components` - shared UI and dashboard components
- `aetherscan-mongodb/lib` - auth, storage, reporting, and scan logic
- `aetherscan-mongodb/scripts` - agent and MongoDB utility scripts
- `aetherscan-mongodb/public` - static assets

## Notes

- Legacy root-level prototype files have been retired from active use.
- The MongoDB app is the source of truth for the project.
- Local credentials for the MongoDB app are documented in `aetherscan-mongodb/CREDENTIALS.md`.
