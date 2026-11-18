import test from 'node:test';
import assert from 'node:assert/strict';
import { createConnector } from '../src/connector.js';
import { createPfMock, AI_AGENT_TAG } from '../src/pf-mock.js';
import { createIdmMock } from '../src/idm-mock.js';

test('sync creates records for each tagged client and reports counts', async () => {
  const pf = createPfMock();
  const idm = createIdmMock();
  const c = createConnector({ pf, idm, aiAgentTag: AI_AGENT_TAG });
  const run = await c.runSync();
  assert.equal(run.agentsMatched, 3);
  assert.equal(run.created, 3);
  assert.equal(run.updated, 0);
  assert.equal(idm.count, 3);
});

test('idempotent second run: all updates, zero creates', async () => {
  const pf = createPfMock();
  const idm = createIdmMock();
  const c = createConnector({ pf, idm, aiAgentTag: AI_AGENT_TAG });
  await c.runSync();
  const run2 = await c.runSync();
  assert.equal(run2.created, 0);
  assert.equal(run2.updated, 3);
});

test('runs are listed newest-first with a bounded action list', async () => {
  const c = createConnector({ pf: createPfMock(), idm: createIdmMock(), aiAgentTag: AI_AGENT_TAG });
  await c.runSync();
  await c.runSync();
  const runs = c.listRuns();
  assert.equal(runs.length, 2);
  assert.equal(runs[0].runId, 'sync-002');
  assert.ok(runs[0].startedAt <= runs[0].finishedAt);
});

test('untagged clients are never synced (one-way, filter-only)', async () => {
  const idm = createIdmMock();
  const c = createConnector({ pf: createPfMock(), idm, aiAgentTag: AI_AGENT_TAG });
  await c.runSync();
  assert.equal(idm.get('agent-svc-portal-web'), null);
  assert.equal(idm.get('agent-legacy-etl-runner'), null);
});
