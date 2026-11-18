import React, { useEffect, useMemo, useState } from 'react';
import ReactFlow, { Background, Controls, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { loadDiagram } from './diagrams/index.js';
import './diagram.css';

const GROUP_VARS = {
  red: 'var(--dg-red, #b3121d)',
  green: 'var(--dg-green, #1a7f37)',
  dark: 'var(--dg-dark, #1c1e21)',
};

// Renders diagram-studio/1 data. Movable boxes (ReactFlow), Reset restores positions.
export default function StudioDiagram({ id }) {
  const diagram = useMemo(() => loadDiagram(id), [id]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const build = () => {
    setNodes(
      diagram.nodes.map((n) => ({
        id: n.id,
        position: { x: n.x, y: n.y },
        data: { label: [n.label, ...(n.sub ?? [])].join('\n') },
        style: {
          width: 230,
          whiteSpace: 'pre-line',
          border: `2px solid ${GROUP_VARS[diagram.groups[n.group]?.color] ?? '#1c1e21'}`,
          borderRadius: 8,
          background: 'var(--surface, #fff)',
          color: 'var(--text, #1c1e21)',
          fontSize: 13,
        },
      }))
    );
    setEdges(
      diagram.edges.map((e, i) => ({
        id: `e${i}`,
        source: e.source,
        target: e.target,
        label: e.label,
        animated: false,
        style: { stroke: GROUP_VARS[e.color] ?? '#1c1e21', strokeWidth: 2 },
        labelStyle: { fontSize: 11 },
      }))
    );
  };

  useEffect(build, [diagram]);

  return (
    <section className="card">
      <h2>{diagram.title}</h2>
      <p className="muted">{diagram.lede}</p>
      <div className="flow-wrap" data-testid="flow">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <ol className="steps">
        {diagram.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <button className="btn" onClick={build}>Reset diagram</button>
    </section>
  );
}
