# pf-agent-client-sync-LAB

Demo lab: PingFederate 13.1 AI-Agent-tagged OAuth clients synced one-way into simulated PingIDM agent records.

- Run: `npm ci && npm run build && npm start` (port 7824, loopback-only) or `docker compose up --build`.
- Tests: `npm test` (node --test, server). Web: `cd web && npm run build`.
- Doctor: `npm run doctor`.
- Rules that bite: mock sign-in never exists here (no login); loopback-only bind + Host check + same-origin writes; Real mode is read-only against PF and needs this app's own `.env` (never committed); JsonPane/TopMenu vendored with sha256 pins — never hand-edit; diagram is diagram-studio/1 data.
- No AI attribution anywhere.
