# AetherScan MongoDB

This is the active and maintained AetherScan application.

## Features

- Next.js dashboard and API routes
- MongoDB-backed persistence
- role-based access for admin, engineer, and technician users
- scan agents with heartbeat, job polling, and result submission
- internal network scan scheduling and on-demand scans
- vulnerability tracking, alerts, remediation workflow, and reporting

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
npm run dev:https
npm run build
npm run lint
```

Open `https://localhost:3001/login` after the development server starts.

## Kali/Linux agent setup

Register an agent from the dashboard, then run these commands on the Kali/Linux agent host.

```bash
sudo apt update && sudo apt install -y nodejs npm nmap
cd ~/Desktop/AetherScan/aetherscan-mongodb
npm install

# Use your Windows host IP, or the gateway IP from: ip route | grep default
export AETHERSCAN_SERVER_URL="https://<WINDOWS_HOST_OR_GATEWAY_IP>:3001"
export AETHERSCAN_AGENT_TOKEN="<agent-token-from-dashboard>"
export AETHERSCAN_ONCE=false

# Local self-signed HTTPS only. Remove this when using a trusted certificate.
export NODE_TLS_REJECT_UNAUTHORIZED=0

node ./scripts/aetherscan-agent.mjs
```

Verify the server is reachable from Kali before starting the agent:

```bash
curl -k https://<WINDOWS_HOST_OR_GATEWAY_IP>:3001/api/health
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
