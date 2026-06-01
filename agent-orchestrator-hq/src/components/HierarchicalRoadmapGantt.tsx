'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale, Ticket, Viewport } from './gantt/types';
import { getPixelPos, getPixelWidth, generateSCurvePath } from './gantt/utils';
import { useGanttEngine } from './gantt/useGanttEngine';
import { GanttBar, GanttLabelRow } from './gantt/GanttComponents';
import { DependencyEdges } from './gantt/DependencyEdges';
import { Target } from 'lucide-react';

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
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { tickets: globalTickets } = useLifecycle();
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [expandedParents, setExpandedParents] = useState<string[]>(parents.map(p => p.id));
  
  // Viewport state tracking raw scroll values
  const [scrollState, setScrollState] = useState({ left: 0, width: 2000 });
  const [isScrolling, setIsScrolling] = useState(false);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
        setScrollState({
            left: scrollRef.current.scrollLeft,
            width: scrollRef.current.clientWidth
        });
        
        setIsScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 150);
    }
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
        el.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial measure
        return () => el.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  useEffect(() => {
    window.addEventListener('resize', handleScroll);
    return () => window.removeEventListener('resize', handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    if (disableExpansion) {
      setExpandedParents(parents.map(p => p.id));
    }
  }, [disableExpansion, parents]);

  // 1. Initialize Range with data-aware boundaries and padding
  useEffect(() => {
    const today = new Date();
    const allStartDates = globalTickets.map(t => new Date(t.start_date).getTime()).filter(d => !isNaN(d));
    const allDueDates = globalTickets.map(t => new Date(t.due_date).getTime()).filter(d => !isNaN(d));
    
    const projectStart = allStartDates.length > 0 ? new Date(Math.min(...allStartDates)) : new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const projectEnd = allDueDates.length > 0 ? new Date(Math.max(...allDueDates)) : new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    const dayMs = 24 * 60 * 60 * 1000;
    let start, end;

    if (scale === 'days') {
      start = new Date(projectStart.getTime() - 40 * dayMs);
      end = new Date(projectEnd.getTime() + 40 * dayMs);
    } else if (scale === 'weeks') {
      start = new Date(projectStart.getTime() - (12 * 7) * dayMs);
      end = new Date(projectEnd.getTime() + (12 * 7) * dayMs);
    } else {
      start = new Date(projectStart.getFullYear(), projectStart.getMonth() - 6, 1);
      end = new Date(projectEnd.getFullYear(), projectEnd.getMonth() + 6, 0);
    }
    setTimelineRange({ start, end });
  }, [scale, globalTickets]);

  const dayWidth = scale === 'days' ? 50 : scale === 'weeks' ? 15 : 4;

  // 2. Initialize Engine
  const { totalCanvasHeight, totalCanvasWidth, verifiedEdges, flatNodeList } = useGanttEngine({
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

  // Correct Today centering (accounting for label width)
  const handleGoToToday = () => {
    if (scrollRef.current && timelineRange) {
        const centerOffset = scrollRef.current.clientWidth / 2;
        scrollRef.current.scrollLeft = Math.max(0, todayPos + 320 - centerOffset);
    }
  };

  useEffect(() => {
      if (timelineRange && scrollRef.current) {
          handleGoToToday();
      }
  }, [timelineRange]);

  // Viewport for virtualization logic (relative to canvas start)
  const canvasViewport = useMemo(() => {
      const leftOnCanvas = Math.max(0, scrollState.left - 320);
      const rightOnCanvas = scrollState.left + scrollState.width - 320;
      return { left: leftOnCanvas, right: rightOnCanvas };
  }, [scrollState]);

  if (!timelineRange) return (
     <div className="p-12 text-center text-muted-foreground animate-pulse font-mono text-[10px] uppercase tracking-widest">
        Initializing Verification Canvas...
     </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono text-left">
          {isTestingPhase ? 'Verification Blueprint / Continuous Quality Waterfall' : `Execution Layer / ${parentLabel} → ${childLabel}`}
        </h2>
        
        <button 
           onClick={handleGoToToday}
           className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
        >
           <Target size={12} />
           Today
        </button>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative group/gantt h-[640px]">
        {/* Sticky Header */}
        <div className="flex h-[40px] border-b border-border bg-muted/50 sticky top-0 z-[60] overflow-hidden">
           <div className="w-80 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur-sm z-[70]">
             Node Identity Registry
           </div>
           <div className="flex-1 relative overflow-hidden">
              <div 
                style={{ left: `${todayPos - canvasViewport.left}px` }}
                className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10"
              />
           </div>
        </div>

        <div className="relative flex-1 overflow-auto custom-scrollbar flex" ref={scrollRef}>
          {/* Node Registry Labels (Sticky) */}
          <div 
             className="w-80 shrink-0 border-r border-border bg-card z-50 sticky left-0 shadow-[4px_0_12px_rgba(0,0,0,0.05)] transition-colors duration-300"
             style={{ height: `${totalCanvasHeight}px`, minHeight: '100%' }}
          >
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

          {/* Visualization Engine (Bars & Edges) */}
          <div className="flex-1 relative" style={{ minWidth: `${totalCanvasWidth}px`, height: `${totalCanvasHeight}px` }}>
             {/* Dynamic Today Line */}
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/10 z-10 pointer-events-none"
             />

             {/* Dependency Layer (Virtualization based on canvasViewport) */}
             <div className={cn("transition-opacity duration-100", isScrolling ? "opacity-0" : "opacity-100")}>
                <DependencyEdges edges={verifiedEdges} viewport={canvasViewport} />
             </div>

             {/* Functional Row Layer (Virtualization based on canvasViewport) */}
             <div className="relative">
                {flatNodeList.map(({ ticket, depth, linkedQA }) => {
                   const isTktParent = ticket.tier === 'Epic' || ticket.tier === 'Story';
                   const x = getPixelPos(ticket.start_date, timelineRange, dayWidth);
                   const w = getPixelWidth(ticket.start_date, ticket.due_date, timelineRange, dayWidth);
                   
                   // Virtualization check with generous buffer
                   const buffer = 1500; 
                   const isBarVisible = (x + w >= canvasViewport.left - buffer && x <= canvasViewport.right + buffer);
                   
                   let isQAVisible = false;
                   let qx = 0, qw = 0;
                   if (linkedQA) {
                       qx = getPixelPos(linkedQA.start_date, timelineRange, dayWidth);
                       qw = getPixelWidth(linkedQA.start_date, linkedQA.due_date, timelineRange, dayWidth);
                       isQAVisible = (qx + qw >= canvasViewport.left - buffer && qx <= canvasViewport.right + buffer);
                   }

                   return (
                      <div key={`bar-row-${ticket.id}`} className={cn("flex items-center px-4 relative border-b border-border/20", isTktParent ? "h-14" : "h-10")}>
                        {isBarVisible && (
                            <GanttBar 
                              ticket={ticket}
                              x={x}
                              w={w}
                              isParent={isTktParent}
                              readOnlyParent={readOnlyParent}
                              onClick={() => onSelectTicket(ticket)}
                              isTestingPhase={isTestingPhase}
                            />
                        )}

                        {linkedQA && isQAVisible && (
                           <GanttBar 
                              ticket={linkedQA}
                              x={qx}
                              w={qw}
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
