# AetherScan MongoDB

This folder is the dedicated MongoDB version of AetherScan. The original JSON-file app in the parent workspace remains untouched as a fallback.

## What changed

- Application data is stored in organized MongoDB collections instead of `.data/aetherscan.json`
- Collections are split by domain: `users`, `sessions`, `agents`, `schedules`, `assets`, `findings`, `alerts`, `scans`, `reports`, `settings`, and `metadata`
- The app can automatically migrate an older single-document `app_state` layout into the organized collections layout
- You can optionally import your old JSON data from the original app into MongoDB

## Environment setup

Copy `.env.example` to `.env.local` and set the values you want.

Required variables:

- `MONGODB_URI`
- `AETHERSCAN_DB_NAME`
- `AETHERSCAN_JWT_SECRET`

Default local example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017
AETHERSCAN_DB_NAME=aetherscan_mongodb
AETHERSCAN_JWT_SECRET=change-me-in-real-deployments
```

## Useful commands

```bash
npm install
npm run mongo:check
npm run mongo:import
npm run dev -- --port 3001
```

## Data import

By default, `npm run mongo:import` imports from the original app JSON database at `../.data/aetherscan.json`.

You can also import a specific file:

```bash
node ./scripts/import-json-to-mongo.mjs ./path/to/aetherscan.json
```

## Health check

Open `/api/health` after the app starts. It reports MongoDB connection status and collection counts.

## Database layout

The organized collections used by this app are:

- `users`
- `sessions`
- `agents`
- `schedules`
- `assets`
- `findings`
- `alerts`
- `scans`
- `reports`
- `settings`
- `metadata`

## Credentials

Seeded local accounts are documented in `CREDENTIALS.md`.
