# pf-agent-client-sync-LAB

**Tier: Demo** — tells the PingFederate 13.1 "AI Agent" client → PingIDM agent-identity story.

PingFederate 13.1 lets AI agents be identified as OAuth clients carrying the system tag
`_pf_system_tag_ai_agent`; administrators can filter those clients and generate inventory
reports through the Admin API. This lab demonstrates the proposed direction of connecting
PingFederate's OAuth client model with agent identity management in PingIDM through a
one-way synchronization connector:

- PingFederate keeps agent registration, credentials and grants.
- PingIDM gets a managed identity record per tagged agent — the foundation for ownership,
  privileges and lifecycle management (not a complete agent governance solution).
- One-way sync, requires PingFederate 13.1+.

**UNVERIFIED:** release timing, supported PingIDM version, packaging and licensing —
subject to Product confirmation.

## Run

```sh
npm ci && npm run build && npm start   # http://127.0.0.1:7824
npm test                               # server tests
```

Docker:

```sh
docker compose up --build              # publishes 127.0.0.1:7824 only
```

## Modes

- **Mock** (default): fully offline; synthetic PF admin API + simulated PingIDM.
- **Real**: read-only against a real PingFederate 13.1 admin API configured in this app's
  `.env` (beside `docker-compose.yml`):

  ```
  PF_BASE_URL=https://your-pf.example/
  PF_ADMIN_USER=...
  PF_ADMIN_PASSWORD=...
  ```

  Real mode never writes to PingFederate and never returns client secrets. PingIDM stays
  simulated in both modes. Real mode without configuration is refused (409) and the toggle
  is disabled with a hint.

## Honesty

- The simulation banner on every page says what is mocked.
- The tag name `_pf_system_tag_ai_agent` is real (PF 13.1, tag management docs); demo
  clients are synthetic.
- See `docs/talk-track.md` for the presenter script.

## Rules wiring

- `customer.config`: copy `customer.config.example.json` to the git-ignored
  `customer.config.json` to override brand title/tagline and vocabulary (bounded plain
  labels only, bad values fall back to defaults).
- Workspace id: each browser tab sends `X-Workspace-Id` (1-32 chars of a-z, 0-9, hyphen;
  default `default`); mock sync state is held per workspace in memory.
- Reset: the header Reset button and `npm run reset` (`POST /api/reset`) clear mock sync
  state and restore the diagram.
- Netguard: mock mode opens no socket at all — `server/src/netguard.js` refuses any real
  outbound call and its self-test proves the real fetch is never invoked.
