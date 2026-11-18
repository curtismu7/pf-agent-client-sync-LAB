import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('content pack validates against the required top-level shape', () => {
  const pack = JSON.parse(fs.readFileSync(path.join(root, 'content-pack.json'), 'utf8'));
  for (const key of ['schema', 'id', 'title', 'version', 'demo', 'glossary', 'sources', 'cards']) {
    assert.ok(pack[key] !== undefined, `missing ${key}`);
  }
  assert.equal(pack.schema, 'demo-content-pack/1');
  assert.match(pack.demo.catalog, /^[A-Z][0-9]+$/);
  for (const s of pack.sources) {
    for (const k of ['id', 'title', 'url', 'kind', 'use', 'status', 'checked']) assert.ok(s[k] !== undefined, `source missing ${k}`);
  }
  for (const c of pack.cards) {
    for (const k of ['id', 'label', 'group', 'action']) assert.ok(c[k] !== undefined, `card missing ${k}`);
  }
});

test('diagram is diagram-studio/1 data with nodes, edges and steps', () => {
  const d = JSON.parse(fs.readFileSync(path.join(root, 'web/src/diagrams/pf-agent-client-sync.json'), 'utf8'));
  assert.equal(d.schema, 'diagram-studio/1');
  assert.ok(d.nodes.length >= 4);
  assert.ok(d.edges.length >= 3);
  assert.ok(d.steps.length >= 3);
  const ids = new Set(d.nodes.map((n) => n.id));
  for (const e of d.edges) {
    assert.ok(ids.has(e.source), `edge source ${e.source} unknown`);
    assert.ok(ids.has(e.target), `edge target ${e.target} unknown`);
  }
});

test('no forbidden absolute author paths in tracked source', () => {
  const files = ['server/src/server.js', 'server/src/pf-real.js', 'web/src/App.jsx'];
  for (const f of files) {
    const text = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!text.includes('/Users/'), `${f} contains an absolute home path`);
  }
});
