/**
 * Utility to convert React Flow nodes and edges into a SPICE-compatible Netlist.
 * This is the bridge between the visual tracing UI and the mathematical MNA engine.
 */
export function buildNetlistFromReactFlow(nodes, edges) {
  // 1. Initialize Net Tracking
  // We use the edge connections to define which pins share the same Net ID.
  const pinToNetMap = {};
  let netCounter = 1;

  // Helper to get or create a Net ID for a specific pin
  const getNetId = (nodeId, handleId) => {
    const pinKey = `${nodeId}_${handleId}`;
    return pinToNetMap[pinKey];
  };

  const assignNetId = (nodeId, handleId, netId) => {
    const pinKey = `${nodeId}_${handleId}`;
    pinToNetMap[pinKey] = netId;
  };

  // 2. Build Nets using Union-Find logic on edges
  // For each edge, the source pin and target pin are the same Net.
  edges.forEach((edge) => {
    const sourcePin = edge.sourceHandle || 'out';
    const targetPin = edge.targetHandle || 'in';
    
    const existingSourceNet = getNetId(edge.source, sourcePin);
    const existingTargetNet = getNetId(edge.target, targetPin);

    let finalNetId;
    if (existingSourceNet) {
      finalNetId = existingSourceNet;
    } else if (existingTargetNet) {
      finalNetId = existingTargetNet;
    } else {
      finalNetId = `net_${netCounter++}`;
    }

    assignNetId(edge.source, sourcePin, finalNetId);
    assignNetId(edge.target, targetPin, finalNetId);
    
    // Handle the case where we connect two already defined nets (Merge)
    if (existingSourceNet && existingTargetNet && existingSourceNet !== existingTargetNet) {
      // Simplification: In a real union-find we'd merge all, 
      // but for simple schematic traces, re-assigning is usually enough for the current loop.
      Object.keys(pinToNetMap).forEach(key => {
        if (pinToNetMap[key] === existingTargetNet) {
          pinToNetMap[key] = existingSourceNet;
        }
      });
    }
  });

  // 3. Construct Components and Wires (Netlist)
  const components = nodes.map((node) => ({
    ...node.data,
    id: node.id,
    x: node.position.x,
    y: node.position.y,
  }));

  const wires = [];
  Object.keys(pinToNetMap).forEach((pinKey, index) => {
    const [componentId, pinId] = pinKey.split('_');
    wires.push({
      id: `wire_${index}`,
      componentId,
      pinId,
      netId: pinToNetMap[pinKey]
    });
  });

  return { components, wires };
}
