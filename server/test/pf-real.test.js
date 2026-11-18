import test from 'node:test';
import assert from 'node:assert/strict';
import { createPfReal, pfConfigFromEnv, isRealConfigured } from '../src/pf-real.js';

test('config from env', () => {
  const c = pfConfigFromEnv({ PF_BASE_URL: 'https://pf.example/', PF_ADMIN_USER: 'a', PF_ADMIN_PASSWORD: 'b' });
  assert.equal(c.baseUrl, 'https://pf.example/');
  assert.ok(isRealConfigured({ PF_BASE_URL: 'https://pf.example/', PF_ADMIN_USER: 'a', PF_ADMIN_PASSWORD: 'b' }));
  assert.equal(isRealConfigured({}), false);
});

test('unconfigured real client answers a structured error, not a throw', async () => {
  const real = createPfReal({});
  const out = await real.listClients({});
  assert.equal(out.error, 'pf_not_configured');
});

test('unreachable PF answers pf_unreachable with JSON', async () => {
  const real = createPfReal({ PF_BASE_URL: 'http://127.0.0.1:9', PF_ADMIN_USER: 'u', PF_ADMIN_PASSWORD: 'p' });
  const out = await real.listClients({});
  assert.equal(out.error, 'pf_unreachable');
});
