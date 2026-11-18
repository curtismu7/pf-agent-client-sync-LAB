import test from 'node:test';
import assert from 'node:assert/strict';
import { createPfMock, AI_AGENT_TAG } from '../src/pf-mock.js';

test('mock pf lists all clients', () => {
  const pf = createPfMock();
  assert.equal(pf.listClients().length, 5);
});

test('AI agent tag filter returns only tagged clients', () => {
  const pf = createPfMock();
  const agents = pf.listClients({ filterTag: AI_AGENT_TAG });
  assert.equal(agents.length, 3);
  for (const a of agents) assert.ok(a.tags.includes(AI_AGENT_TAG));
});

test('inventory report counts totals and matches', () => {
  const pf = createPfMock();
  const r = pf.inventoryReport({ filterTag: AI_AGENT_TAG });
  assert.equal(r.totalClients, 5);
  assert.equal(r.matchedClients, 3);
  assert.ok(r.generatedAt);
});

test('returned client objects are copies (no mutation leak)', () => {
  const pf = createPfMock();
  const [c] = pf.listClients();
  c.tags.push('evil');
  assert.equal(pf.listClients()[0].tags.includes('evil'), false);
});
