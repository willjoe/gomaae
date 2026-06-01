'use client';

import React, { useRef, useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type GanttScale = 'months' | 'weeks' | 'days';

interface RoadmapGanttProps {
  tickets: any[];
  onSelectTicket: (ticket: any) => void;
  scale?: GanttScale;
}

export default function RoadmapGantt({ tickets, onSelectTicket, scale = 'months' }: RoadmapGanttProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);

  useEffect(() => {
    const today = new Date();
    let start, end;

    if (scale === 'days') {
      // 7 days past, 14 days ahead
      start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else if (scale === 'weeks') {
      // 3 weeks past, 6 weeks ahead
      start = new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000);
      end = new Date(today.getTime() + 42 * 24 * 60 * 60 * 1000);
    } else {
      // Default: months (3 past, 6 ahead)
      start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
      end = new Date(today.getFullYear(), today.getMonth() + 7, 0);
    }
    
    setTimelineRange({ start, end });
  }, [scale]);

  if (!timelineRange) return null;

  const totalDays = Math.ceil((timelineRange.end.getTime() - timelineRange.start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Set widths based on scale for better visibility
  let dayWidth = 4; // default for months
  if (scale === 'weeks') dayWidth = 15;
  if (scale === 'days') dayWidth = 50;

  const timelineWidth = totalDays * dayWidth;

  const getPos = (dateStr: string) => {
    if (!dateStr) return 0;
    const date = new Date(dateStr);
    const diff = date.getTime() - timelineRange.start.getTime();
    return (diff / (1000 * 60 * 60 * 24)) * dayWidth;
  };

  const getWidth = (startStr: string, endStr: string) => {
    if (!startStr || !endStr) return 100;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = end.getTime() - start.getTime();
    return Math.max((diff / (1000 * 60 * 60 * 24)) * dayWidth, 20);
  };

  const ticks: { name: string; pos: number; width: number }[] = [];
  let curr = new Date(timelineRange.start);

  if (scale === 'days') {
    while (curr <= timelineRange.end) {
      ticks.push({
        name: curr.toLocaleDateString('default', { month: 'short', day: 'numeric' }),
        pos: getPos(curr.toISOString().split('T')[0]),
        width: dayWidth
      });
      curr.setDate(curr.getDate() + 1);
    }
  } else if (scale === 'weeks') {
    // Align to start of week (Sunday)
    curr.setDate(curr.getDate() - curr.getDay());
    while (curr <= timelineRange.end) {
      ticks.push({
        name: `W${Math.ceil(curr.getDate() / 7)} ${curr.toLocaleDateString('default', { month: 'short' })}`,
        pos: getPos(curr.toISOString().split('T')[0]),
        width: dayWidth * 7
      });
      curr.setDate(curr.getDate() + 7);
    }
  } else {
    while (curr < timelineRange.end) {
      const mStart = new Date(curr.getFullYear(), curr.getMonth(), 1);
      const mEnd = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);
      ticks.push({
        name: curr.toLocaleDateString('default', { month: 'short', year: '2-digit' }),
        pos: getPos(mStart.toISOString().split('T')[0]),
        width: getWidth(mStart.toISOString().split('T')[0], mEnd.toISOString().split('T')[0])
      });
      curr.setMonth(curr.getMonth() + 1);
    }
  }

  const todayPos = getPos(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300">
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-2 flex items-center gap-2 font-mono text-left">
        Strategic Timeline / {scale === 'days' ? 'Sprint' : scale === 'weeks' ? 'Operational' : 'Roadmap'} View
      </h2>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative">
        <div 
          ref={containerRef}
          className="overflow-x-auto custom-scrollbar select-none pb-4"
        >
          <div style={{ width: `${Math.max(timelineWidth, 800)}px` }} className="relative min-h-[350px]">
            
            {/* Tick Headers */}
            <div className="flex border-b border-border bg-muted/50 sticky top-0 z-20 h-10">
              {ticks.map((t, i) => (
                <div 
                  key={i} 
                  style={{ left: `${t.pos}px`, width: `${t.width}px` }}
                  className="absolute py-2.5 text-[9px] font-bold text-muted-foreground uppercase tracking-tighter text-center border-r border-border/50"
                >
                  {t.name}
                </div>
              ))}
            </div>

            {/* Today Line */}
            <div 
              style={{ left: `${todayPos}px` }}
              className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            >
              <div className="absolute top-10 -left-1 w-2 h-2 bg-blue-500 rounded-full border border-card" />
            </div>

            {/* Grid Lines */}
            {ticks.map((t, i) => (
              <div 
                key={`grid-${i}`}
                style={{ left: `${t.pos}px` }}
                className="absolute top-10 bottom-0 w-px bg-border/30 pointer-events-none"
              />
            ))}

            {/* Ticket Bars */}
            <div className="pt-16 space-y-3 px-4">
               {tickets.length === 0 ? (
                 <div className="text-muted-foreground italic text-xs py-10 pl-[30%]">No tickets matching current view</div>
               ) : tickets.map((ticket, i) => {
                 const x = getPos(ticket.start_date);
                 const w = getWidth(ticket.start_date, ticket.due_date);
                 
                 return (
                   <div 
                     key={ticket.id}
                     style={{ marginLeft: `${Math.max(x, 0)}px`, width: `${w}px` }}
                     onClick={() => onSelectTicket(ticket)}
                     className={cn(
                       "relative h-10 rounded-xl border transition-all cursor-pointer group hover:scale-[1.01] active:scale-95 shadow-lg",
                       ticket.status === 'Done' ? "bg-green-600/10 border-green-500/30 text-green-600" :
                       ticket.status === 'In Progress' ? "bg-amber-600/10 border-amber-500/30 text-amber-600" :
                       "bg-blue-600/10 border-blue-500/30 text-blue-600"
                     )}
                   >
                     <div className="px-3 h-full flex items-center overflow-hidden">
                        <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[10px] font-bold tracking-tight uppercase">
                          <span className="opacity-60 mr-2 font-mono">{ticket.identifier}</span>
                          {ticket.title}
                        </div>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted/50 rounded-b-xl overflow-hidden">
                        <div 
                          className={cn("h-full transition-all duration-1000", 
                             ticket.status === 'Done' ? "bg-green-500" : "bg-amber-500"
                          )} 
                          style={{ width: ticket.status === 'Done' ? '100%' : '30%' }}
                        />
                     </div>
                   </div>
                 );
               })}
            </div>
            <div className="h-10" />
          </div>
        </div>
      </div>
    </div>
  );
}
