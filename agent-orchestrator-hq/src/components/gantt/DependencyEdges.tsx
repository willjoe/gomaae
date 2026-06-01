'use client';

import React from 'react';
import { BarCoords } from './types';
import { generateSCurvePath } from './utils';

interface DependencyEdgesProps {
  edges: { from: BarCoords; to: BarCoords; blocker: string; target: string }[];
}

export const DependencyEdges = ({ edges }: DependencyEdgesProps) => {
  return (
    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
      {edges.map(edge => (
        <g key={`edge-${edge.blocker}-${edge.target}`}>
          <path 
            d={generateSCurvePath(edge.from.x + edge.from.w, edge.from.y, edge.to.x, edge.to.y)} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="2" 
            strokeLinecap="round"
            className="transition-all opacity-40 group-hover/gantt:opacity-100 group-hover/gantt:stroke-blue-500"
          />
          <circle cx={edge.to.x} cy={edge.to.y} r="3" fill="#3b82f6" />
        </g>
      ))}
    </svg>
  );
};
