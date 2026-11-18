import data from './pf-agent-client-sync.json';

// Static diagram is diagram-studio/1 data, loaded by id. No nodes or edges are built in JSX.
const BY_ID = new Map([[data.id, data]]);

export function loadDiagram(id) {
  const d = BY_ID.get(id);
  if (!d) throw new Error(`Unknown diagram: ${id}`);
  return d;
}
