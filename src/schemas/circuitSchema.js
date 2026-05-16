import { z } from 'zod';

/**
 * Zod Schema for Circuit Components
 * Combines logical (source_) and spatial (schematic_) domains.
 */
export const ComponentSchema = z.object({
  id: z.string().describe('Unique ID for the component (e.g., v1, r1)'),
  type: z.enum([
    'source', 'resistor', 'capacitor', 'inductor', 'ground',
    'diode', 'zener', 'triac',
    'ic',
    'mosfet', 'relay',
    'transformer', 'inductor_coupled',
    'varistor', 'thermistor'
  ]).describe('Functional type for MNA SPICE engine'),
  value: z.number().optional().describe('Physical value (e.g., Ohms, Volts)'),
  unit: z.string().optional().describe('Unit symbol (e.g., V, Ω)'),
  label: z.string().optional().describe('Display label for the UI'),
  model: z.string().optional().describe('Part model (e.g., 1N4004, MCR100-B, 78570)'),
  x: z.number().describe('Absolute X coordinate in canvas space'),
  y: z.number().describe('Absolute Y coordinate in canvas space'),
  fault: z.enum(['normal', 'open', 'short', 'leaky']).default('normal')
    .describe('Fault injection state for troubleshooting'),
  pins: z.array(z.object({
    id: z.string().describe('Pin identifier (e.g., "1", "VCC")'),
    label: z.string().optional(),
    x: z.number().optional().describe('Relative X offset for visual connector'),
    y: z.number().optional().describe('Relative Y offset for visual connector'),
  })).optional().describe('Custom pin definitions for multi-pin components (ICs, Transistors)'),
  properties: z.record(z.any()).optional().describe('Component-specific parameters (e.g., threshold, turns ratio)'),
});

/**
 * Zod Schema for Wires (Netlist Topology)
 * Design: Maps a component pin to a specific electrical Net (Node).
 */
export const WireSchema = z.object({
  id: z.string().describe('Unique ID for the wire/connection'),
  componentId: z.string().describe('ID of the component being connected'),
  pinId: z.string().describe('Specific pin ID on the component (e.g., "1", "VCC", "anode")'),
  netId: z.string().describe('The electrical net ID this pin belongs to (e.g., "net_0", "vcc")'),
  // Visual metadata
  x: z.number().optional().describe('Visual X coordinate of the connection point'),
  y: z.number().optional().describe('Visual Y coordinate of the connection point'),
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
