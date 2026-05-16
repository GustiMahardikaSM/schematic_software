import React, { useState, useEffect, useMemo } from 'react';
import './App.css';
import CircuitCanvas from './components/CircuitCanvas';
import mockData from './data/mockCircuit.json';
import { SpiceEngine } from './engine/SpiceEngine';

const engine = new SpiceEngine();

function App() {
  // State 1: Topologi Desain (CircuitJSON)
  const [circuitData, setCircuitData] = useState(mockData);

  // State 2: Hasil Kalkulasi Fisika (Real-time from SpiceEngine)
  const [simResult, setSimResult] = useState({});

  // Runner Simulasi: Mengeksekusi MNA setiap kali ada perubahan pada desain
  useEffect(() => {
    console.log("MNA Solver: Recalculating...");
    const results = engine.solve(circuitData);
    setSimResult(results);
  }, [circuitData]);

  // Fungsi untuk simulasi interaksi pengguna (Fault Injection)
  const toggleFault = (id, faultType) => {
    setCircuitData(prev => ({
      ...prev,
      components: prev.components.map(c => 
        c.id === id ? { ...c, fault: c.fault === faultType ? 'normal' : faultType } : c
      )
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
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold border border-green-200">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              SOLVER ACTIVE
            </div>
            <button 
              className="btn-secondary" 
              style={{ fontSize: '12px', borderColor: circuitData.components.find(c => c.id === 'r1')?.fault === 'open' ? '#ef4444' : '#e2e8f0', background: circuitData.components.find(c => c.id === 'r1')?.fault === 'open' ? '#fef2f2' : 'white' }} 
              onClick={() => toggleFault('r1', 'open')}
            >
              {circuitData.components.find(c => c.id === 'r1')?.fault === 'open' ? '🔄 Sambung R1' : '✂️ Putus R1 (Open)'}
            </button>
            <button 
              className="btn-secondary" 
              style={{ fontSize: '12px', borderColor: circuitData.components.find(c => c.id === 'r2')?.fault === 'short' ? '#f59e0b' : '#e2e8f0', background: circuitData.components.find(c => c.id === 'r2')?.fault === 'short' ? '#fffbeb' : 'white' }} 
              onClick={() => toggleFault('r2', 'short')}
            >
              {circuitData.components.find(c => c.id === 'r2')?.fault === 'short' ? '🔄 Normal R2' : '🔗 Korslet R2 (Short)'}
            </button>
          </div>
          <button className="btn-primary" style={{ padding: '0.5rem 1.5rem', background: '#059669' }}>
            ✓ Engine Synced
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto space-y-8">
        <section className="hero-content text-center" style={{ marginBottom: '1.5rem' }}>
          <div className="badge">Circuit Analysis Platform</div>
          <h1 className="hero-title" style={{ fontSize: '2.5rem' }}>Interactive <span className="text-[#00e5ff] glow-text">MNA Solver</span></h1>
        </section>

        {/* Workspace Canvas */}
        <section className="glass-card" style={{ padding: '1rem' }}>
          <CircuitCanvas circuitData={circuitData} simResult={simResult} />
        </section>

        <section className="features-grid">
          <div className="glass-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🧮</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Modified Nodal Analysis</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Penyelesaian matriks simultan untuk mendapatkan nilai tegangan di setiap node.</p>
          </div>
          <div className="glass-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🛡️</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Stability System</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Injeksi RSHUNT fiktif (1T Ohm) untuk mencegah crash pada sirkuit mengambang.</p>
          </div>
          <div className="glass-card">
            <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>🔥</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Fault Injection</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Simulasi kawat putus (1G Ohm) dan hubung singkat (1m Ohm) secara instan.</p>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2026 Schematic AI Project - Powered by SpiceEngine Core.</p>
      </footer>
    </div>
  )
}

export default App
