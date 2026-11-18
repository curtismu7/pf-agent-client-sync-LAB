// HTTP server for pf-agent-client-sync-LAB. Loopback-only by default; Host check; same-origin writes.
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPfMock, AI_AGENT_TAG } from './pf-mock.js';
import { createIdmMock } from './idm-mock.js';
import { createConnector } from './connector.js';
import { isRealConfigured, createPfReal } from './pf-real.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, '../../web/dist');

const state = {
  pfMock: createPfMock(),
  idm: createIdmMock(),
  connector: null,
  workspace: 'default',
  get mode() {
    return state._mode;
  },
};
state.connector = createConnector({ pf: state.pfMock, idm: state.idm, aiAgentTag: AI_AGENT_TAG });
state._mode = 'mock';

export function resetLab() {
  state.pfMock = createPfMock();
  state.idm = createIdmMock();
  state.connector = createConnector({ pf: state.pfMock, idm: state.idm, aiAgentTag: AI_AGENT_TAG });
  return { reset: 'ok', workspace: state.workspace };
}

export function setMode(mode) {
  if (mode !== 'mock' && mode !== 'real') throw new Error('bad mode');
  state._mode = mode;
}

function json(res, status, body, extra = {}) {
  const text = JSON.stringify(body, null, 2);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', ...extra });
  res.end(text);
}

function traceparent() {
  const tid = crypto.randomBytes(16).toString('hex');
  return `00-${tid}-${crypto.randomBytes(8).toString('hex')}-01`;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin) return true;
  try {
    if (new URL(origin).host === host) return true;
    // Behind the shared lab-proxy the SPA origin is local.ping-devops.com:<proxy-port>
    // while the upstream Host header is rewritten to pf-agent-client-sync.local.ping-devops.com:<port>.
    return /^(localhost|127\.0\.0\.1|local\.ping-devops\.com)(:\d+)?$/.test(new URL(origin).host)
      && /^(pf-agent-client-sync\.local\.ping-devops\.com|pf-agent-client-sync-lab)(:\d+)?$/.test(host ?? '');
  } catch {
    return false;
  }
}

// Tiny express-shaped shim so the route table reads like the rest of the family's servers.
const router = new Proxy({}, {
  get: (_t, method) => (path) => ({ method, path }),
});

// Route table (mirror of the switch below; consumed by tests and docs):
const ROUTES = [
  router.post('/api/mode'),
  router.post('/api/reset'),
  router.get('/api/health'),
  router.get('/api/info'),
];

export function parseWorkspace(value) {
  if (!value) return 'default';
  const v = String(value);
  return /^[a-z0-9-]{1,32}$/.test(v) ? v : 'default';
}

export function createServer() {
  return http.createServer(async (req, res) => {
    res.setHeader('x-traceparent', traceparent());
    const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
    const p = url.pathname;

    if (req.method !== 'GET' && req.method !== 'POST') {
      return json(res, 405, { error: 'method_not_allowed', message: 'Only GET and POST are allowed.' });
    }
    const host = req.headers.host ?? '';
    if (!/^(localhost|127\.0\.0\.1|local\.ping-devops\.com)(:\d+)?$/.test(host)
      && !/^(pf-agent-client-sync\.local\.ping-devops\.com|pf-agent-client-sync-lab)(:\d+)?$/.test(host)) {
      return json(res, 403, { error: 'bad_host', message: 'Host not allowed.' });
    }
    if (req.method === 'POST' && !sameOrigin(req)) {
      return json(res, 403, { error: 'cross_origin', message: 'Cross-origin writes are refused.' });
    }

    const workspaceId = parseWorkspace(req.headers['x-workspace-id']);
    res.setHeader('x-workspace-id', workspaceId);

    if (p === '/api/health') {
      return json(res, 200, { contract: 'demo-health/1', status: 'ok', mode: state.mode });
    }

    if (p === '/api/info') {
      return json(res, 200, {
        source: state.mode,
        realAvailable: isRealConfigured(),
        aiAgentTag: AI_AGENT_TAG,
        simulated: ['pingfederate-admin-api', 'pingidm'],
      });
    }

    if (p === '/api/mode' && req.method === 'POST') {
      if (state.mode === 'real' && req.headers['x-rl-reset'] !== '1') {
        // switching real->mock allowed; mock->real guarded below
      }
      let body = '';
      for await (const chunk of req) body += chunk;
      let parsed;
      try { parsed = JSON.parse(body || '{}'); } catch { parsed = {}; }
      if (parsed.source === 'real' && !isRealConfigured()) {
        return json(res, 409, { error: 'real_not_configured', message: 'Real mode needs PF_BASE_URL, PF_ADMIN_USER and PF_ADMIN_PASSWORD in .env.' });
      }
      setMode(parsed.source ?? 'mock');
      return json(res, 200, { source: state.mode });
    }

    if (p === '/api/pf/clients') {
      if (state.mode === 'real') {
        const real = createPfReal();
        const out = await real.listClients({});
        if (out.error) return json(res, 424, out);
        return json(res, 200, { source: 'real', clients: out });
      }
      return json(res, 200, { source: 'mock', clients: state.pfMock.listClients() });
    }

    if (p === '/api/pf/ai-agents') {
      const filter = { filterTag: AI_AGENT_TAG };
      if (state.mode === 'real') {
        const real = createPfReal();
        const out = await real.listClients(filter);
        if (out.error) return json(res, 424, out);
        return json(res, 200, { source: 'real', aiAgentTag: AI_AGENT_TAG, agents: out });
      }
      return json(res, 200, { source: 'mock', aiAgentTag: AI_AGENT_TAG, agents: state.pfMock.listClients(filter) });
    }

    if (p === '/api/pf/inventory') {
      if (state.mode === 'real') {
        const real = createPfReal();
        const all = await real.listClients({});
        if (all.error) return json(res, 424, all);
        const agents = all.filter((c) => c.tags.includes(AI_AGENT_TAG));
        return json(res, 200, {
          reportName: 'clients-tagged-_pf_system_tag_ai_agent',
          generatedAt: new Date().toISOString(),
          totalClients: all.length,
          matchedClients: agents.length,
          clients: agents,
        });
      }
      return json(res, 200, state.pfMock.inventoryReport({ filterTag: AI_AGENT_TAG }));
    }

    if (p === '/api/sync/run' && req.method === 'POST') {
      if (state.mode === 'real') {
        const real = createPfReal();
        const agents = await real.listClients({ filterTag: AI_AGENT_TAG });
        if (agents.error) return json(res, 424, agents);
        const preview = {
          runId: 'preview',
          source: 'real-pf',
          dryRun: true,
          agentsMatched: agents.length,
          actions: agents.map((a) => ({ clientId: a.clientId, agentId: `agent-${a.clientId}`, action: 'would-upsert' })),
        };
        return json(res, 200, preview);
      }
      const run = await state.connector.runSync();
      return json(res, 200, run);
    }

    if (p === '/api/sync/runs') {
      return json(res, 200, { runs: state.connector.listRuns() });
    }

    if (p === '/api/idm/agents') {
      return json(res, 200, { agents: state.idm.list() });
    }

    if (p === '/api/idm/audit') {
      return json(res, 200, { audit: state.idm.audit });
    }

    if (p === '/api/reset' && req.method === 'POST') {
      return json(res, 200, { ...resetLab(), workspace: workspaceId });
    }

    // Static web
    if (req.method === 'GET' && p.startsWith('/assets/')) {
      const file = path.join(WEB_DIST, p);
      if (!file.startsWith(WEB_DIST) || !fs.existsSync(file)) return json(res, 404, { error: 'not_found' });
      res.writeHead(200, { 'content-type': file.endsWith('.css') ? 'text/css' : 'application/javascript' });
      return fs.createReadStream(file).pipe(res);
    }
    if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
      const file = path.join(WEB_DIST, 'index.html');
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        return fs.createReadStream(file).pipe(res);
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end('<!doctype html><html><head><title>pf-agent-client-sync-LAB</title></head><body><p>Web bundle not built. Run: npm run build</p></body></html>');
    }

    return json(res, 404, { error: 'not_found', message: `No handler for ${p}.` });
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.js')) {
  const port = Number(process.env.PORT || 7824);
  const server = createServer();
  const bind = process.env.BIND_HOST || '127.0.0.1';
  server.listen(port, bind, () => {
    console.log(`pf-agent-client-sync-LAB listening on http://${bind}:${port}`);
  });
}
