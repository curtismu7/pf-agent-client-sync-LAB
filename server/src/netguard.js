// The netguard: what outbound calls go through instead of raw fetch. This lab's server has no
// browser-driven outbound fetch at all — Real mode's only outbound call is the read-only PF admin
// fetch in pf-real.js, made server-side from .env config. The guard exists so mock mode can prove
// zero real outbound attempts: any caller handing it a non-loopback URL in mock mode is refused.
import assert from 'node:assert/strict';

export class NetguardRefused extends Error {}

export function createNetguard({ mode, realFetch = globalThis.fetch }) {
  const stats = { realAttempts: 0, refused: 0 };

  async function fetchImpl(url, init) {
    if (mode() === 'mock') {
      stats.refused += 1;
      throw new NetguardRefused('Mock mode: no real outbound calls');
    }
    stats.realAttempts += 1;
    return realFetch(url, init);
  }

  async function selfTest() {
    const before = { ...stats };
    const checks = [];
    let refused = false;
    try { await fetchImpl('https://example.invalid/'); } catch (e) { refused = e instanceof NetguardRefused; }
    checks.push({ name: 'mock mode refuses a real URL', ok: refused });
    checks.push({ name: 'mock mode never calls the real fetch', ok: stats.realAttempts === before.realAttempts });
    Object.assign(stats, before);
    return { ok: checks.every((c) => c.ok), checks };
  }

  return { fetchImpl, selfTest, stats: () => ({ ...stats }) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const guard = createNetguard({ mode: () => 'mock' });
  guard.selfTest().then((r) => {
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    assert.ok(r.ok);
  });
}
