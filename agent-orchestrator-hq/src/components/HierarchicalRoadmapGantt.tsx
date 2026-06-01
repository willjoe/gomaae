'use client';

import React, { useRef, useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale, Ticket } from './gantt/types';
import { getPixelPos, getPixelWidth } from './gantt/utils';
import { useGanttEngine } from './gantt/useGanttEngine';
import { GanttBar, GanttLabelRow } from './gantt/GanttComponents';
import { DependencyEdges } from './gantt/DependencyEdges';

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
  disableExpansion?: boolean;
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
  isTestingPhase = false,
  disableExpansion = false
}: HierarchicalRoadmapGanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tickets: globalTickets } = useLifecycle();
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [expandedParents, setExpandedParents] = useState<string[]>(parents.map(p => p.id));

  // Auto-expand all if expansion is disabled
  useEffect(() => {
    if (disableExpansion) {
      setExpandedParents(parents.map(p => p.id));
    }
  }, [disableExpansion, parents]);

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
  const { totalCanvasHeight, verifiedEdges, flatNodeList } = useGanttEngine({
    parents,
    children,
    expandedParents,
    timelineRange,
    dayWidth,
    globalTickets,
    isTestingPhase
  });

  const toggleExpand = (id: string) => {
    if (disableExpansion) return;
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
          {isTestingPhase ? 'Verification Blueprint / Continuous Quality Waterfall' : `Execution Layer / ${parentLabel} → ${childLabel}`}
        </h2>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative group/gantt">
        {/* Sticky Header */}
        <div className="flex h-[40px] border-b border-border bg-muted/50 sticky top-0 z-50">
           <div className="w-80 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur-sm z-50">
             Node Identity Registry
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
             {flatNodeList.map(({ ticket, depth, linkedQA }) => {
                const isTktParent = ticket.tier === 'Epic' || ticket.tier === 'Story';
                return (
                  <GanttLabelRow 
                    key={`label-${ticket.id}`}
                    ticket={ticket} 
                    depth={depth} 
                    isParent={isTktParent}
                    isExpanded={expandedParents.includes(ticket.id)}
                    onToggle={() => toggleExpand(ticket.id)}
                    onSelect={() => onSelectTicket(ticket)}
                    onAddChild={onAddChild ? () => onAddChild(ticket) : undefined}
                    isTestingPhase={isTestingPhase}
                    disableExpansion={disableExpansion}
                  />
                );
             })}
          </div>

          {/* Execution Canvas (Bars & SVG) */}
          <div className="flex-1 relative" style={{ minWidth: '3000px', height: `${totalCanvasHeight}px` }}>
             {/* Today Line */}
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/10 z-10 pointer-events-none"
             />

             {/* SVG Edge Layer (Isolated Component) */}
             <DependencyEdges edges={verifiedEdges} />

             {/* Bar Layer */}
             <div className="relative">
                {flatNodeList.map(({ ticket, depth, linkedQA }) => {
                   const isTktParent = ticket.tier === 'Epic' || ticket.tier === 'Story';
                   return (
                      <div key={`bar-row-${ticket.id}`} className={cn("flex items-center px-4 relative border-b border-border/20", isTktParent ? "h-14" : "h-10")}>
                        {/* 1. Structural Artifact (Greyed out in testing) */}
                        <GanttBar 
                          ticket={ticket}
                          x={getPixelPos(ticket.start_date, timelineRange, dayWidth)}
                          w={getPixelWidth(ticket.start_date, ticket.due_date, timelineRange, dayWidth)}
                          isParent={isTktParent}
                          readOnlyParent={readOnlyParent}
                          onClick={() => onSelectTicket(ticket)}
                          isTestingPhase={isTestingPhase}
                        />

                        {/* 2. Linked Test Asset (Pink & Active in testing) */}
                        {linkedQA && (
                           <GanttBar 
                              ticket={linkedQA}
                              x={getPixelPos(linkedQA.start_date, timelineRange, dayWidth)}
                              w={getPixelWidth(linkedQA.start_date, linkedQA.due_date, timelineRange, dayWidth)}
                              isParent={false}
                              readOnlyParent={false}
                              onClick={() => onSelectTicket(linkedQA)}
                              isTestingPhase={false} 
                           />
                        )}
                      </div>
                   );
                })}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
