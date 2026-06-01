'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, ChevronRight, Plus, Lock } from 'lucide-react';
import { Ticket } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const GanttBar = ({ 
  ticket, 
  x, 
  w, 
  isParent, 
  readOnlyParent, 
  onClick 
}: { 
  ticket: Ticket, 
  x: number, 
  w: number, 
  isParent: boolean, 
  readOnlyParent: boolean, 
  onClick: () => void 
}) => (
  <div 
    style={{ left: `${x}px`, width: `${w}px` }}
    onClick={onClick}
    className={cn(
      "absolute transition-all cursor-pointer flex items-center px-2 shadow-sm z-10",
      isParent 
        ? cn("h-6 rounded-lg border-2", readOnlyParent ? "bg-muted border-border/50 text-muted-foreground italic" : "bg-blue-600/10 border-blue-500/30 text-blue-600")
        : "h-5 rounded-md border bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20 hover:scale-[1.01]"
    )}
  >
     <span className="text-[8px] font-bold uppercase truncate">{ticket.identifier}</span>
  </div>
);

export const GanttLabelRow = ({ 
  ticket, 
  depth, 
  isExpanded, 
  onToggle, 
  onSelect, 
  onAddChild,
  isParent
}: { 
  ticket: Ticket, 
  depth: number, 
  isExpanded?: boolean, 
  onToggle?: () => void, 
  onSelect: () => void,
  onAddChild?: () => void,
  isParent: boolean
}) => (
  <div 
    className={cn(
        "flex items-center gap-2 border-b border-border/30 hover:bg-muted/30 transition-colors cursor-pointer",
        isParent ? "h-14 px-4" : "h-10 px-10 bg-muted/5 hover:bg-muted/50"
    )}
    onClick={onSelect}
  >
    {isParent && onToggle && (
      <button 
        onClick={(e) => { e.stopPropagation(); onToggle(); }} 
        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      </button>
    )}
    {!isParent && <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />}
    
    <div className="flex-1 truncate text-left">
      <div className={cn("font-bold truncate text-foreground/80", isParent ? "text-[10px]" : "text-[9px]")}>{ticket.title}</div>
      <div className="text-[7px] font-mono text-muted-foreground uppercase flex flex-wrap items-center gap-x-2">
         <span>{ticket.identifier}</span>
         {ticket.blocked_by && <span className="text-red-500 flex items-center gap-0.5 font-bold"><Lock size={8} />{ticket.blocked_by}</span>}
         {ticket.blocking && <span className="text-blue-500 flex items-center gap-0.5 font-bold"><ChevronRight size={8} />{ticket.blocking}</span>}
      </div>
    </div>
    
    {isParent && onAddChild && (
      <button 
        onClick={(e) => { e.stopPropagation(); onAddChild(); }}
        className="p-1 bg-blue-600/10 text-blue-500 rounded border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/gantt:opacity-100"
      >
        <Plus size={12} />
      </button>
    )}
  </div>
);
