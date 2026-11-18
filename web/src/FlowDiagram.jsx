import React, { useEffect } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  { id: 'pf', position: { x: 40, y: 80 }, data: { label: 'PingFederate 13.1\nOAuth clients\n(_pf_system_tag_ai_agent)' }, style: { width: 220 } },
  { id: 'filter', position: { x: 320, y: 80 }, data: { label: 'AI-Agent tag filter\n+ inventory report' }, style: { width: 200 } },
  { id: 'conn', position: { x: 580, y: 80 }, data: { label: 'One-way sync connector' }, style: { width: 200 } },
  { id: 'idm', position: { x: 840, y: 80 }, data: { label: 'PingIDM\nmanaged agent records' }, style: { width: 220 } },
  { id: 'gov', position: { x: 840, y: 240 }, data: { label: 'Foundation: ownership,\nprivileges, lifecycle' }, style: { width: 220 } },
];

const initialEdges = [
  { id: 'e1', source: 'pf', target: 'filter', label: 'Admin API (read)' },
  { id: 'e2', source: 'filter', target: 'conn', label: 'tagged clients' },
  { id: 'e3', source: 'conn', target: 'idm', label: 'create/update records' },
  { id: 'e4', source: 'idm', target: 'gov', label: 'identity foundation' },
];

export default function FlowDiagram() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    // Reset restores default positions
    const onReset = () => {
      initialNodes.forEach((n, i) => onNodesChange({ id: n.id, type: 'position', position: n.position, dragging: false }));
    };
    window.addEventListener('lab-reset-diagram', onReset);
    return () => window.removeEventListener('lab-reset-diagram', onReset);
  }, [onNodesChange]);

  return (
    <section className="card">
      <h2>Flow: PingFederate AI-agent clients → PingIDM</h2>
      <div className="flow-wrap" data-testid="flow">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </section>
  );
}
