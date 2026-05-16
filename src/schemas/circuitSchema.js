import { z } from 'zod';

/**
 * Zod Schema for Circuit Components
 * Combines logical (source_) and spatial (schematic_) domains.
 */
export const ComponentSchema = z.object({
  id: z.string().describe('Unique ID for the component (e.g., v1, r1)'),
  type: z.enum(['source', 'resistor', 'capacitor', 'inductor', 'ground'])
    .describe('Functional type for MNA SPICE engine'),
  value: z.number().describe('Physical value (e.g., Ohms, Volts)'),
  unit: z.string().describe('Unit symbol (e.g., V, Ω)'),
  label: z.string().optional().describe('Display label for the UI'),
  x: z.number().describe('Absolute X coordinate in canvas space'),
  y: z.number().describe('Absolute Y coordinate in canvas space'),
  fault: z.enum(['normal', 'open', 'short']).default('normal')
    .describe('Fault injection state for troubleshooting'),
});

/**
 * Zod Schema for Wires (Netlist Topology)
 * Represents a simplified SourceNet for atomic netlist encoding.
 */
export const WireSchema = z.object({
  id: z.string().describe('Unique ID for the wire'),
  from: z.string().describe('Origin component ID'),
  to: z.string().describe('Target component ID'),
  pathType: z.enum(['up-right', 'right-down', 'down-left', 'left-up'])
    .describe('Visual path rendering metadata for orthogonal lines'),
});

/**
 * Root Schema for the entire Circuit Configuration
 */
export const CircuitSchema = z.object({
  components: z.array(ComponentSchema),
  wires: z.array(WireSchema),
});

/**
 * Utility function to validate circuit data
 * Ensures no hallucinations from AI extraction (e.g., 'O' instead of 0)
 */
export const validateCircuit = (data) => {
  return CircuitSchema.safeParse(data);
};
