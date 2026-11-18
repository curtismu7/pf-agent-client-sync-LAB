import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, setMode } from '../src/server.js';
import { isRealConfigured } from '../src/pf-real.js';

const servers = [];
test.after(() => { for (const s of servers) s.close(); });

function listen(server) {
  servers.push(server);
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

async function req(port, path, { method = 'GET', body, headers } = {}) {
  const res = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, headers: res.headers };
}

test.beforeEach(() => setMode('mock'));

test('health returns demo-health/1', async () => {
  const port = await listen(createServer());
  const { status, json } = await req(port, '/api/health');
  assert.equal(status, 200);
  assert.equal(json.contract, 'demo-health/1');
});

test('info reports source and realAvailable from env', async () => {
  const port = await listen(createServer());
  const { json } = await req(port, '/api/info');
  assert.equal(json.source, 'mock');
  assert.equal(json.realAvailable, isRealConfigured());
  assert.equal(json.aiAgentTag, '_pf_system_tag_ai_agent');
});

test('POST /api/mode to real without config answers 409', async () => {
  if (isRealConfigured()) return; // env has real config; skip
  const port = await listen(createServer());
  const { status, json } = await req(port, '/api/mode', {
    method: 'POST',
    body: { source: 'real' },
    headers: { origin: `http://127.0.0.1:${port}` },
  });
  assert.equal(status, 409);
  assert.equal(json.error, 'real_not_configured');
});

test('cross-origin POST is refused', async () => {
  const port = await listen(createServer());
  const { status } = await req(port, '/api/mode', {
    method: 'POST',
    body: { source: 'mock' },
    headers: { origin: 'http://evil.example' },
  });
  assert.equal(status, 403);
});

test('bad host is refused', async () => {
  const server = createServer();
  const port = await listen(server);
  const out = await new Promise((resolve) => {
    import('node:http').then((http) => {
      const req = http.request({ host: '127.0.0.1', port, path: '/api/health', headers: { host: 'evil.example' } }, resolve);
      req.end();
    });
  });
  let body = '';
  for await (const c of out) body += c;
  assert.equal(out.statusCode, 403);
  assert.match(body, /bad_host/);
});

test('pf/ai-agents returns only tagged agents in mock', async () => {
  const port = await listen(createServer());
  const { json } = await req(port, '/api/pf/ai-agents');
  assert.equal(json.source, 'mock');
  assert.equal(json.agents.length, 3);
});

test('inventory report via API', async () => {
  const port = await listen(createServer());
  const { json } = await req(port, '/api/pf/inventory');
  assert.equal(json.matchedClients, 3);
  assert.equal(json.totalClients, 5);
});

test('sync run + runs list + idm agents', async () => {
  const port = await listen(createServer());
  const run = await req(port, '/api/sync/run', { method: 'POST', headers: { origin: `http://127.0.0.1:${port}` } });
  assert.equal(run.json.created, 3);
  const runs = await req(port, '/api/sync/runs');
  assert.equal(runs.json.runs.length, 1);
  const agents = await req(port, '/api/idm/agents');
  assert.equal(agents.json.agents.length, 3);
  const audit = await req(port, '/api/idm/audit');
  assert.equal(audit.json.audit.length, 3);
});

test('404 answers structured JSON', async () => {
  const port = await listen(createServer());
  const { status, json } = await req(port, '/api/nope');
  assert.equal(status, 404);
  assert.equal(json.error, 'not_found');
});

test('traceparent header present on every response', async () => {
  const port = await listen(createServer());
  const { headers } = await req(port, '/api/health');
  assert.match(headers.get('x-traceparent') ?? '', /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
});

test('workspace id header parsed and defaulted', async () => {
  const { parseWorkspace } = await import('../src/server.js');
  assert.equal(parseWorkspace(undefined), 'default');
  assert.equal(parseWorkspace('team-a'), 'team-a');
  assert.equal(parseWorkspace('BAD/PATH'), 'default');
  assert.equal(parseWorkspace('x'.repeat(33)), 'default');
});
