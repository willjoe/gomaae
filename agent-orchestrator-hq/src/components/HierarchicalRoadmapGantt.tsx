'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, ChevronRight, Plus, Lock } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type GanttScale = 'months' | 'weeks' | 'days';

interface HierarchicalRoadmapGanttProps {
  parents: any[];
  children: any[];
  onSelectTicket: (ticket: any) => void;
  onAddChild?: (parent: any) => void;
  scale?: GanttScale;
  parentLabel?: string;
  childLabel?: string;
  readOnlyParent?: boolean;
}

interface BarCoords {
  id: string;
  ident: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function HierarchicalRoadmapGantt({ 
  parents, 
  children, 
  onSelectTicket, 
  onAddChild,
  scale = 'weeks',
  parentLabel = 'Parent',
  childLabel = 'Child',
  readOnlyParent = true
}: HierarchicalRoadmapGanttProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [expandedParents, setExpandedParents] = useState<string[]>(parents.map(p => p.id));
  const [coords, setCoords] = useState<Record<string, BarCoords>>({});

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

  const getPos = useCallback((dateStr: string) => {
    if (!dateStr || !timelineRange) return 0;
    const date = new Date(dateStr);
    const diff = date.getTime() - timelineRange.start.getTime();
    return (diff / (1000 * 60 * 60 * 24)) * dayWidth;
  }, [timelineRange, dayWidth]);

  const getWidth = useCallback((startStr: string, endStr: string) => {
    if (!startStr || !endStr || !timelineRange) return 100;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diff = end.getTime() - start.getTime();
    return Math.max((diff / (1000 * 60 * 60 * 24)) * dayWidth, 20);
  }, [timelineRange, dayWidth]);

  // Recalculate coordinates whenever expansion or tickets change
  useEffect(() => {
    if (!timelineRange) return;

    let currentY = 0;
    const rowHeight = 56;
    const childRowHeight = 40;
    const finalCoords: Record<string, BarCoords> = {};

    parents.forEach(p => {
        const px = getPos(p.start_date);
        const pw = getWidth(p.start_date, p.due_date);
        finalCoords[p.identifier] = { id: p.id, ident: p.identifier, x: px, y: currentY + 28, w: pw, h: 24 };
        currentY += rowHeight;

        if (expandedParents.includes(p.id)) {
            const pChildren = children.filter(c => c.parent_id === p.id);
            pChildren.forEach(c => {
                const cx = getPos(c.start_date);
                const cw = getWidth(c.start_date, c.due_date);
                finalCoords[c.identifier] = { id: c.id, ident: c.identifier, x: cx, y: currentY + 20, w: cw, h: 20 };
                currentY += childRowHeight;
            });
        }
    });

    setCoords(finalCoords);
  }, [expandedParents, parents, children, timelineRange, getPos, getWidth]);

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const todayPos = timelineRange ? getPos(new Date().toISOString().split('T')[0]) : 0;

  // Dependency Lines (SVG Paths)
  const dependencyLines = useMemo(() => {
    const lines: React.ReactNode[] = [];
    const allTkts = [...parents, ...children];

    allTkts.forEach(t => {
       if (t.blocked_by && coords[t.blocked_by] && coords[t.identifier]) {
          const from = coords[t.blocked_by];
          const to = coords[t.identifier];

          const x1 = from.x + from.w;
          const y1 = from.y;
          const x2 = to.x;
          const y2 = to.y;

          const midX = x1 + (x2 - x1) / 2;
          const path = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

          lines.push(
            <g key={`dep-${t.identifier}`}>
               <path 
                 d={path} 
                 fill="none" 
                 stroke="currentColor" 
                 strokeWidth="1.5" 
                 className="text-slate-400 dark:text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity"
               />
               <circle cx={x2} cy={y2} r="3" className="fill-blue-500" />
            </g>
          );
       }
    });
    return lines;
  }, [coords, parents, children]);

  if (!timelineRange) return (
     <div className="p-12 text-center text-muted-foreground animate-pulse font-mono text-[10px] uppercase tracking-widest">
        Initializing Canvas...
     </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
          Hierarchical Timeline / {parentLabel} → {childLabel}
        </h2>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative group/gantt">
        {/* Fixed Top Header */}
        <div className="flex h-[40px] border-b border-border bg-muted/50 sticky top-0 z-30">
           <div className="w-64 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
             {parentLabel} Registry
           </div>
           <div className="flex-1 relative overflow-hidden">
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10"
             />
           </div>
        </div>

        <div className="relative max-h-[600px] overflow-y-auto custom-scrollbar flex" ref={scrollRef}>
          {/* Left Labels Pane */}
          <div className="w-64 shrink-0 border-r border-border bg-card z-20">
             {parents.map(p => (
               <React.Fragment key={p.id}>
                  <div className="h-14 flex items-center px-4 gap-2 border-b border-border/30 hover:bg-muted/30 transition-colors">
                      <button onClick={() => toggleExpand(p.id)} className="text-muted-foreground hover:text-foreground">
                        {expandedParents.includes(p.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <div className="flex-1 truncate text-left">
                        <div className="text-[10px] font-bold truncate text-foreground/80">{p.title}</div>
                        <div className="text-[8px] font-mono text-muted-foreground uppercase">{p.identifier}</div>
                      </div>
                      {onAddChild && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onAddChild(p); }}
                          className="p-1 bg-blue-600/10 text-blue-500 rounded border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/gantt:opacity-100"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                  </div>
                  {expandedParents.includes(p.id) && children.filter(c => c.parent_id === p.id).map(c => (
                     <div key={c.id} className="h-10 flex items-center px-10 gap-2 border-b border-border/20 bg-muted/5 hover:bg-muted/50 transition-colors">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
                        <div className="flex-1 truncate text-left">
                           <div className="text-[9px] font-semibold truncate text-foreground">{c.title}</div>
                           <div className="text-[7px] font-mono text-muted-foreground uppercase">{c.identifier}</div>
                        </div>
                     </div>
                  ))}
               </React.Fragment>
             ))}
          </div>

          {/* Right Gantt Canvas */}
          <div className="flex-1 relative min-h-[400px]" style={{ minWidth: '1000px' }}>
             {/* Background Grid & Today Line */}
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/20 z-10 pointer-events-none"
             />

             {/* SVG Layer for Dependency Lines */}
             <svg className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                {dependencyLines}
             </svg>

             {/* Ticket Bars */}
             <div className="relative">
                {parents.map(p => (
                   <React.Fragment key={`bar-${p.id}`}>
                      <div className="h-14 flex items-center px-4 relative border-b border-border/30">
                        <div 
                          style={{ left: `${getPos(p.start_date)}px`, width: `${getWidth(p.start_date, p.due_date)}px` }}
                          onClick={() => onSelectTicket(p)}
                          className={cn(
                            "absolute h-6 rounded-lg border-2 transition-all cursor-pointer flex items-center px-2 shadow-sm z-10",
                            readOnlyParent ? "bg-muted border-border/50 text-muted-foreground italic" : "bg-blue-600/10 border-blue-500/30 text-blue-600"
                          )}
                        >
                           <span className="text-[8px] font-bold uppercase truncate">{p.identifier}</span>
                        </div>
                      </div>
                      {expandedParents.includes(p.id) && children.filter(c => c.parent_id === p.id).map(c => (
                        <div key={`bar-${c.id}`} className="h-10 flex items-center px-4 relative border-b border-border/20">
                           <div 
                             style={{ left: `${getPos(c.start_date)}px`, width: `${getWidth(c.start_date, c.due_date)}px` }}
                             onClick={() => onSelectTicket(c)}
                             className={cn(
                                "absolute h-5 rounded-md border transition-all cursor-pointer flex items-center px-2 group hover:scale-[1.01] shadow-sm z-10",
                                "bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20"
                             )}
                           >
                              <span className="text-[8px] font-bold uppercase truncate">{c.identifier}</span>
                           </div>
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
