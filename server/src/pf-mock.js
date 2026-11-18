// PF 13.1 admin API mock: OAuth clients, AI Agent system tag filter, inventory report.
// This is a mock, not PingFederate. All data synthetic. Hosts are .invalid.
export const AI_AGENT_TAG = '_pf_system_tag_ai_agent';

let idCounter = 100;
const now = () => new Date().toISOString();

const seedClients = () => ([
  {
    clientId: 'acme-research-agent',
    name: 'Acme Research Agent',
    grantTypes: ['client_credentials'],
    scopes: ['research:read', 'openid'],
    tags: [AI_AGENT_TAG],
    enabled: true,
    owner: 'agent-platform-team',
    createdAt: '2026-10-02T09:15:00Z',
  },
  {
    clientId: 'svc-portal-web',
    name: 'Service Portal Web',
    grantTypes: ['authorization_code'],
    scopes: ['profile'],
    tags: [],
    enabled: true,
    owner: 'web-team',
    createdAt: '2026-08-11T14:00:00Z',
  },
  {
    clientId: 'compliance-reporter-bot',
    name: 'Compliance Reporter Bot',
    grantTypes: ['client_credentials'],
    scopes: ['reports:read'],
    tags: [AI_AGENT_TAG],
    enabled: true,
    owner: 'risk-analytics',
    createdAt: '2026-09-20T11:30:00Z',
  },
  {
    clientId: 'legacy-etl-runner',
    name: 'Legacy ETL Runner',
    grantTypes: ['client_credentials'],
    scopes: ['warehouse:read'],
    tags: [],
    enabled: false,
    owner: 'data-eng',
    createdAt: '2025-03-01T08:00:00Z',
  },
  {
    clientId: 'triage-copilot',
    name: 'Support Triage Copilot',
    grantTypes: ['client_credentials'],
    scopes: ['tickets:read', 'tickets:write'],
    tags: [AI_AGENT_TAG],
    enabled: true,
    owner: 'support-eng',
    createdAt: '2026-11-01T16:45:00Z',
  },
]);

export function createPfMock(options = {}) {
  const clients = options.clients ?? seedClients();
  const tag = options.aiAgentTag ?? AI_AGENT_TAG;

  function listClients({ filterTag } = {}) {
    const rows = filterTag ? clients.filter((c) => c.tags.includes(filterTag)) : [...clients];
    return rows.map((c) => ({ ...c, tags: [...c.tags] }));
  }

  function inventoryReport({ filterTag } = {}) {
    const rows = listClients({ filterTag });
    return {
      reportName: filterTag ? `clients-tagged-${filterTag}` : 'all-oauth-clients',
      generatedAt: now(),
      totalClients: clients.length,
      matchedClients: rows.length,
      clients: rows,
    };
  }

  return {
    listClients,
    inventoryReport,
    get clientCount() {
      return clients.length;
    },
  };
}
