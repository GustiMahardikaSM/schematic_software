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
    this.MAX_ITER = 100;
    this.TOLERANCE = 1e-6;
    
    // Simulation State for Transient
    this.time = 0;
    this.prevStates = {}; // Stores V and I from previous timestep
  }

  /**
   * Main Solver with support for Non-linear (Newton-Raphson) 
   * and Transient (Backward Euler)
   */
  solve(circuit, dt = 0.001) {
    const { components, wires } = circuit;
    if (!components.length || !wires.length) return {};

    const { nodeCount, compConnections, vSources, netToIndex } = this._parseTopology(components, wires);
    if (nodeCount === 0) return {};

    const N = nodeCount - 1; 
    const activeVSources = vSources.filter(c => c.fault !== 'open');
    const M = activeVSources.length;
    const size = N + M;

    let x = Array(size).fill(0);
    let converged = false;

    // Newton-Raphson Loop
    for (let iter = 0; iter < this.MAX_ITER; iter++) {
      let A = Array(size).fill(0).map(() => Array(size).fill(0));
      let z = Array(size).fill(0);

      components.forEach((comp) => {
        const conn = compConnections[comp.id];
        if (!conn) return;

        const n1 = conn['in'] !== undefined ? conn['in'] : conn['1'];
        const n2 = conn['out'] !== undefined ? conn['out'] : conn['2'];
        const i = (n1 !== undefined && n1 > 0) ? n1 - 1 : (n1 === 0 ? -1 : undefined);
        const j = (n2 !== undefined && n2 > 0) ? n2 - 1 : (n2 === 0 ? -1 : undefined);

        const vPrev = this._getVDiff(x, i, j);

        // 1. Resistors
        if (comp.type === 'resistor') {
          let r = comp.value;
          if (comp.fault === 'open') r = this.R_OPEN;
          if (comp.fault === 'short') r = this.R_SHORT;
          if (comp.fault === 'leaky') r = (comp.value || 1000) * 0.05; // 95% degradation
          this._stampConductance(A, i, j, 1 / (r || 1e-12));
        }
        // 2. Capacitors (Transient - Backward Euler)
        else if (comp.type === 'capacitor') {
          const C = comp.value;
          const gEq = C / dt;
          const vLast = this.prevStates[comp.id]?.v || 0;
          const iEq = gEq * vLast;
          this._stampConductance(A, i, j, gEq);
          this._stampCurrentSource(z, i, j, iEq);
        }
        // 3. Inductors (Transient - Backward Euler)
        else if (comp.type === 'inductor') {
          const L = comp.value;
          const gEq = dt / L;
          const iLast = this.prevStates[comp.id]?.i || 0;
          this._stampConductance(A, i, j, gEq);
          this._stampCurrentSource(z, i, j, iLast);
        }
        // 4. Diodes (Non-linear - Newton Raphson)
        else if (comp.type === 'diode' || comp.type === 'zener') {
          let { gEq, iEq } = this._getDiodeCompanion(vPrev, comp.type === 'zener');
          if (comp.fault === 'leaky') gEq += 1e-3; 
          if (comp.fault === 'open') gEq = 1/this.R_OPEN;
          if (comp.fault === 'short') gEq = 1/this.R_SHORT;
          this._stampConductance(A, i, j, gEq);
          this._stampCurrentSource(z, i, j, -iEq); 
        }
        // 5. Voltage Sources (AC support via time)
        else if (comp.type === 'source') {
          const vIdx = activeVSources.indexOf(comp);
          if (vIdx === -1) return;
          const k = N + vIdx;
          let sourceVal = comp.value;
          
          // Basic AC simulation if label contains 'AC'
          if (comp.label?.includes('AC')) {
            sourceVal = comp.value * Math.sin(2 * Math.PI * 50 * this.time);
          }

          if (i !== undefined && i !== -1) { A[i][k] += 1; A[k][i] += 1; }
          if (j !== undefined && j !== -1) { A[j][k] -= 1; A[k][j] -= 1; }
          z[k] = sourceVal;
        }
      });

      // RSHUNT for stability
      for (let s = 0; s < N; s++) A[s][s] += this.R_SHUNT;

      try {
        const nextX = lusolve(matrix(A), z).toArray().map(v => v[0]);
        
        // Check convergence
        let diff = 0;
        for (let d = 0; d < size; d++) diff += Math.abs(nextX[d] - x[d]);
        x = nextX;
        
        if (diff < this.TOLERANCE) {
          converged = true;
          break;
        }
      } catch (e) {
        console.error("Solver Fail:", e);
        return { components: {}, nets: {}, nodes: [] };
      }
    }

    // Update States and Results
    this.time += dt;
    const results = {};
    components.forEach(comp => {
      const conn = compConnections[comp.id];
      const n1 = conn['in'] !== undefined ? conn['in'] : conn['1'];
      const n2 = conn['out'] !== undefined ? conn['out'] : conn['2'];
      const v = this._getVDiff(x, n1 - 1, n2 - 1);
      
      // Calculate current based on component type
      let current = 0;
      if (comp.type === 'resistor') current = v / (comp.value || 1e-12);
      else if (comp.type === 'source') {
        const vIdx = activeVSources.indexOf(comp);
        if (vIdx !== -1) current = Math.abs(x[N + vIdx]);
      }
      
      this.prevStates[comp.id] = { v, i: current };
      results[comp.id] = { voltage: v, current, wattage: v * current };
    });

    return {
      components: results,
      nets: netToIndex,
      nodes: x
    };
  }

  _stampConductance(A, i, j, g) {
    if (i !== undefined && i !== -1) A[i][i] += g;
    if (j !== undefined && j !== -1) A[j][j] += g;
    if (i !== undefined && j !== undefined && i !== -1 && j !== -1) {
      A[i][j] -= g;
      A[j][i] -= g;
    }
  }

  _stampCurrentSource(z, i, j, iSource) {
    if (i !== undefined && i !== -1) z[i] += iSource;
    if (j !== undefined && j !== -1) z[j] -= iSource;
  }

  _getVDiff(x, i, j) {
    const v1 = (i !== undefined && i >= 0) ? x[i] : 0;
    const v2 = (j !== undefined && j >= 0) ? x[j] : 0;
    return v1 - v2;
  }

  _getDiodeCompanion(vd, isZener = false) {
    const Is = 1e-12;
    const Vt = 0.026;
    const n = 1;
    
    // Limiting to prevent exponential explosion
    const vLimited = Math.min(vd, 0.8);
    
    const id = Is * (Math.exp(vLimited / (n * Vt)) - 1);
    const gEq = (Is / (n * Vt)) * Math.exp(vLimited / (n * Vt));
    const iEq = id - gEq * vLimited;
    
    return { gEq: Math.max(gEq, 1e-15), iEq };
  }

  /**
   * Net-based Topology Parser
   * Maps (Component, Pin) -> Net -> Matrix Node Index
   */
  _parseTopology(components, wires) {
    const netToIndex = {};
    let nodeIdx = 1;

    // 1. Identify Ground Nets
    const gndNets = new Set();
    const gndComps = components.filter(c => c.type === 'ground');
    gndComps.forEach(g => {
      const connWires = wires.filter(w => w.componentId === g.id);
      connWires.forEach(w => gndNets.add(w.netId));
    });

    // Assign node 0 to all nets connected to a ground component
    gndNets.forEach(net => {
      netToIndex[net] = 0;
    });

    // 2. Identify all other nets
    wires.forEach(w => {
      if (netToIndex[w.netId] === undefined) {
        netToIndex[w.netId] = nodeIdx++;
      }
    });

    // 3. Map Component Pins to Node Indices
    const compConnections = {};
    components.forEach(c => {
      compConnections[c.id] = {};
      const compWires = wires.filter(w => w.componentId === c.id);
      compWires.forEach(w => {
        compConnections[c.id][w.pinId] = netToIndex[w.netId];
      });
    });

    return {
      nodeCount: nodeIdx,
      compConnections,
      vSources: components.filter(c => c.type === 'source'),
      netToIndex
    };
  }
}
