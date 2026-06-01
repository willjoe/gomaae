'use client';

import React, { useRef, useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale, Ticket } from './gantt/types';
import { getPixelPos, getPixelWidth, generateSCurvePath } from './gantt/utils';
import { useGanttEngine } from './gantt/useGanttEngine';
import { GanttBar, GanttLabelRow } from './gantt/GanttComponents';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HierarchicalRoadmapGanttProps {
  parents: Ticket[];
  children: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onAddChild?: (parent: Ticket) => void;
  scale?: GanttScale;
  parentLabel?: string;
  childLabel?: string;
  readOnlyParent?: boolean;
  isTestingPhase?: boolean;
}

export default function HierarchicalRoadmapGantt({ 
  parents, 
  children, 
  onSelectTicket, 
  onAddChild,
  scale = 'weeks',
  parentLabel = 'Parent',
  childLabel = 'Child',
  readOnlyParent = true,
  isTestingPhase = false
}: HierarchicalRoadmapGanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tickets: globalTickets } = useLifecycle();
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [expandedParents, setExpandedParents] = useState<string[]>(parents.map(p => p.id));

  // 1. Initialize Range
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

  // 2. Initialize Engine
  const { totalCanvasHeight, verifiedEdges, renderedCoords } = useGanttEngine({
    parents,
    children,
    expandedParents,
    timelineRange,
    dayWidth,
    globalTickets
  });

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const todayPos = timelineRange ? getPixelPos(new Date().toISOString().split('T')[0], timelineRange, dayWidth) : 0;

  if (!timelineRange) return (
     <div className="p-12 text-center text-muted-foreground animate-pulse font-mono text-[10px] uppercase tracking-widest">
        Initializing High-Integrity Architecture...
     </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono text-left">
          {isTestingPhase ? 'Quality Assurance Waterfall / Multi-Tier Verification' : `Execution Layer / ${parentLabel} → ${childLabel}`}
        </h2>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative group/gantt">
        {/* Sticky Header */}
        <div className="flex h-[40px] border-b border-border bg-muted/50 sticky top-0 z-50">
           <div className="w-80 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur-sm z-50">
             {parentLabel} Identity registry
           </div>
           <div className="flex-1 relative overflow-hidden">
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10"
             />
           </div>
        </div>

        <div className="relative max-h-[600px] overflow-auto custom-scrollbar flex" ref={scrollRef}>
          {/* Node Registry (Sticky Labels) */}
          <div className="w-80 shrink-0 border-r border-border bg-card/95 backdrop-blur-sm z-40 sticky left-0 shadow-[4px_0_12px_rgba(0,0,0,0.05)] transition-colors duration-300">
             {parents.map(p => (
               <React.Fragment key={p.id}>
                  <GanttLabelRow 
                    ticket={p} 
                    depth={0} 
                    isParent={true}
                    isExpanded={expandedParents.includes(p.id)}
                    onToggle={() => toggleExpand(p.id)}
                    onSelect={() => onSelectTicket(p)}
                    onAddChild={onAddChild ? () => onAddChild(p) : undefined}
                    isTestingPhase={isTestingPhase}
                  />
                  {expandedParents.includes(p.id) && children.filter(c => c.parent_id === p.id).map(c => (
                     <GanttLabelRow 
                        key={c.id}
                        ticket={c}
                        depth={1}
                        isParent={false}
                        onSelect={() => onSelectTicket(c)}
                        isTestingPhase={isTestingPhase}
                     />
                  ))}
               </React.Fragment>
             ))}
          </div>

          {/* Execution Canvas (Bars & SVG) */}
          <div className="flex-1 relative" style={{ minWidth: '2500px', height: `${totalCanvasHeight}px` }}>
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
                       stroke={isTestingPhase && edge.target.startsWith('QA') ? "#ec4899" : "#3b82f6"} 
                       strokeWidth="2" 
                       strokeLinecap="round"
                       className={cn("transition-all", isTestingPhase && !edge.target.startsWith('QA') ? "opacity-10" : "opacity-40 group-hover/gantt:opacity-100")}
                     />
                     <circle cx={edge.to.x} cy={edge.to.y} r="3" fill={isTestingPhase && edge.target.startsWith('QA') ? "#ec4899" : "#3b82f6"} />
                  </g>
                ))}
             </svg>

             {/* Bar Layer */}
             <div className="relative">
                {parents.map(p => (
                   <React.Fragment key={`bar-row-${p.id}`}>
                      <div className="h-14 flex items-center px-4 relative border-b border-border/30">
                        <GanttBar 
                          ticket={p}
                          x={getPixelPos(p.start_date, timelineRange, dayWidth)}
                          w={getPixelWidth(p.start_date, p.due_date, timelineRange, dayWidth)}
                          isParent={true}
                          readOnlyParent={readOnlyParent}
                          onClick={() => onSelectTicket(p)}
                          isTestingPhase={isTestingPhase}
                        />
                      </div>
                      {expandedParents.includes(p.id) && children.filter(c => c.parent_id === p.id).map(c => (
                        <div key={`bar-row-${c.id}`} className="h-10 flex items-center px-4 relative border-b border-border/20">
                           <GanttBar 
                              ticket={c}
                              x={getPixelPos(c.start_date, timelineRange, dayWidth)}
                              w={getPixelWidth(c.start_date, c.due_date, timelineRange, dayWidth)}
                              isParent={false}
                              readOnlyParent={false}
                              onClick={() => onSelectTicket(c)}
                              isTestingPhase={isTestingPhase}
                           />
                        </div>
                      ))}
                   </React.Fragment>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
