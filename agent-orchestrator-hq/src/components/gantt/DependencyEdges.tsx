'use client';

import React from 'react';
import { BarCoords } from './types';
import { generateSCurvePath } from './utils';

interface DependencyEdgesProps {
  edges: { from: BarCoords; to: BarCoords; blocker: string; target: string }[];
  viewport: { left: number; right: number };
}

export const DependencyEdges = ({ edges, viewport }: DependencyEdgesProps) => {
  // 1. Correct Span-Based Virtualization
  // We only render lines that are at least partially visible in the viewport.
  const visibleEdges = edges.filter(edge => {
    const buffer = 1000;
    const lineMinX = edge.from.x;
    const lineMaxX = edge.to.x + edge.to.w;
    
    return lineMinX <= viewport.right + buffer && lineMaxX >= viewport.left - buffer;
  });

  const svgWidth = Math.max(viewport.right - viewport.left, 100);

  return (
    <svg 
      className="absolute top-0 pointer-events-none z-0 overflow-visible"
      style={{ 
        left: `${viewport.left}px`, 
        width: `${svgWidth}px`,
        height: '100%' 
      }}
    >
      {visibleEdges.map(edge => {
        // Adjust coordinates relative to the "windowed" SVG starting point
        const x1 = edge.from.x + edge.from.w - viewport.left;
        const y1 = edge.from.y;
        const x2 = edge.to.x - viewport.left;
        const y2 = edge.to.y;

        return (
          <g key={`edge-${edge.blocker}-${edge.target}`}>
            <path 
              d={generateSCurvePath(x1, y1, x2, y2)} 
              fill="none" 
              stroke="#3b82f6" 
              strokeWidth="2" 
              strokeLinecap="round"
              className="transition-all opacity-40 group-hover/gantt:opacity-100 group-hover/gantt:stroke-blue-500"
            />
            <circle cx={x2} cy={y2} r="3" fill="#3b82f6" />
          </g>
        );
      })}
    </svg>
  );
};
