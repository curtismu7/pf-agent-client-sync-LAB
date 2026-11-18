// One-way sync connector: PingFederate AI-agent-tagged OAuth clients -> PingIDM managed records.
// Source: pf (createPfMock or a real PF 13.1 admin client). Target: idm (createIdmMock).
export function createConnector({ pf, idm, aiAgentTag }) {
  const runs = [];
  let runSeq = 0;

  async function runSync() {
    const runId = `sync-${String(++runSeq).padStart(3, '0')}`;
    const startedAt = new Date().toISOString();
    const clients = pf.listClients({ filterTag: aiAgentTag });
    const actions = [];
    for (const client of clients) {
      const { action, record } = idm.upsertFromPf(client, { runId });
      actions.push({ clientId: client.clientId, agentId: record._id, action });
    }
    const run = {
      runId,
      startedAt,
      finishedAt: new Date().toISOString(),
      source: pf.sourceName ?? 'mock',
      aiAgentTag,
      clientsConsidered: pf.clientCount,
      agentsMatched: clients.length,
      created: actions.filter((a) => a.action === 'created').length,
      updated: actions.filter((a) => a.action === 'updated').length,
      actions,
    };
    runs.unshift(run);
    return run;
  }

  function listRuns() {
    return runs.map((r) => ({ ...r, actions: [...r.actions] }));
  }

  return { runSync, listRuns };
}
