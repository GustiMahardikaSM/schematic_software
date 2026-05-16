import React, { useMemo } from 'react';
import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import { interpolateRgb } from 'd3-interpolate';

/**
 * Custom Circuit Edge with SVG SMIL Animation
 * Light Mode Version: Better contrast for electron flow on white background.
 */
export default function CircuitEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,
  });

  const current = data?.current || 0;
  const voltage = data?.voltage || 0;
  
  const isFlowing = current > 0.0001;
  const animationDuration = isFlowing ? Math.max(0.1, 2 / (current * 100)) : 0;

  // Light Mode Color Scale
  const colorScale = useMemo(() => {
    const interpolator = interpolateRgb('#94a3b8', '#2563eb'); // Slate to Blue
    const dangerInterpolator = interpolateRgb('#2563eb', '#ef4444'); // Blue to Red
    
    if (voltage <= 12) return interpolator(voltage / 12);
    return dangerInterpolator(Math.min(1, (voltage - 12) / 12));
  }, [voltage]);

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeWidth: 3,
          stroke: isFlowing ? colorScale : '#cbd5e1',
          transition: 'stroke 0.3s ease',
          filter: isFlowing ? `drop-shadow(0 0 4px ${colorScale}33)` : 'none'
        }} 
      />

      {isFlowing && (
        <circle r="3.5" fill={colorScale} filter="url(#glow-light)">
          <animateMotion
            dur={`${animationDuration}s`}
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}

      <defs>
        <filter id="glow-light" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    </>
  );
}
