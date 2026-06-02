'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale, Ticket } from './gantt/types';
import { getPixelPos, getPixelWidth, generateSCurvePath } from './gantt/utils';
import { GanttBar, GanttLabelRow } from './gantt/GanttComponents';
import { useGanttEngine } from './gantt/useGanttEngine';
import { GanttHeader, GanttBackgroundGrid } from './gantt/GanttHeader';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface RoadmapGanttProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  scale?: GanttScale;
}

export default function RoadmapGantt({ tickets, onSelectTicket, scale = 'weeks' }: RoadmapGanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tickets: globalTickets } = useLifecycle();
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollLeft(e.currentTarget.scrollLeft);
  };

  useEffect(() => {
    const today = new Date();
    let start, end;
    if (scale === 'days') {
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else if (scale === 'weeks') {
      start = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 42 * 24 * 60 * 60 * 1000);
    } else {
      start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 7, 0);
    }
    setTimelineRange({ start, end });
  }, [scale]);

  const dayWidth = scale === 'days' ? 50 : scale === 'weeks' ? 15 : 4;

  // Use the high-integrity engine in "Flat Mode"
  const { totalCanvasHeight, totalCanvasWidth, verifiedEdges, renderedCoords } = useGanttEngine({
    parents: tickets, // In flat mode, every ticket is treated as a top-level row
    children: [],
    expandedParents: [],
    timelineRange,
    dayWidth,
    globalTickets
  });

  const todayPos = timelineRange ? getPixelPos(new Date().toISOString().split('T')[0], timelineRange, dayWidth) : 0;

  if (!timelineRange) return null;

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300">
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative group/gantt">
        {/* Sticky Header */}
        <div className="flex h-[60px] border-b border-border bg-muted/50 sticky top-0 z-[60] overflow-hidden shrink-0">
           <div className="w-80 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur-sm z-[70]">
             Artifact Identity Registry
           </div>
           <div className="flex-1 relative overflow-hidden bg-muted/10">
              <div 
                className="absolute inset-0 transition-transform duration-75 ease-out"
                style={{ transform: `translateX(-${scrollLeft}px)`, width: `${totalCanvasWidth}px` }}
              >
                <GanttHeader 
                   timelineRange={timelineRange}
                   dayWidth={dayWidth}
                   scale={scale}
                />
              </div>
           </div>
        </div>

        <div className="relative max-h-[500px] overflow-auto custom-scrollbar flex" ref={scrollRef} onScroll={handleScroll}>
          {/* Node Registry (Sticky Labels) */}
          <div className="w-80 shrink-0 border-r border-border bg-card/95 backdrop-blur-sm z-40 sticky left-0 transition-colors duration-300">
             {tickets.map(t => (
               <GanttLabelRow 
                  key={t.id}
                  ticket={t}
                  depth={0}
                  isParent={false}
                  onSelect={() => onSelectTicket(t)}
               />
             ))}
             {tickets.length === 0 && <div className="p-12 text-center text-muted-foreground italic text-xs">No active triage signals</div>}
          </div>

          {/* Execution Canvas */}
          <div className="flex-1 relative" style={{ minWidth: `${totalCanvasWidth}px`, height: `${totalCanvasHeight}px` }}>
             <GanttBackgroundGrid 
                timelineRange={timelineRange}
                dayWidth={dayWidth}
                tickMode={scale === 'days' ? 'days' : 'weeks'}
                totalHeight={totalCanvasHeight}
             />
             {/* Today Line */}
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/10 z-10 pointer-events-none"
             />

             {/* SVG Edge Layer */}
             <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                {verifiedEdges.map(edge => (
                  <g key={`edge-${edge.blocker}-${edge.target}`}>
                     <path 
                       d={generateSCurvePath(edge.from.x + edge.from.w, edge.from.y, edge.to.x, edge.to.y)} 
                       fill="none" 
                       stroke="#3b82f6" 
                       strokeWidth="2" 
                       strokeLinecap="round"
                       className="transition-all opacity-40 group-hover/gantt:opacity-100"
                     />
                     <circle cx={edge.to.x} cy={edge.to.y} r="3" fill="#3b82f6" />
                  </g>
                ))}
             </svg>

             {/* Bar Layer */}
             <div className="relative">
                {tickets.map(t => (
                  <div key={`bar-row-${t.id}`} className="h-10 flex items-center px-4 relative border-b border-border/20">
                     <GanttBar 
                        ticket={t}
                        x={getPixelPos(t.start_date, timelineRange, dayWidth)}
                        w={getPixelWidth(t.start_date, t.due_date, timelineRange, dayWidth)}
                        isParent={false}
                        readOnlyParent={false}
                        onClick={() => onSelectTicket(t)}
                     />
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
