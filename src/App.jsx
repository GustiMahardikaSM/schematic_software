import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import CircuitCanvas from './components/CircuitCanvas';
import ImageUploader from './components/ImageUploader';
import mockData from './data/mockCircuit.json';
import { SpiceEngine } from './engine/SpiceEngine';
import { buildNetlistFromReactFlow } from './utils/netlistBuilder';
import { generateFaultDictionary, diagnoseFault } from './engine/FaultDiagnostic';

const engine = new SpiceEngine();

function App() {
  const [circuitData, setCircuitData] = useState(mockData);
  const [simResult, setSimResult] = useState({ components: {}, nets: {}, nodes: [] });
  const [probes, setProbes] = useState({ red: 'node_1', black: 'gnd' });
  const [history, setHistory] = useState([]);
  const [baselineVoltages, setBaselineVoltages] = useState(null);
  
  // Diagnostic State
  const [faultDictionary, setFaultDictionary] = useState([]);
  const [technicianMeasurements, setTechnicianMeasurements] = useState({});
  const [diagnosedFault, setDiagnosedFault] = useState(null);

  // Background Overlay State for Tracing
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [backgroundOpacity, setBackgroundOpacity] = useState(0.4);

  // Simulation Runner: Executes the solver on an interval
  useEffect(() => {
    const timer = setInterval(() => {
      const result = engine.solve(circuitData, 0.002);
      setSimResult(result);
      
      // Update Oscilloscope History
      if (result.nets && result.nodes) {
        const nodeIdx = result.nets[probes.red];
        const vRedRaw = nodeIdx !== undefined ? (nodeIdx === 0 ? 0 : result.nodes[nodeIdx - 1]) : 0;
        const vRed = (typeof vRedRaw === 'number' && !isNaN(vRedRaw)) ? vRedRaw : 0;
        setHistory(prev => [...prev.slice(-49), vRed]);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [circuitData, probes]);

  const handleCompileSimulation = () => {
    try {
      const result = engine.solve(circuitData, 0.001);
      
      const nodeMap = {};
      Object.keys(result.nets).forEach(netId => {
        const nodeIdx = result.nets[netId];
        nodeMap[netId] = nodeIdx === 0 ? 0 : result.nodes[nodeIdx - 1];
      });

      setBaselineVoltages(nodeMap);

      // Generate Fault Dictionary for all possible component failures
      console.log("Generating Fault Dictionary...");
      const dictionary = generateFaultDictionary(circuitData);
      setFaultDictionary(dictionary);

      alert("Simulasi Baseline & Kamus Kerusakan Berhasil Dibuat!");
    } catch (error) {
      alert("Gagal kompilasi sirkuit. Pastikan semua kabel terhubung.");
    }
  };

  const handleNetMeasure = (netId) => {
    const val = prompt(`Masukkan pembacaan Multimeter riil untuk ${netId} (Volt):`);
    if (val !== null && !isNaN(val)) {
      const measuredVal = parseFloat(val);
      const newMeasurements = { ...technicianMeasurements, [netId]: measuredVal };
      setTechnicianMeasurements(newMeasurements);

      // Run Diagnosis
      if (faultDictionary.length > 0) {
        const diagnosis = diagnoseFault(newMeasurements, faultDictionary);
        setDiagnosedFault(diagnosis);
      }
    }
  };

  const toggleFault = (id, faultType) => {
    setCircuitData(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === id ? { ...c, fault: c.fault === faultType ? 'normal' : faultType } : c
      )
    }));
  };

  const updatePositions = (nodes) => {
    setCircuitData(prev => ({
      ...prev,
      components: prev.components.map(comp => {
        const updatedNode = nodes.find(n => n.id === comp.id);
        return updatedNode ? { ...comp, x: updatedNode.position.x, y: updatedNode.position.y } : comp;
      })
    }));
  };

  return (
    <div className="app-container">
      <div className="bg-glow" style={{ top: '10%', left: '5%' }}></div>
      <div className="bg-glow" style={{ bottom: '10%', right: '5%', background: 'radial-gradient(circle, #7000ff 0%, transparent 70%)' }}></div>

      <nav className="navbar">
        <div className="logo-container">
          <div className="logo-box">S</div>
          <span className="text-xl font-bold tracking-tight">Schematic AI</span>
        </div>
        <div className="nav-links">
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setBackgroundImage(null)}>
              🗑️ Clear Schematic
            </button>
            <button className="btn-secondary" onClick={() => toggleFault('d1', 'leaky')}>
              {circuitData.components.find(c => c.id === 'd1')?.fault === 'leaky' ? '🔄 Fix Diode' : '💧 Leak Diode'}
            </button>
          </div>
          <button 
            className="btn-primary" 
            style={{ background: baselineVoltages ? '#2563eb' : '#059669' }}
            onClick={handleCompileSimulation}
          >
            {baselineVoltages ? '✓ Baseline Locked' : '⚙ Compile Baseline'}
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto space-y-8" style={{ position: 'relative' }}>
        {/* Virtual Multimeter / Oscilloscope Overlay */}
        <div className="glass-card floating-instrument">
          <div className="instrument-header">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-bold">VIRTUAL INSTRUMENT</span>
            </div>
            <select 
              value={probes.red} 
              onChange={(e) => setProbes(p => ({ ...p, red: e.target.value }))}
              className="net-selector"
            >
              {Object.keys(simResult.nets).map(net => <option key={net} value={net}>Probe: {net}</option>)}
            </select>
          </div>
          
          <div className="display-panel">
            <div className="voltage-readout">
              {(history[history.length-1] || 0).toFixed(2)}<span className="unit">V</span>
            </div>
            
            <div className="oscilloscope-screen">
              <svg width="100%" height="60" viewBox="0 0 100 60" preserveAspectRatio="none">
                <path 
                  d={history.length > 0 ? `M ${history.map((v, i) => `${i*2},${30 - v/10}`).join(' L ')}` : 'M 0 30'} 
                  fill="none" 
                  stroke="#00e5ff" 
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Diagnosis Result Panel */}
        {diagnosedFault && (
          <div className="glass-card diagnosis-alert" style={{ 
            position: 'absolute', top: '20px', right: '20px', 
            zIndex: 100, width: '300px', borderLeft: '4px solid #ef4444',
            animation: 'slide-in 0.3s ease-out'
          }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-red-500">🚨</div>
              <span className="text-xs font-bold text-slate-800">DIAGNOSIS OTOMATIS</span>
            </div>
            <p className="text-sm font-semibold text-slate-900 mb-1">
              {diagnosedFault.description || diagnosedFault.message}
            </p>
            {diagnosedFault.confidence && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${diagnosedFault.confidence}%` }}></div>
                </div>
                <span className="text-[10px] font-bold text-red-500">{Math.round(diagnosedFault.confidence)}% Confidence</span>
              </div>
            )}
            <button 
              className="mt-3 text-[10px] font-bold text-slate-400 hover:text-slate-600"
              onClick={() => { setDiagnosedFault(null); setTechnicianMeasurements({}); }}
            >
              RESET DIAGNOSIS
            </button>
          </div>
        )}

        <section className="hero-content text-center" style={{ marginBottom: '1rem' }}>
          <div className="badge">Diagnostic & Troubleshooting</div>
          <h1 className="hero-title" style={{ fontSize: '2.5rem' }}>Advanced <span className="text-[#2563eb] glow-text">MNA Solver</span></h1>
          {!backgroundImage && <ImageUploader onImageUpload={setBackgroundImage} />}
        </section>

        <section className="glass-card" style={{ padding: '0.5rem' }}>
          <CircuitCanvas 
            circuitData={circuitData} 
            simResult={simResult.components} 
            onLayoutSync={updatePositions} 
            backgroundImage={backgroundImage}
            backgroundOpacity={backgroundOpacity}
            setBackgroundOpacity={setBackgroundOpacity}
            onNetClick={handleNetMeasure}
            suspectComponent={diagnosedFault?.suspectComponent}
          />
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2026 Schematic AI Project - Powered by SpiceEngine Core.</p>
      </footer>
    </div>
  )
}

export default App
