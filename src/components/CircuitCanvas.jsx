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
  style: { stroke: '#2563eb', strokeWidth: 2.5 },
};

/**
 * Main Circuit Canvas Component
 * Manages the visualization of components and their connections.
 */
const CircuitCanvas = ({ 
  circuitData, 
  simResult, 
  onLayoutSync, 
  backgroundImage, 
  backgroundOpacity, 
  setBackgroundOpacity,
  onNetClick,
  suspectComponent
}) => {
  // Convert CircuitJSON to React Flow Nodes
  const initialNodes = useMemo(() => circuitData.components.map((comp) => ({
    id: comp.id,
    type: 'electronic',
    position: { x: comp.x, y: comp.y },
    data: { 
      ...comp, 
      simResult: simResult?.[comp.id],
      isSuspect: suspectComponent === comp.id
    },
  })), [circuitData, simResult, suspectComponent]);

  // Convert CircuitJSON to React Flow Edges (Overhauled for Net-based Topology)
  const initialEdges = useMemo(() => {
    const netGroups = {};
    circuitData.wires.forEach(w => {
      if (!netGroups[w.netId]) netGroups[w.netId] = [];
      netGroups[w.netId].push(w);
    });

    const flowEdges = [];
    Object.keys(netGroups).forEach(netId => {
      const netWires = netGroups[netId];
      // Create a chain of edges for this net to visualize connections
      for (let i = 0; i < netWires.length - 1; i++) {
        const fromWire = netWires[i];
        const toWire = netWires[i + 1];
        
        flowEdges.push({
          id: `edge-${fromWire.id}-${toWire.id}`,
          source: fromWire.componentId,
          target: toWire.componentId,
          sourceHandle: fromWire.pinId,
          targetHandle: toWire.pinId,
          type: 'circuit',
          data: {
            current: simResult?.[fromWire.componentId]?.current || 0,
            netId: netId
          },
        });
      }
    });
    return flowEdges;
  }, [circuitData, simResult]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes when suspectComponent or simResult changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isSuspect: suspectComponent === node.id,
          simResult: simResult?.[node.id],
        },
      }))
    );
  }, [simResult, suspectComponent, setNodes]);

  // Sync edges when simResult changes
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

  const onEdgeClick = useCallback((event, edge) => {
    if (onNetClick && edge.data?.netId) {
      onNetClick(edge.data.netId);
    }
  }, [onNetClick]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

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
    
    const layoutNodes = nds => nds.map((node) => {
      const elkNode = layout.children.find((n) => n.id === node.id);
      return {
        ...node,
        position: { x: elkNode.x, y: elkNode.y },
      };
    });

    setNodes(layoutNodes);
    
    if (onLayoutSync) {
      setNodes((nds) => {
        const updatedNodes = layoutNodes(nds);
        onLayoutSync(updatedNodes);
        return updatedNodes;
      });
    }
  }, [nodes, edges, setNodes, onLayoutSync]);

  return (
    <div style={{ width: '100%', height: '550px', background: '#ffffff', borderRadius: '24px', border: '1px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10, display: 'flex', gap: '10px' }}>
        {backgroundImage && (
          <div className="glass-card" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }}>Opacity:</span>
            <input 
              type="range" min="0" max="1" step="0.1" 
              value={backgroundOpacity} 
              onChange={(e) => setBackgroundOpacity(parseFloat(e.target.value))}
              style={{ width: '80px', cursor: 'pointer' }}
            />
          </div>
        )}
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
        onEdgeClick={onEdgeClick}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
      >
        <Background />
        <Controls />
        
        {/* Physical Schematic Overlay */}
        {backgroundImage && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundImage: `url(${backgroundImage})`,
              backgroundSize: 'contain',
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'center',
              opacity: backgroundOpacity,
              pointerEvents: 'none',
              zIndex: -1
            }}
          />
        )}
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
