# AetherScan Prototype

This workspace contains a thesis-aligned working prototype of AetherScan inside the existing Next.js app.

## Implemented core architecture

- JWT-based authentication with bearer tokens
- Role-based access control for admin, engineer, and technician users
- Central web server with dashboard and REST API routes
- Agent inventory with registration, heartbeat, and job polling
- Agent-submitted scan results
- Nmap execution path for live scans on the agent host
- Risk classification and remediation guidance
- Alerts generated from high-risk findings
- Dashboard aggregation
- CSV and PDF report generation

## Local user accounts

- `admin@aetherscan.local` / `Admin123!`
- `engineer@aetherscan.local` / `Engineer123!`
- `tech@aetherscan.local` / `Tech123!`

## Agent flow

1. Register an agent in the web UI.
2. Copy the generated token to the agent host.
3. Start the agent process.
4. Queue a scan from the web UI.
5. The agent polls the server, executes Nmap locally, and submits results.
6. Dashboard, assets, vulnerabilities, and reports update from the submitted scan.
