import test from 'node:test';
import assert from 'node:assert/strict';
import { createIdmMock } from '../src/idm-mock.js';

const pfClient = {
  clientId: 'triage-copilot',
  name: 'Support Triage Copilot',
  enabled: true,
  scopes: ['tickets:read'],
  owner: 'support-eng',
  tags: ['_pf_system_tag_ai_agent'],
};

test('first sync creates a managed record', () => {
  const idm = createIdmMock();
  const { action, record } = idm.upsertFromPf(pfClient, { runId: 'sync-001' });
  assert.equal(action, 'created');
  assert.equal(record._id, 'agent-triage-copilot');
  assert.equal(record.sourceSystem, 'pingfederate');
  assert.equal(record.accountStatus, 'active');
  assert.equal(idm.count, 1);
});

test('second sync updates, not duplicates', () => {
  const idm = createIdmMock();
  idm.upsertFromPf(pfClient, { runId: 'sync-001' });
  const { action } = idm.upsertFromPf({ ...pfClient, enabled: false }, { runId: 'sync-002' });
  assert.equal(action, 'updated');
  assert.equal(idm.count, 1);
  assert.equal(idm.get('agent-triage-copilot').accountStatus, 'inactive');
});

test('audit records created and updated actions', () => {
  const idm = createIdmMock();
  idm.upsertFromPf(pfClient, { runId: 'sync-001' });
  idm.upsertFromPf(pfClient, { runId: 'sync-002' });
  assert.deepEqual(idm.audit.map((a) => a.action), ['created', 'updated']);
});

test('disabled client maps to inactive account', () => {
  const idm = createIdmMock();
  const { record } = idm.upsertFromPf({ ...pfClient, enabled: false }, { runId: 'r' });
  assert.equal(record.accountStatus, 'inactive');
});
