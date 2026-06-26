'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale, Ticket } from './gantt/types';
import { getPixelPos, getPixelWidth, generateSCurvePath } from './gantt/utils';
import { useGanttEngine } from './gantt/useGanttEngine';
import { GanttBar, GanttLabelRow } from './gantt/GanttComponents';
import { DependencyEdges } from './gantt/DependencyEdges';
import { GanttHeader, GanttBackgroundGrid } from './gantt/GanttHeader';
import { lifecycleTheme } from '@/lib/theme';
import { Clock, Calendar as CalendarIcon, CalendarDays, Layers, Target } from 'lucide-react';


interface RoadmapGanttProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  scale?: GanttScale;
  onScaleChange?: (scale: GanttScale) => void;
  temporalBoundaries?: { start: Date | null; end: Date | null };
  phaseId?: string;
}

export default function RoadmapGantt({ 
  tickets, 
  onSelectTicket, 
  scale = 'weeks',
  onScaleChange,
  temporalBoundaries,
  phaseId = 'release'
}: RoadmapGanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { tickets: globalTickets, phaseStates } = useLifecycle();
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(2000);

  // Automatic Tick logic matching Hierarchical mode
  const internalTickScale: GanttScale = useMemo(() => {
    if (scale === 'hours') return 'hours';
    if (scale === 'months') return 'weeks';
    return 'days';
  }, [scale]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const left = e.currentTarget.scrollLeft;
    const width = e.currentTarget.clientWidth;
    setScrollLeft(left);
    setViewportWidth(width);
  };

  const dayWidth = scale === 'hours' ? 500 : scale === 'days' ? 50 : scale === 'weeks' ? 15 : 4;

  // 1. DYNAMIC TIMELINE RANGE CALCULATION
  // The range is exactly 7 days before the earliest ticket start and 7 days
  // after the latest ticket due date — no extra viewport-width buffer.
  useEffect(() => {
    const PADDING_MS = 7 * 24 * 60 * 60 * 1000;

    const today = new Date();
    const fallbackStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const fallbackEnd = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const bStart = temporalBoundaries?.start || fallbackStart;
    const bEnd = temporalBoundaries?.end || fallbackEnd;

    setTimelineRange({
      start: new Date(bStart.getTime() - PADDING_MS),
      end:   new Date(bEnd.getTime()   + PADDING_MS),
    });
  }, [temporalBoundaries, dayWidth, scale]);


  // Use the high-integrity engine in "Flat Mode"
  const { totalCanvasHeight, totalCanvasWidth, verifiedEdges, renderedCoords } = useGanttEngine({
    parents: tickets, 
    childTickets: [],
    expandedParents: [],
    timelineRange,
    dayWidth,
    globalTickets
  });

  const theme = lifecycleTheme[phaseId] || lifecycleTheme.release;
  const todayPos = timelineRange ? getPixelPos(new Date(), timelineRange, dayWidth) : 0;

  // ── Focus ticket: closest due_date >= today (all rows are 40px flat) ───────
  const focusTicketY = useMemo(() => {
    if (!tickets.length) return 0;
    const todayMs = Date.now();

    let targetIdx = -1;
    let best = Infinity;
    tickets.forEach((t, i) => {
      if (!t?.due_datetime) return;
      const diff = new Date(t.due_datetime).getTime() - todayMs;
      if (diff >= 0 && diff < best) { targetIdx = i; best = diff; }
    });
    if (targetIdx === -1) {
      best = Infinity;
      tickets.forEach((t, i) => {
        if (!t?.due_datetime) return;
        const diff = Math.abs(new Date(t.due_datetime).getTime() - todayMs);
        if (diff < best) { targetIdx = i; best = diff; }
      });
    }
    return targetIdx >= 0 ? targetIdx * 40 : 0;
  }, [tickets]);

  // ── Unified scroll: horizontal → today, vertical → focus ticket ───────────
  const scrollToTodayAndFocus = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !timelineRange) return;
    const todayX = getPixelPos(new Date(), timelineRange, dayWidth);
    el.scrollLeft = Math.max(0, todayX - 200);
    setScrollLeft(el.scrollLeft);
    el.scrollTop = Math.max(0, focusTicketY - 80);
  }, [timelineRange, dayWidth, focusTicketY]);

  const initialScrollDone = useRef(false);
  useEffect(() => { initialScrollDone.current = false; }, [scale, phaseId]);
  useEffect(() => {
    if (initialScrollDone.current || !timelineRange || !tickets.length) return;
    scrollToTodayAndFocus();
    initialScrollDone.current = true;
  }, [timelineRange, scrollToTodayAndFocus, tickets.length]);

  const scrollToTicket = useCallback((ticket: Ticket) => {
    if (scrollRef.current && timelineRange) {
        const ticketX = getPixelPos(new Date(ticket.start_datetime), timelineRange, dayWidth);
        const boxWidth = scrollRef.current.clientWidth;
        const visibleWidth = boxWidth - 320; 
        scrollRef.current.scrollLeft = Math.max(0, ticketX - (visibleWidth / 2));
        setScrollLeft(scrollRef.current.scrollLeft);
    }
  }, [timelineRange, dayWidth]);

  // AUTO-SCROLL ON EXTERNAL SELECTION
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

  const handleGoToToday = () => scrollToTodayAndFocus();

  if (!timelineRange) return null;

  const viewOptions = [
    { id: 'hours', label: 'Hourly', icon: <Clock size={10} /> },
    { id: 'days', label: 'Daily', icon: <CalendarDays size={10} /> },
    { id: 'weeks', label: 'Weekly', icon: <CalendarIcon size={10} /> },
    { id: 'months', label: 'Monthly', icon: <Layers size={10} /> }
  ];

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300 text-left flex flex-col">
      <div className="flex items-center justify-between px-2 shrink-0">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono text-left">
          Distribution & Operations Canvas
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

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative group/gantt w-full aspect-video min-h-[300px]">
        {/* Sticky Header */}
        <div className="flex h-[60px] border-b border-border bg-muted/50 sticky top-0 z-30 overflow-hidden shrink-0">
           <div className="w-80 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur-sm z-40">
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

        <div className="relative flex-1 overflow-auto custom-scrollbar flex" ref={scrollRef} onScroll={handleScroll}>
          {/* Node Registry (Sticky Labels) */}
          <div className="w-80 shrink-0 border-r border-border bg-card/95 backdrop-blur-sm z-20 sticky left-0 transition-colors duration-300">
             {tickets.map(t => (
               <GanttLabelRow 
                  key={t.id}
                  ticket={t}
                  depth={0}
                  isParent={false}
                  onSelect={() => handleSelectTicketWithScroll(t)}
               />
             ))}
             {tickets.length === 0 && <div className="p-12 text-center text-muted-foreground italic text-xs">No active triage signals</div>}
          </div>

          {/* Execution Canvas */}
          <div className="flex-1 relative" style={{ minWidth: `${totalCanvasWidth}px`, height: `${totalCanvasHeight}px` }}>
             <GanttBackgroundGrid 
                timelineRange={timelineRange}
                dayWidth={dayWidth}
                tickMode={internalTickScale}
                totalHeight={totalCanvasHeight}
             />
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/10 z-10 pointer-events-none"
             />

             {/* SVG Edge Layer */}
             <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                {verifiedEdges.map((edge, idx) => (
                  <g key={`edge-${edge.blocker}-${edge.target}-${idx}`}>
                     <path 
                       d={generateSCurvePath(edge.from.x + edge.from.w, edge.from.y, edge.to.x, edge.to.y)} 
                       fill="none" 
                       stroke={theme.color} 
                       strokeWidth="2" 
                       strokeLinecap="round"
                       className="transition-all opacity-40 group-hover/gantt:opacity-100"
                     />
                     <circle cx={edge.to.x} cy={edge.to.y} r="3" fill={theme.color} />
                  </g>
                ))}
             </svg>

             {/* Bar Layer */}
             <div className="relative">
                {tickets.map(t => (
                  <div key={`bar-row-${t.id}`} className="h-10 flex items-center px-4 relative border-b border-border/20">
                     <GanttBar 
                        ticket={t}
                        x={getPixelPos(t.start_datetime, timelineRange, dayWidth)}
                        w={getPixelWidth(t.start_datetime, t.due_datetime, timelineRange, dayWidth)}
                        isParent={false}
                        readOnlyParent={false}
                        onClick={() => handleSelectTicketWithScroll(t)}
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
