import test from 'node:test';
import assert from 'node:assert/strict';
import { stories, cast } from '../src/stories.js';
import { createNetguard } from '../src/netguard.js';

test('every story renders with defined {{cast}} tokens only', () => {
  for (const s of stories) {
    const tokens = [...s.text.matchAll(/\{\{([a-zA-Z]+)\}\}/g)].map((m) => m[1]);
    assert.ok(tokens.length > 0, `${s.id} has no cast tokens`);
    for (const t of tokens) {
      assert.ok(t in cast, `${s.id} uses undefined token {{${t}}}`);
    }
  }
});

test('netguard self-test passes in mock mode', async () => {
  const guard = createNetguard({ mode: () => 'mock' });
  const r = await guard.selfTest();
  assert.ok(r.ok, JSON.stringify(r.checks));
  assert.equal(guard.stats().realAttempts, 0);
});

test('netguard refuses a real URL in mock mode and never touches fetch', async () => {
  let realCalled = false;
  const guard = createNetguard({ mode: () => 'mock', realFetch: async () => { realCalled = true; } });
  await assert.rejects(guard.fetchImpl('https://example.invalid/'), /no real outbound calls/);
  assert.equal(realCalled, false);
});
