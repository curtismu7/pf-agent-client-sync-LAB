#!/usr/bin/env node
// Doctor: verifies the lab's own health contract.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;

function check(name, ok, detail = '') {
  if (ok) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ''}`); }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => resolve({ status: res.statusCode, body: b }));
    }).on('error', reject);
  });
}

const base = `http://127.0.0.1:${process.env.PORT || 7824}`;

const files = ['README.md', 'CLAUDE.md', 'docs/talk-track.md', 'content-pack.json',
  'Dockerfile', 'docker-compose.yml', '.github/workflows/ci.yml', 'docs/shelf-entry.json'];
for (const f of files) check(`file ${f}`, fs.existsSync(path.join(root, f)));

const health = await getJson(`${base}/api/health`).catch(() => null);
check('GET /api/health reachable', Boolean(health));
if (health) check('health contract demo-health/1', health.body.includes('demo-health/1'));

const info = await getJson(`${base}/api/info`).catch(() => null);
check('GET /api/info reachable', Boolean(info));
if (info) check('info has source + realAvailable', info.body.includes('source') && info.body.includes('realAvailable'));

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail ? 1 : 0);
