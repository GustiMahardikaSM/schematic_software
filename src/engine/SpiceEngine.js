import { lusolve, matrix } from 'mathjs';

/**
 * Miniature MNA (Modified Nodal Analysis) Engine
 * Fixed version: Correctly maps components between nodes in a loop/chain.
 */
export class SpiceEngine {
  constructor() {
    this.R_OPEN = 1e9;
    this.R_SHORT = 1e-3;
    this.R_SHUNT = 1e-12;
  }

  solve(circuit) {
    const { components, wires } = circuit;
    if (!components.length || !wires.length) return {};

    // 1. Identify Nodes (Nets)
    // We treat each 'wire' as a connection between two nodes.
    // In our simplified 'from'/'to' model, each component 'i' sits between node 'i' and node 'i+1'.
    // We map 'wires' to establish which component port connects to which node.
    const { nodeToIndex, nodeCount, compConnections, vSources } = this._parseTopology(components, wires);

    if (nodeCount === 0) return {};

    const N = nodeCount - 1; // Exclude ground (index 0)
    const M = vSources.length;
    const size = N + M;

    // 2. Initialize A matrix and Z vector
    let A = Array(size).fill(0).map(() => Array(size).fill(0));
    let z = Array(size).fill(0);

    // 3. Populate MNA Matrix
    components.forEach((comp) => {
      const conn = compConnections[comp.id];
      if (!conn) return;

      const n1 = conn.n1; // Node index 1
      const n2 = conn.n2; // Node index 2
      
      // Matrix indices (shifted by 1 because 0 is GND)
      const i = n1 > 0 ? n1 - 1 : undefined;
      const j = n2 > 0 ? n2 - 1 : undefined;

      let val = comp.value;
      if (comp.fault === 'open') val = this.R_OPEN;
      if (comp.fault === 'short') val = this.R_SHORT;

      if (comp.type === 'resistor' || comp.type === 'ground') {
        const g = comp.type === 'ground' ? 1e12 : 1 / (val || 1);
        if (i !== undefined) A[i][i] += g;
        if (j !== undefined) A[j][j] += g;
        if (i !== undefined && j !== undefined) {
          A[i][j] -= g;
          A[j][i] -= g;
        }
      } else if (comp.type === 'source') {
        const vIdx = vSources.indexOf(comp);
        const k = N + vIdx;
        if (i !== undefined) {
          A[i][k] += 1;
          A[k][i] += 1;
        }
        if (j !== undefined) {
          A[j][k] -= 1;
          A[k][j] -= 1;
        }
        z[k] = val;
      }
    });

    // 4. Stability (RSHUNT)
    for (let i = 0; i < N; i++) A[i][i] += this.R_SHUNT;

    // 5. Solve
    try {
      const x = lusolve(matrix(A), z).toArray().map(v => v[0]);
      
      // 6. Map Results back
      const results = {};
      components.forEach(comp => {
        const conn = compConnections[comp.id];
        const v1 = conn.n1 > 0 ? x[conn.n1 - 1] : 0;
        const v2 = conn.n2 > 0 ? x[conn.n2 - 1] : 0;
        const vDiff = Math.abs(v1 - v2);
        
        let current = 0;
        if (comp.type === 'resistor') {
          let r = comp.fault === 'open' ? this.R_OPEN : (comp.fault === 'short' ? this.R_SHORT : comp.value);
          current = vDiff / r;
        } else if (comp.type === 'source') {
          current = Math.abs(x[N + vSources.indexOf(comp)]);
        }
        
        results[comp.id] = { voltage: vDiff, current, wattage: vDiff * current };
      });
      return results;
    } catch (e) {
      console.error("Solver Fail:", e);
      return {};
    }
  }

  /**
   * Parses the simple wire list into a dual-terminal node map.
   * Logic: Each component 'X' is between node X_in and X_out.
   * A wire from A to B connects A_out and B_in.
   */
  _parseTopology(components, wires) {
    const parent = {};
    const find = (i) => {
      if (parent[i] === undefined) return i;
      return (parent[i] = find(parent[i]));
    };
    const union = (i, j) => {
      const r1 = find(i);
      const r2 = find(j);
      if (r1 !== r2) parent[r1] = r2;
    };

    // Each component has two terminals
    components.forEach(c => {
      // Initialize unique terminals for each component
      // c.id + "_in" and c.id + "_out"
    });

    // Wires connect terminals
    wires.forEach(w => {
      union(w.from + "_out", w.to + "_in");
    });

    // Find Ground
    const gndComp = components.find(c => c.type === 'ground');
    const gndRoot = gndComp ? find(gndComp.id + "_in") : find(components[0].id + "_in");

    // Map roots to indices (GND = 0)
    const roots = new Set();
    components.forEach(c => {
      roots.add(find(c.id + "_in"));
      roots.add(find(c.id + "_out"));
    });

    const rootToIndex = { [gndRoot]: 0 };
    let idx = 1;
    roots.forEach(r => {
      if (r !== gndRoot) rootToIndex[r] = idx++;
    });

    const compConnections = {};
    components.forEach(c => {
      compConnections[c.id] = {
        n1: rootToIndex[find(c.id + "_in")],
        n2: rootToIndex[find(c.id + "_out")]
      };
    });

    return {
      nodeCount: idx,
      compConnections,
      vSources: components.filter(c => c.type === 'source')
    };
  }
}
