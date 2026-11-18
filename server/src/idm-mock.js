// Mock PingIDM: managed identity records for agents.
// One-way sync target: the connector pushes PF AI-agent-tagged clients here.
export function createIdmMock() {
  /** @type {Map<string, object>} agentId -> record */
  const records = new Map();
  const audit = [];

  function upsertFromPf(client, { runId }) {
    const agentId = `agent-${client.clientId}`;
    const existing = records.get(agentId);
    const record = {
      _id: agentId,
      userName: agentId,
      displayName: client.name,
      accountStatus: client.enabled ? 'active' : 'inactive',
      sourceSystem: 'pingfederate',
      sourceClientId: client.clientId,
      scopes: [...client.scopes],
      owner: client.owner ?? 'unassigned',
      lastSyncedAt: new Date().toISOString(),
      lastSyncRunId: runId,
      ...(existing ? { createdOn: existing.createdOn } : { createdOn: new Date().toISOString() }),
    };
    const action = existing ? 'updated' : 'created';
    records.set(agentId, record);
    audit.push({ runId, agentId, sourceClientId: client.clientId, action, at: record.lastSyncedAt });
    return { action, record };
  }

  function list() {
    return [...records.values()];
  }

  function get(agentId) {
    return records.get(agentId) ?? null;
  }

  return {
    upsertFromPf,
    list,
    get,
    get audit() {
      return [...audit];
    },
    get count() {
      return records.size;
    },
    reset() {
      records.clear();
      audit.length = 0;
    },
  };
}
