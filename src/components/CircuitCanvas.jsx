import React, { useCallback, useMemo, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ElectronicNode from './nodes/ElectronicNode';
import CircuitEdge from './edges/CircuitEdge';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const nodeTypes = {
  electronic: ElectronicNode,
};

const edgeTypes = {
  circuit: CircuitEdge,
};

const defaultEdgeOptions = {
  type: 'circuit',
  style: { stroke: '#00e5ff', strokeWidth: 3 },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#00e5ff',
    width: 20,
    height: 20,
  },
};

/**
 * Main Circuit Canvas Component
 * Manages the visualization of components and their connections.
 */
const CircuitCanvas = ({ circuitData, simResult }) => {
  // Convert CircuitJSON to React Flow Nodes
  const initialNodes = useMemo(() => circuitData.components.map((comp) => ({
    id: comp.id,
    type: 'electronic',
    position: { x: comp.x, y: comp.y },
    data: { 
      ...comp, 
      simResult: simResult?.[comp.id] 
    },
  })), [circuitData, simResult]);

  // Convert CircuitJSON to React Flow Edges
  const initialEdges = useMemo(() => circuitData.wires.map((wire) => {
    // Find source component to get current flow
    const sourceCompResult = simResult?.[wire.from];
    
    return {
      id: wire.id,
      source: wire.from,
      target: wire.to,
      label: wire.label,
      type: 'circuit', // Use our custom SMIL animated edge
      data: {
        current: sourceCompResult?.current || 0
      },
    };
  }), [circuitData, simResult]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when simResult changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          simResult: simResult?.[node.id]
        }
      }))
    );
  }, [simResult, setNodes]);

  // Sync edges when simResult changes (for animation speed)
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          current: simResult?.[edge.source]?.current || 0
        }
      }))
    );
  }, [simResult, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Algorithmic Layout using Elk.js
  const onLayout = useCallback(async () => {
    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '100',
        'elk.layered.spacing.nodeNodeLayered': '100',
      },
      children: nodes.map((node) => ({
        id: node.id,
        width: 150,
        height: 120,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
      })),
    };

    const layout = await elk.layout(elkGraph);
    
    setNodes((nds) =>
      nds.map((node) => {
        const elkNode = layout.children.find((n) => n.id === node.id);
        return {
          ...node,
          position: { x: elkNode.x, y: elkNode.y },
        };
      })
    );
  }, [nodes, edges, setNodes]);

  return (
    <div style={{ width: '100%', height: '550px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10 }}>
        <button 
          onClick={onLayout}
          className="btn-secondary"
          style={{ padding: '8px 16px', fontSize: '12px', background: '#ffffff' }}
        >
          ✨ Rapikan Skema
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
      >
        <Controls style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px' }} />
        <MiniMap 
          style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }} 
          nodeColor="#2563eb11"
          maskColor="#f8fafc88"
        />
        <Background color="#94a3b8" gap={20} variant="dots" opacity={0.2} />
      </ReactFlow>
    </div>
  );
};

export default CircuitCanvas;
