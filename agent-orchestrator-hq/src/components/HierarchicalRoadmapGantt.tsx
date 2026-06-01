'use client';

import React, { useRef, useEffect, useState } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [timelineRange, setTimelineRange] = useState<{ start: Date; end: Date } | null>(null);
  const [expandedParents, setExpandedParents] = useState<string[]>(parents.map(p => p.id));

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

  if (!timelineRange) return null;

  const dayWidth = scale === 'days' ? 50 : scale === 'weeks' ? 15 : 4;
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

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const todayPos = getPos(new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans transition-colors duration-300">
      <div className="flex items-center justify-between px-2">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
          Hierarchical Timeline / {parentLabel} → {childLabel}
        </h2>
      </div>

      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col relative">
        <div className="flex h-[40px] border-b border-border bg-muted/50 sticky top-0 z-30">
           <div className="w-64 shrink-0 border-r border-border flex items-center px-4 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
             {parentLabel} Registry
           </div>
           <div className="flex-1 relative overflow-hidden">
             {/* Time scale markers could go here, simplified for now */}
             <div 
               style={{ left: `${todayPos}px` }}
               className="absolute top-0 bottom-0 w-px bg-blue-500/50 z-10"
             />
           </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {parents.length === 0 ? (
             <div className="p-12 text-center text-muted-foreground italic text-xs uppercase tracking-widest">No primary anchors found</div>
          ) : parents.map(parent => {
            const parentChildren = children.filter(c => c.parent_id === parent.id);
            const isExpanded = expandedParents.includes(parent.id);
            const px = getPos(parent.start_date);
            const pw = getWidth(parent.start_date, parent.due_date);

            return (
              <div key={parent.id} className="border-b border-border/50 last:border-0">
                {/* Parent Row */}
                <div className="flex hover:bg-muted/30 transition-colors group h-14 items-center">
                   <div className="w-64 shrink-0 border-r border-border flex items-center px-4 gap-2">
                      <button onClick={() => toggleExpand(parent.id)} className="text-muted-foreground hover:text-foreground">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <div className="flex-1 truncate">
                        <div className="text-[10px] font-bold truncate text-foreground/80">{parent.title}</div>
                        <div className="text-[8px] font-mono text-muted-foreground uppercase">{parent.identifier}</div>
                      </div>
                      {onAddChild && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); onAddChild(parent); }}
                          className="opacity-0 group-hover:opacity-100 p-1 bg-blue-600/10 text-blue-500 rounded border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                   </div>
                   <div className="flex-1 relative h-full flex items-center px-4">
                      <div 
                        style={{ marginLeft: `${Math.max(px, 0)}px`, width: `${pw}px` }}
                        onClick={() => onSelectTicket(parent)}
                        className={cn(
                          "h-6 rounded-lg border-2 transition-all cursor-pointer flex items-center px-2 shadow-sm",
                          readOnlyParent ? "bg-muted border-border/50 text-muted-foreground italic" : "bg-blue-600/10 border-blue-500/30 text-blue-600"
                        )}
                      >
                         <span className="text-[8px] font-bold uppercase truncate">{parent.identifier} {readOnlyParent && '(Read-Only)'}</span>
                      </div>
                   </div>
                </div>

                {/* Children Rows */}
                {isExpanded && (
                  <div className="bg-muted/10">
                    {parentChildren.length === 0 ? (
                       <div className="flex h-10 items-center">
                          <div className="w-64 shrink-0 border-r border-border px-12 text-[9px] text-muted-foreground italic">No {childLabel}s mapped</div>
                          <div className="flex-1 border-b border-border/20" />
                       </div>
                    ) : parentChildren.map(child => {
                       const cx = getPos(child.start_date);
                       const cw = getWidth(child.start_date, child.due_date);
                       
                       return (
                         <div key={child.id} className="flex hover:bg-muted/50 transition-colors h-10 items-center">
                            <div className="w-64 shrink-0 border-r border-border flex items-center px-10 gap-2 overflow-hidden">
                               <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
                               <div className="flex-1 truncate">
                                  <div className="text-[9px] font-semibold truncate text-foreground">{child.title}</div>
                                  <div className="text-[7px] font-mono text-muted-foreground uppercase">{child.identifier}</div>
                               </div>
                            </div>
                            <div className="flex-1 relative h-full flex items-center px-4">
                               <div 
                                 style={{ marginLeft: `${Math.max(cx, 0)}px`, width: `${cw}px` }}
                                 onClick={() => onSelectTicket(child)}
                                 className="h-5 rounded-md border bg-blue-500/10 border-blue-500/30 text-blue-500 transition-all cursor-pointer flex items-center px-2 group hover:scale-[1.01] hover:bg-blue-500/20"
                               >
                                  <span className="text-[8px] font-bold uppercase truncate">{child.identifier}</span>
                               </div>
                            </div>
                         </div>
                       );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
