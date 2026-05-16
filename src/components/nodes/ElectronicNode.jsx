import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

/**
 * Custom Node for Electronic Components
 * Light Mode Version: High contrast, clean outlines, and professional color coding.
 */
const ElectronicNode = ({ data }) => {
  const { type, value, unit, label, fault, simResult } = data;
  
  const wattage = simResult?.wattage || 0;
  const isOverheated = wattage > 0.1;
  const isDanger = wattage > 0.5;
  
  const nodeColor = isDanger ? '#dc2626' : (isOverheated ? '#ea580c' : (fault !== 'normal' ? '#d97706' : '#2563eb'));

  const renderSymbol = () => {
    switch (type) {
      case 'source':
        return (
          <svg width="45" height="45" viewBox="0 0 40 40">
            <circle cx="20" cy="20" r="18" fill="none" stroke={nodeColor} strokeWidth="2.5" />
            <path d="M 20 12 L 20 28 M 12 20 L 28 20" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      case 'resistor':
        return (
          <svg width="60" height="25" viewBox="0 0 60 20">
            <polyline
              points="0,10 10,10 15,2 25,18 35,2 45,18 50,10 60,10"
              fill="none"
              stroke={nodeColor}
              strokeWidth="2.5"
            />
          </svg>
        );
      case 'ground':
        return (
          <svg width="40" height="35" viewBox="0 0 40 30">
            <line x1="20" y1="0" x2="20" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="5" y1="15" x2="35" y2="15" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="10" y1="20" x2="30" y2="20" stroke={nodeColor} strokeWidth="2.5" />
            <line x1="15" y1="25" x2="25" y2="25" stroke={nodeColor} strokeWidth="2.5" />
          </svg>
        );
      default:
        return <div className="p-2 border border-blue-500 rounded text-xs">{type}</div>;
    }
  };

  return (
    <div className={`electronic-node ${isDanger ? 'critical-glow' : ''}`} style={{
      padding: '12px 18px',
      background: '#ffffff',
      borderRadius: '16px',
      border: `2px solid ${isOverheated ? nodeColor : '#e2e8f0'}`,
      boxShadow: isOverheated ? `0 0 20px ${nodeColor}22` : '0 2px 4px rgba(0,0,0,0.05)',
      textAlign: 'center',
      minWidth: '110px',
      position: 'relative',
      transition: 'all 0.3s ease'
    }}>
      {isOverheated && (
        <div className="smoke-container">
          <div className="smoke-particle p1"></div>
          <div className="smoke-particle p2"></div>
          <div className="smoke-particle p3"></div>
        </div>
      )}

      <Handle type="target" position={Position.Left} style={{ background: nodeColor, width: '8px', height: '8px', border: '2px solid #fff' }} />
      
      <div className="symbol-container" style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}>
        {renderSymbol()}
      </div>
      
      <div className="info" style={{ pointerEvents: 'none' }}>
        <div style={{ fontSize: '9px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {label}
        </div>
        <div style={{ fontSize: '15px', color: nodeColor, fontFamily: 'monospace', fontWeight: 'bold' }}>
          {value}{unit}
        </div>
        {simResult && (
          <div style={{ 
            fontSize: '10px', 
            color: isOverheated ? nodeColor : '#475569', 
            marginTop: '4px',
            background: '#f8fafc',
            padding: '2px 4px',
            borderRadius: '4px'
          }}>
            {simResult.voltage.toFixed(2)}V | {simResult.current.toFixed(4)}A
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} style={{ background: nodeColor, width: '8px', height: '8px', border: '2px solid #fff' }} />
      
      {isDanger && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ef4444',
          color: 'white',
          fontSize: '8px',
          padding: '2px 8px',
          borderRadius: '4px',
          fontWeight: '900',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 6px rgba(239, 68, 68, 0.2)'
        }}>
          OVERHEAT
        </div>
      )}
    </div>
  );
};

export default memo(ElectronicNode);
