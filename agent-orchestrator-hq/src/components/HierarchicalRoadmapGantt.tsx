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
import { GanttHeader, GanttBackgroundGrid } from './gantt/GanttHeader';
import { Target, CalendarDays, Calendar as CalendarIcon, Clock, Layers } from 'lucide-react';
import { lifecycleTheme } from '@/lib/theme';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface HierarchicalRoadmapGanttProps {
  phaseId: string;
  parents: Ticket[];
  childTickets: Ticket[]; 
  onSelectTicket: (ticket: Ticket) => void;
  onAddChild?: (parent: Ticket) => void;
  scale?: GanttScale;
  onScaleChange?: (scale: GanttScale) => void;
  parentLabel?: string;
  childLabel?: string;
  readOnlyParent?: boolean;
  isTestingPhase?: boolean;
  disableExpansion?: boolean;
  temporalBoundaries?: { start: Date | null; end: Date | null };
}

export default function HierarchicalRoadmapGantt({ 
  phaseId,
  parents, 
  childTickets, 
  onSelectTicket, 
  onAddChild,
  scale = 'weeks',
  onScaleChange,
  parentLabel = 'Parent',
  childLabel = 'Child',
  readOnlyParent = true,
  isTestingPhase = false,
  disableExpansion = false,
  temporalBoundaries
}: HierarchicalRoadmapGanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { tickets: globalTickets, phaseStates } = useLifecycle();
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [expandedParents, setExpandedParents] = useState<string[]>([]);

  // 1. RAW SCROLL STATE
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(2000);
  const [isScrolling, setIsScrolling] = useState(false);

  const scrollKey = `gantt_scroll_${String(phaseId)}_${String(scale)}`;
  const dayWidth = scale === 'days' ? 50 : scale === 'weeks' ? 15 : 4;

  const internalTickScale: GanttScale = useMemo(() => {
    if (scale === 'months') return 'weeks';
    return 'days';
  }, [scale]);

  // Initial expansion
  useEffect(() => {
    if (parents && Array.isArray(parents)) {
      setExpandedParents(parents.map(p => p.id));
    }
  }, [parents]);
  
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    setScrollLeft(left);
    setViewportWidth(width);
    localStorage.setItem(scrollKey, left.toString());
    setIsScrolling(true);
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
    }, 100);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
        const saved = localStorage.getItem(scrollKey);
        if (saved) {
            el.scrollLeft = parseInt(saved, 10);
        }
        setScrollLeft(el.scrollLeft);
        setViewportWidth(el.clientWidth);
    }
  }, [scrollKey, timelineRange, dayWidth]);

  // 3. DYNAMIC TIMELINE RANGE CALCULATION
  useEffect(() => {
    const boxWidth = scrollRef.current?.clientWidth || 1000;
    const centerOffsetMs = (boxWidth / 2) / dayWidth * 24 * 60 * 60 * 1000;

    const today = new Date();
    const fallbackStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fallbackEnd = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const bStart = temporalBoundaries?.start || fallbackStart;
    const bEnd = temporalBoundaries?.end || fallbackEnd;

    const start = new Date(bStart.getTime() - centerOffsetMs - (7 * 24 * 60 * 60 * 1000));
    const end = new Date(bEnd.getTime() + centerOffsetMs + (7 * 24 * 60 * 60 * 1000));

    setTimelineRange({ start, end });
  }, [temporalBoundaries, dayWidth, scale]);

  // 4. AUTO-CENTERING ON MOUNT / SCALE CHANGE
  useEffect(() => {
    const el = scrollRef.current;
    if (el && timelineRange) {
        const saved = localStorage.getItem(scrollKey);
        if (saved) {
            el.scrollLeft = parseInt(saved, 10);
        } else {
            const today = new Date();
            const todayX = getPixelPos(today, timelineRange, dayWidth);
            const boxWidth = el.clientWidth;
            el.scrollLeft = Math.max(0, todayX - (boxWidth / 2));
        }
        setScrollLeft(el.scrollLeft);
        setViewportWidth(el.clientWidth);
    }
  }, [scrollKey, timelineRange, dayWidth]);

  const canvasViewport = useMemo(() => ({
    left: scrollLeft,
    right: scrollLeft + viewportWidth - 320
  }), [scrollLeft, viewportWidth]);

  useEffect(() => {
    if (disableExpansion && parents && Array.isArray(parents)) {
      setExpandedParents(parents.map(p => p.id));
    }
  }, [disableExpansion, parents]);

  const { totalCanvasHeight, totalCanvasWidth, verifiedEdges, flatNodeList } = useGanttEngine({
    parents: parents || [],
    childTickets: childTickets || [],
    expandedParents,
    timelineRange,
    dayWidth,
    globalTickets: globalTickets || [],
    isTestingPhase
  });

  const theme = lifecycleTheme[phaseId] || lifecycleTheme.initiative;

  const toggleExpand = (id: string) => {
    if (disableExpansion) return;
    setExpandedParents(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const scrollToTicket = useCallback((ticket: Ticket) => {
    if (scrollRef.current && timelineRange) {
        const ticketX = getPixelPos(new Date(ticket.start_date), timelineRange, dayWidth);
        const boxWidth = scrollRef.current.clientWidth;
        const visibleWidth = boxWidth - 320; 
        scrollRef.current.scrollLeft = Math.max(0, ticketX - (visibleWidth / 2));
        setScrollLeft(scrollRef.current.scrollLeft);
    }
  }, [timelineRange, dayWidth]);

  // 5. AUTO-SCROLL ON EXTERNAL SELECTION (History/Links)
  useEffect(() => {
    const selectedId = phaseStates[phaseId]?.selectedTicketId;
    if (selectedId) {
        const tkt = globalTickets.find(t => t.id === selectedId);
        if (tkt) scrollToTicket(tkt);
    }
  }, [phaseStates[phaseId]?.selectedTicketId, globalTickets, phaseId, scrollToTicket]);

  const handleSelectTicketWithScroll = (ticket: Ticket) => {
    scrollToTicket(ticket);
    onSelectTicket(ticket);
  };

  const todayPos = timelineRange ? getPixelPos(new Date(), timelineRange, dayWidth) : 0;

  const handleGoToToday = () => {
    if (scrollRef.current && timelineRange) {
        const centerOffset = scrollRef.current.clientWidth / 2;
        scrollRef.current.scrollLeft = Math.max(0, todayPos - centerOffset);
        setScrollLeft(scrollRef.current.scrollLeft);
    }
  };

  if (!timelineRange) return (
     <div className="p-12 text-center text-muted-foreground animate-pulse font-mono text-[10px] uppercase tracking-widest">
        Initializing High-Integrity Canvas...
     </div>
  );

  const viewOptions = [
    { id: 'days', label: 'Daily', icon: <Clock size={10} /> },
    { id: 'weeks', label: 'Weekly', icon: <CalendarIcon size={10} /> },
    { id: 'months', label: 'Monthly', icon: <Layers size={10} /> }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300 flex flex-col">
      <div className="flex items-center justify-between px-2 shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono text-left">
          {isTestingPhase ? 'Verification Blueprint / Continuous Quality Waterfall' : `Execution Layer / ${String(parentLabel)} → ${String(childLabel)}`}
        </h2>
        
        <div className="flex items-center gap-2">
           <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border">
              {viewOptions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onScaleChange?.(v.id as GanttScale)}
                  className={cn(
                    "px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded-md transition-all flex items-center gap-1.5",
                    scale === v.id ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v.icon}
                  {v.label}
                </button>
              ))}
           </div>

           <button 
              onClick={handleGoToToday}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95"
           >
              <Target size={12} />
              Today
           </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative group/gantt w-full aspect-video min-h-[400px]">
        <div className="flex h-[60px] border-b border-border bg-muted/50 sticky top-0 z-30 overflow-hidden shrink-0">
           <div className="w-80 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur-sm z-40">
             Node Identity Registry
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

        <div 
          className="relative flex-1 overflow-auto custom-scrollbar flex" 
          ref={scrollRef}
          onScroll={handleScroll}
        >
          <div 
             className="w-80 shrink-0 border-r border-border bg-card z-20 sticky left-0 shadow-[4px_0_12px_rgba(0,0,0,0.05)] transition-colors duration-300"
             style={{ height: `${totalCanvasHeight}px`, minHeight: '100%' }}
          >
             {(flatNodeList || []).map(({ ticket, depth, linkedQA }) => {
                if (!ticket) return null;
                const isTktParent = ticket.tier === 'Epic' || ticket.tier === 'Story';
                
                // In Testing Phase, if a node has a linked QA ticket, that becomes the primary label
                const labelTicket = (isTestingPhase && linkedQA) ? linkedQA : ticket;

                return (
                  <GanttLabelRow 
                    key={`label-${ticket.id}`}
                    ticket={labelTicket} 
                    depth={depth} 
                    isParent={isTktParent}
                    isExpanded={expandedParents.includes(ticket.id)}
                    onToggle={() => toggleExpand(ticket.id)}
                    onSelect={() => handleSelectTicketWithScroll(labelTicket)}
                    onAddChild={onAddChild ? () => onAddChild(ticket) : undefined}
                    isTestingPhase={isTestingPhase}
                    disableExpansion={disableExpansion}
                  />
                );
             })}
          </div>

          <div className="flex-1 relative" style={{ minWidth: `${totalCanvasWidth}px`, height: `${totalCanvasHeight}px` }}>
             <GanttBackgroundGrid 
                timelineRange={timelineRange}
                dayWidth={dayWidth}
                tickMode={internalTickScale}
                totalHeight={totalCanvasHeight}
             />

             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/30 z-10 pointer-events-none"
             />

             <div className={cn("transition-opacity duration-100", isScrolling ? "opacity-0" : "opacity-100")}>
                <DependencyEdges edges={verifiedEdges} viewport={canvasViewport} themeColor={theme.color} />
             </div>

             <div className="relative">
                {(flatNodeList || []).map(({ ticket, depth, linkedQA }) => {
                   if (!ticket) return null;
                   const isTktParent = ticket.tier === 'Epic' || ticket.tier === 'Story';
                   const x = getPixelPos(ticket.start_date, timelineRange, dayWidth);
                   const w = getPixelWidth(ticket.start_date, ticket.due_date, timelineRange, dayWidth);

                   return (
                      <div key={`bar-row-${ticket.id}`} className={cn("flex items-center relative border-b border-border/20", isTktParent ? "h-14" : "h-10")}>
                        <GanttBar 
                            ticket={ticket}
                            x={x}
                            w={w}
                            isParent={isTktParent}
                            readOnlyParent={readOnlyParent}
                            onClick={() => handleSelectTicketWithScroll(ticket)}
                            isTestingPhase={isTestingPhase}
                        />

                        {linkedQA && (
                           <GanttBar 
                              ticket={linkedQA}
                              x={getPixelPos(linkedQA.start_date, timelineRange, dayWidth)}
                              w={getPixelWidth(linkedQA.start_date, linkedQA.due_date, timelineRange, dayWidth)}
                              isParent={false}
                              readOnlyParent={false}
                              onClick={() => handleSelectTicketWithScroll(linkedQA)}
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
