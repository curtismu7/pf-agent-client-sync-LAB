import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../src/App.jsx';

function mockFetch(route) {
  if (route === '/api/info') {
    return { source: 'mock', realAvailable: false, aiAgentTag: '_pf_system_tag_ai_agent' };
  }
  if (route === '/api/pf/inventory') {
    return { reportName: 'r', generatedAt: '2026-11-18T00:00:00Z', totalClients: 5, matchedClients: 2, clients: [] };
  }
  if (route === '/api/idm/agents') return { agents: [] };
  if (route === '/api/pf/ai-agents') {
    return { source: 'mock', aiAgentTag: '_pf_system_tag_ai_agent', agents: [{ clientId: 'a1', name: 'A1', grantTypes: ['client_credentials'], scopes: ['x'], owner: 'o', enabled: true }] };
  }
  if (route === '/api/sync/runs') return { runs: [] };
  if (route === '/api/idm/audit') return { audit: [] };
  if (route === '/api/sync/run') return { runId: 'sync-001', agentsMatched: 2, created: 2, updated: 0, actions: [] };
  return {};
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => Promise.resolve({ json: () => Promise.resolve(mockFetch(new URL(url, 'http://x').pathname)) })));
});

describe('App', () => {
  it('renders the shell bar, banner and sync KPIs in mock mode', async () => {
    render(<App />);
    expect(screen.getByText(/PF Agent Client Sync LAB/)).toBeTruthy();
    expect(screen.getByText(/Simulated/)).toBeTruthy();
    await waitFor(() => expect(screen.getByText('2')).toBeTruthy());
    expect(screen.getByText(/tagged AI agents/)).toBeTruthy();
    expect(screen.getByText(/Mode:/)).toBeTruthy();
  });

  it('runs the sync from the button', async () => {
    render(<App />);
    const btn = await waitFor(() => screen.getByText(/Run one-way sync/));
    fireEvent.click(btn);
    await waitFor(() => expect(screen.getByText(/2 agents matched/)).toBeTruthy());
  });

  it('shows the PF clients table', async () => {
    render(<App />);
    fireEvent.click(screen.getByText('PF clients'));
    await waitFor(() => expect(screen.getByText('a1')).toBeTruthy());
    expect(screen.getAllByText(/_pf_system_tag_ai_agent/).length).toBeGreaterThan(0);
  });
});
