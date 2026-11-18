#!/usr/bin/env node
// Reset a running lab: clears synced IDM records and sync-run history (mock data only).
//   node scripts/reset.mjs [base-url]     (default http://localhost:${PORT:-7824})
// Loopback only. Sends the same-origin header the server requires.
import { pathToFileURL } from 'node:url';

export async function reset(base = `http://localhost:${process.env.PORT || 7824}`) {
  const u = new URL(base);
  if (!/^localhost$|^127\.0\.0\.1$/.test(u.hostname)) throw new Error(`refusing ${u.hostname}: loopback only`);
  const r = await fetch(new URL('/api/reset', u), { method: 'POST', headers: { 'content-type': 'application/json', origin: u.origin }, body: '{}' });
  if (!r.ok) throw new Error(`reset failed: HTTP ${r.status}`);
  return r.json();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  reset(process.argv[2]).then((j) => console.log(`reset: ${j.reset}`), (e) => { console.error(e.message); process.exit(1); });
}
