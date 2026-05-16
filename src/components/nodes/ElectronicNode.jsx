import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * Custom Node for Electronic Components
 * Light Mode Version: High contrast, clean outlines, and professional color coding.
 */
const ElectronicNode = ({ data }) => {
  const { type, value, unit, label, fault, simResult, pins, rotation, isSuspect } = data;
  
  const wattage = simResult?.wattage || 0;
  const isOverheated = wattage > 0.1;
  const isDanger = wattage > 0.5;
  
  const nodeColor = isDanger ? '#dc2626' : (isOverheated ? '#ea580c' : (fault !== 'normal' ? '#d97706' : '#2563eb'));

  const renderSymbol = () => {
    switch (type) {
      case 'source':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="none" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="20" y1="10" x2="20" y2="30" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="10" y1="20" x2="30" y2="20" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'resistor':
        return (
          <svg width="60" height="20" viewBox="0 0 60 20">
            <polyline points="0,10 10,10 15,2 25,18 35,2 45,18 50,10 60,10" fill="none" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'capacitor':
        return (
          <svg width="40" height="30" viewBox="0 0 40 30">
            <line x1="0" y1="15" x2="16" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="16" y1="5" x2="16" y2="25" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="24" y1="5" x2="24" y2="25" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="24" y1="15" x2="40" y2="15" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'inductor':
        return (
          <svg width="60" height="20" viewBox="0 0 60 20">
            <polyline points="0,10 5,2 10,10 15,2 20,10 25,2 30,10 35,2 40,10 45,2 50,10 60,10" fill="none" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'diode':
        return (
          <svg width="50" height="30" viewBox="0 0 50 30">
            <line x1="0" y1="15" x2="15" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <polygon points="15,5 15,25 35,15" fill={nodeColor} />
            <line x1="35" y1="5" x2="35" y2="25" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="35" y1="15" x2="50" y2="15" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'zener':
        return (
          <svg width="50" height="30" viewBox="0 0 50 30">
            <line x1="0" y1="15" x2="15" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <polygon points="15,5 15,25 35,15" fill="none" stroke={nodeColor} strokeWidth="2.5" />
            <polyline points="30,5 35,5 35,25 40,25" fill="none" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="35" y1="15" x2="50" y2="15" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'mosfet':
        return (
          <svg width="40" height="40" viewBox="0 0 40 40">
            <line x1="10" y1="10" x2="10" y2="30" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="15" y1="10" x2="15" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="15" y1="17.5" x2="15" y2="22.5" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="15" y1="25" x2="15" y2="30" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="0" y1="20" x2="10" y2="20" stroke={nodeColor} strokeWidth="2.5" />
            <polyline points="15,12.5 30,12.5 30,5" fill="none" stroke={nodeColor} strokeWidth="2.5" />
            <polyline points="15,27.5 30,27.5 30,35" fill="none" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'ic':
        return (
          <rect x="5" y="5" width="50" height="50" rx="4" fill="none" stroke={nodeColor} strokeWidth="2.5" />
        );
      case 'ground':
        return (
          <svg width="40" height="30" viewBox="0 0 40 30">
            <line x1="20" y1="0" x2="20" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="5" y1="15" x2="35" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="10" y1="20" x2="30" y2="20" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="15" y1="25" x2="25" y2="25" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      default:
        return <div className="text-[10px] font-bold">{type.toUpperCase()}</div>;
    }
  };

  const renderHandles = () => {
    if (!pins || pins.length === 0) {
      return (
        <>
          <Handle type="target" position={Position.Left} id="in" style={{ background: nodeColor, width: '8px', height: '8px', border: '2px solid #fff' }} />
          <Handle type="source" position={Position.Right} id="out" style={{ background: nodeColor, width: '8px', height: '8px', border: '2px solid #fff' }} />
        </>
      );
    }

    const leftPins = pins.filter((_, i) => i < pins.length / 2);
    const rightPins = pins.filter((_, i) => i >= pins.length / 2);

    return (
      <>
        {leftPins.map((pin, i) => (
          <Handle key={pin.id} type="target" position={Position.Left} id={pin.id} style={{ top: `${((i + 1) * 100) / (leftPins.length + 1)}%`, background: nodeColor }} />
        ))}
        {rightPins.map((pin, i) => (
          <Handle key={pin.id} type="source" position={Position.Right} id={pin.id} style={{ top: `${((i + 1) * 100) / (rightPins.length + 1)}%`, background: nodeColor }} />
        ))}
      </>
    );
  };

  return (
    <div className={`electronic-node ${isDanger ? 'critical-glow' : ''} ${isSuspect ? 'suspect-pulse' : ''}`} style={{
      padding: '12px 18px',
      background: isSuspect ? 'rgba(239, 68, 68, 0.05)' : '#ffffff',
      borderRadius: '12px',
      border: `2px solid ${isSuspect ? '#ef4444' : (isOverheated ? nodeColor : '#e2e8f0')}`,
      boxShadow: isOverheated ? `0 0 20px ${nodeColor}22` : '0 2px 4px rgba(0,0,0,0.05)',
      textAlign: 'center',
      minWidth: type === 'ic' ? '120px' : '100px',
      minHeight: type === 'ic' ? '100px' : 'auto',
      position: 'relative',
      transition: 'all 0.3s ease',
      transform: `rotate(${rotation || 0}deg)`
    }}>
      {isOverheated && (
        <div className="smoke-container">
          <div className="smoke-particle p1"></div>
          <div className="smoke-particle p2"></div>
          <div className="smoke-particle p3"></div>
        </div>
      )}

      {renderHandles()}
      
      <div className="symbol-container" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
        {renderSymbol()}
      </div>
      
      <div className="info" style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>
          {label || id}
        </div>
        <div style={{ fontSize: '14px', color: nodeColor, fontFamily: 'monospace', fontWeight: 'bold' }}>
          {value}{unit}
        </div>
        {simResult && (
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '4px', background: '#f1f5f9', padding: '1px 4px', borderRadius: '4px' }}>
            {simResult.voltage.toFixed(2)}V | {simResult.current.toFixed(3)}A
          </div>
        )}
      </div>

      {isDanger && <div className="danger-badge">OVERHEAT</div>}
    </div>
  );
};

export default memo(ElectronicNode);
