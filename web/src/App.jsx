import React, { useCallback, useEffect, useState } from 'react';
import TopMenu from './top-menu/TopMenu.jsx';
import TalkTrackDialog from "./talk-track/TalkTrackDialog.jsx";
import talkMd from "../../docs/talk-track.md?raw";
import JsonPane from './json/JsonPane.jsx';
import FlowDiagram from './StudioDiagram.jsx';
import './app.css';

const TABS = [
  { id: 'sync', label: 'Sync' },
  { id: 'clients', label: 'PF clients' },
  { id: 'agents', label: 'IDM agents' },
  { id: 'runs', label: 'Sync runs' },
  { id: 'diagram', label: 'Flow' },
  { id: 'about', label: 'About' },
];

export default function App() {
  const [tab, setTab] = useState('sync');
  const [info, setInfo] = useState(null);
  const [theme, setTheme] = useState('auto');
  const [talkOpen, setTalkOpen] = useState(false);
  const talkSteps = (() => {
    const steps = []; let n = 0;
    for (const line of talkMd.split("\n")) {
      const m = line.match(/^\d+\.\s+(?:"(.+?)"|\*\*(.+?)\.\*\*\s*(.*))$/);
      if (m) { n += 1; steps.push({ id: `s${n}`, title: (m[1] || m[2]).slice(0, 60), say: m[1] || m[3] }  );
}

    }
    return steps.length ? steps : [{ id: "s1", title: "Talk track", say: talkMd.slice(0, 600) }];
  })();
  const [fontSize, setFontSize] = useState('M');

  useEffect(() => {
    fetch('/api/info').then((r) => r.json()).then(setInfo).catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    const px = { S: '14px', M: '16px', L: '18px' }[fontSize] || '16px';
    document.documentElement.style.setProperty('--fs', px);
  }, [theme, fontSize]);

  const api = useCallback((path, opts) => fetch(path, opts).then((r) => r.json()), []);

  return (
    <div className="app">
      <header className="shell-bar">
        <div className="shell-bar__brand">
          <span className="shell-bar__title">PF Agent Client Sync LAB</span>
          <span className="shell-bar__sub">PingFederate 13.1 AI-Agent clients → PingIDM</span>
        </div>
        <TopMenu
          mode={{
            value: info?.source ?? 'mock',
            realAvailable: Boolean(info?.realAvailable),
            realHint: 'Real mode needs PF_BASE_URL, PF_ADMIN_USER and PF_ADMIN_PASSWORD in the app .env',
            onChange: async (v) => {
              const res = await fetch('/api/mode', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ source: v }),
              });
              if (res.ok) setInfo((i) => ({ ...i, source: v }));
            },
          }}
          theme={{ value: theme, onChange: setTheme }}
          talkTrack={{ active: talkOpen, onToggle: () => setTalkOpen((v) => !v) }}
          fontSize={{ value: fontSize, onChange: setFontSize }}
        />
      </header>

      <div className="sim-banner" role="note">
        <strong>Simulated:</strong> this lab mocks the PingFederate 13.1 admin API and PingIDM.
        Real mode (when configured) reads a real PingFederate read-only; PingIDM stays simulated.
        The <code>_pf_system_tag_ai_agent</code> tag name is real; demo clients are synthetic.
      </div>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab${tab === t.id ? ' tab--active' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="page">
        {tab === 'sync' && <SyncTab api={api} info={info} />}
        {tab === 'clients' && <ClientsTab api={api} />}
        {tab === 'agents' && <AgentsTab api={api} />}
        {tab === 'runs' && <RunsTab api={api} />}
        {tab === 'diagram' && <FlowDiagram id="pf-agent-client-sync" />}
        {tab === 'about' && <AboutTab info={info} />}
      </main>

      <TalkTrackDialog isOpen={talkOpen} onClose={() => setTalkOpen(false)} talk={talkSteps} />
    </div>
  );
}

function SyncTab({ api, info }) {
  const [inventory, setInventory] = useState(null);
  const [agents, setAgents] = useState(null);
  const [run, setRun] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api('/api/pf/inventory').then(setInventory);
    api('/api/idm/agents').then((d) => setAgents(d.agents));
  }, [api]);

  useEffect(load, [load]);

  const runSync = async () => {
    setBusy(true);
    const out = await api('/api/sync/run', { method: 'POST' });
    setRun(out);
    load();
    setBusy(false);
  };

  return (
    <div className="grid">
      <section className="card">
        <h2>PingFederate 13.1 — AI-Agent tagged OAuth clients</h2>
        <p className="muted">
          PF 13.1 lets agents be identified as OAuth clients carrying the system tag{' '}
          <code>_pf_system_tag_ai_agent</code>. Administrators filter those clients and generate
          inventory reports through the Admin API.
        </p>
        {inventory && (
          <div className="kpis">
            <div className="kpi"><span className="kpi__n">{inventory.totalClients}</span><span className="kpi__l">total OAuth clients</span></div>
            <div className="kpi kpi--accent"><span className="kpi__n">{inventory.matchedClients}</span><span className="kpi__l">tagged AI agents</span></div>
            <div className="kpi"><span className="kpi__n">{(agents ?? []).length}</span><span className="kpi__l">managed in IDM</span></div>
          </div>
        )}
        <button className="btn btn--primary" onClick={runSync} disabled={busy}>
          {busy ? 'Syncing…' : run?.dryRun ? 'Run sync (preview)' : 'Run one-way sync → PingIDM'}
        </button>
        {run && (
          <div className="run-result">
            <p className={run.error ? 'err' : 'ok'}>
              {run.error
                ? `Sync failed: ${run.message}`
                : `${run.dryRun ? 'Preview' : 'Run'} ${run.runId}: ${run.agentsMatched} agents matched, ${run.created ?? 0} created, ${run.updated ?? 0} updated`}
            </p>
            <JsonPane data={run} hot={['created', 'updated', 'agentsMatched', 'error', 'action']} />
          </div>
        )}
      </section>

      <section className="card">
        <h2>What this establishes</h2>
        <ul>
          <li>Agents stay OAuth clients in PingFederate (registration, credentials, grants).</li>
          <li>Each tagged client gets a managed identity record in PingIDM.</li>
          <li>That record is the foundation for ownership, privileges and lifecycle — not full agent governance.</li>
          <li>One-way sync, PingFederate → PingIDM. Requires PF 13.1+.</li>
          <li className="muted">Release timing, supported IDM version, packaging and licensing: UNVERIFIED — subject to Product confirmation.</li>
        </ul>
        {info && <p className="muted">Mode: <strong>{info.source}</strong>. Real configured: {String(info.realAvailable)}.</p>}
      </section>
    </div>
  );
}

function ClientsTab({ api }) {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/api/pf/ai-agents').then(setData);
  }, [api]);
  return (
    <section className="card">
      <h2>OAuth clients tagged <code>_pf_system_tag_ai_agent</code></h2>
      {data?.error && <p className="err">{data.message}</p>}
      {data?.agents && (
        <table className="tbl">
          <thead><tr><th>Client ID</th><th>Name</th><th>Grant types</th><th>Scopes</th><th>Owner</th><th>Enabled</th></tr></thead>
          <tbody>
            {data.agents.map((a) => (
              <tr key={a.clientId}>
                <td><code>{a.clientId}</code></td>
                <td>{a.name}</td>
                <td>{(a.grantTypes ?? []).join(', ')}</td>
                <td>{(a.scopes ?? []).join(', ')}</td>
                <td>{a.owner ?? '—'}</td>
                <td><span className={`chip ${a.enabled ? 'chip--ok' : 'chip--off'}`}>{a.enabled ? 'enabled' : 'disabled'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {data && <JsonPane data={data} hot={['clientId', 'tags', '_pf_system_tag_ai_agent']} />}
    </section>
  );
}

function AgentsTab({ api }) {
  const [agents, setAgents] = useState(null);
  useEffect(() => {
    api('/api/idm/agents').then((d) => setAgents(d.agents));
  }, [api]);
  return (
    <section className="card">
      <h2>PingIDM managed agent records</h2>
      {agents?.length === 0 && <p className="muted">No records yet — run the sync on the Sync tab.</p>}
      {agents?.length > 0 && (
        <table className="tbl">
          <thead><tr><th>Record</th><th>Display name</th><th>Status</th><th>Owner</th><th>Source client</th><th>Scopes</th><th>Last synced</th></tr></thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a._id}>
                <td><code>{a._id}</code></td>
                <td>{a.displayName}</td>
                <td><span className={`chip ${a.accountStatus === 'active' ? 'chip--ok' : 'chip--off'}`}>{a.accountStatus}</span></td>
                <td>{a.owner}</td>
                <td><code>{a.sourceClientId}</code></td>
                <td>{a.scopes.join(', ')}</td>
                <td>{a.lastSyncedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {agents && <JsonPane data={agents} hot={['sourceSystem', 'sourceClientId', 'accountStatus']} />}
    </section>
  );
}

function RunsTab({ api }) {
  const [runs, setRuns] = useState(null);
  const [audit, setAudit] = useState(null);
  useEffect(() => {
    api('/api/sync/runs').then((d) => setRuns(d.runs));
    api('/api/idm/audit').then((d) => setAudit(d.audit));
  }, [api]);
  return (
    <div className="grid">
      <section className="card">
        <h2>Sync runs</h2>
        {runs?.length === 0 && <p className="muted">No runs yet.</p>}
        {runs?.map((r) => (
          <div key={r.runId} className="run-row">
            <strong>{r.runId}</strong> — {r.agentsMatched} matched, {r.created} created, {r.updated} updated
            <span className="muted"> ({r.finishedAt})</span>
          </div>
        ))}
        {runs && <JsonPane data={runs} hot={['created', 'updated', 'action']} />}
      </section>
      <section className="card">
        <h2>IDM audit trail</h2>
        {audit?.length === 0 && <p className="muted">Nothing synced yet.</p>}
        {audit?.length > 0 && <JsonPane data={audit} hot={['action', 'agentId']} />}
      </section>
    </div>
  );
}

function AboutTab({ info }) {
  return (
    <section className="card">
      <h2>About</h2>
      <p>
        This lab demonstrates the proposed direction: connecting PingFederate's OAuth client model
        (13.1 "AI Agent" system tag) with agent identity management in PingIDM via a one-way
        synchronization connector.
      </p>
      <p className="muted">
        <strong>Simulation honesty:</strong> mock mode is fully offline with synthetic clients.
        Real mode performs read-only calls to a real PingFederate 13.1 admin API configured in the
        app's .env. No write is ever made to PingFederate; PingIDM is always simulated here.
      </p>
      {info && <JsonPane data={info} hot={['source', 'aiAgentTag', 'realAvailable']} />}
    </section>
  );
}

