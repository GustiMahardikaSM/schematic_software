import { SpiceEngine } from './SpiceEngine';

/**
 * FaultDiagnostic Module
 * Handles the generation of a Fault Dictionary and the diagnosis algorithm.
 */

const engine = new SpiceEngine();

export function generateFaultDictionary(circuitData) {
  const dictionary = [];
  const { components, wires } = circuitData;

  // We sweep through each component and inject potential faults
  components.forEach((comp) => {
    // Only diagnose components that are prone to failure (Passive & Semis)
    if (['resistor', 'diode', 'capacitor', 'inductor', 'zener'].includes(comp.type)) {
      
      const scenarios = [
        { type: 'open', desc: 'Terputus (Open Circuit)' },
        { type: 'short', desc: 'Hubung Singkat (Short Circuit)' },
        { type: 'leaky', desc: 'Kebocoran Arus (Leaky Component)' }
      ];

      scenarios.forEach(scenario => {
        // Inject fault into a copy of the circuit data
        const faultCircuit = {
          ...circuitData,
          components: components.map(c => 
            c.id === comp.id ? { ...c, fault: scenario.type } : { ...c, fault: 'normal' }
          )
        };

        try {
          // Simulate the faulty circuit
          // We use a small time step and 1 iteration for a "snapshot" of the fault behavior
          const result = engine.solve(faultCircuit, 0.001);
          
          if (result.nets && result.nodes) {
            // Map net IDs to voltages
            const netVoltages = {};
            Object.keys(result.nets).forEach(netId => {
              const nodeIdx = result.nets[netId];
              netVoltages[netId] = nodeIdx === 0 ? 0 : result.nodes[nodeIdx - 1];
            });

            dictionary.push({
              faultType: scenario.type,
              suspectComponent: comp.id,
              description: `${comp.label || comp.id} ${scenario.desc}`,
              resultingVoltages: netVoltages
            });
          }
        } catch (e) {
          console.warn(`Failed to simulate fault scenario for ${comp.id} (${scenario.type})`);
        }
      });
    }
  });

  return dictionary;
}

/**
 * Diagnoses a fault by comparing real measurements against the dictionary
 * using Mean Squared Error (MSE).
 */
export function diagnoseFault(measurements, dictionary) {
  if (!measurements || Object.keys(measurements).length === 0) return null;

  let bestMatch = null;
  let minError = Infinity;

  dictionary.forEach(scenario => {
    let totalError = 0;
    let count = 0;

    for (const [netId, measuredVal] of Object.entries(measurements)) {
      const simulatedVal = scenario.resultingVoltages[netId];
      if (simulatedVal !== undefined) {
        const diff = measuredVal - simulatedVal;
        totalError += diff * diff;
        count++;
      }
    }

    if (count > 0) {
      const mse = totalError / count;
      if (mse < minError) {
        minError = mse;
        bestMatch = { ...scenario, confidence: Math.max(0, 100 - (mse * 10)) };
      }
    }
  });

  // If the error is too high, the fault might be outside our dictionary
  if (minError > 5.0) {
    return { status: 'UNKNOWN', message: "Kerusakan tidak teridentifikasi. Ukur lebih banyak titik." };
  }

  return bestMatch;
}
