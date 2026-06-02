'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, ChevronRight, Plus, Lock, ShieldCheck } from 'lucide-react';
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
  onClick,
  isTestingPhase = false
}: { 
  ticket: Ticket, 
  x: number, 
  w: number, 
  isParent: boolean, 
  readOnlyParent: boolean, 
  onClick: () => void,
  isTestingPhase?: boolean
}) => {
  if (!ticket || typeof ticket !== 'object') return null;

  const isTestTicket = ticket.tier === 'QA';
  const isDisabled = isTestingPhase && !isTestTicket;

  return (
    <div 
      style={{ left: `${x}px`, width: `${w}px` }}
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        "absolute transition-all flex items-center px-2 shadow-sm z-10",
        isDisabled ? "cursor-default opacity-20 bg-slate-500 border-slate-400 grayscale" : "cursor-pointer",
        !isDisabled && (isParent 
          ? cn("h-6 rounded-lg border-2", readOnlyParent ? "bg-muted border-border/50 text-muted-foreground italic" : "bg-blue-600/10 border-blue-500/30 text-blue-600")
          : cn("h-5 rounded-md border shadow-lg transition-transform", 
               isTestTicket 
                 ? "bg-pink-500/10 border-pink-500/50 text-pink-600 dark:text-pink-400 hover:scale-[1.02] hover:bg-pink-500/20" 
                 : "bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20 hover:scale-[1.01]"
            )
        )
      )}
    >
       <div className="flex items-center gap-1.5 truncate">
          {isTestTicket && <ShieldCheck size={10} className="shrink-0 animate-pulse" />}
          <span className="text-[8px] font-bold uppercase truncate">
            {String(ticket.identifier || 'UNK')}
          </span>
       </div>
    </div>
  );
};

export const GanttLabelRow = ({ 
  ticket, 
  depth, 
  isExpanded, 
  onToggle, 
  onSelect, 
  onAddChild,
  isParent,
  isTestingPhase = false,
  disableExpansion = false
}: { 
  ticket: Ticket, 
  depth: number, 
  isExpanded?: boolean, 
  onToggle?: () => void, 
  onSelect: () => void,
  onAddChild?: () => void,
  isParent: boolean,
  isTestingPhase?: boolean,
  disableExpansion?: boolean
}) => {
  if (!ticket || typeof ticket !== 'object') return null;

  const isTestTicket = ticket.tier === 'QA';
  const isDisabled = isTestingPhase && !isTestTicket && !isParent;

  return (
    <div 
      className={cn(
          "flex items-center gap-2 border-b border-border/30 transition-colors",
          isDisabled ? "opacity-30 cursor-default" : "hover:bg-muted/30 cursor-pointer",
          isParent ? "h-14 px-4" : "h-10 px-10 bg-muted/5",
          !isDisabled && isTestTicket && "bg-pink-500/5"
      )}
      onClick={isDisabled ? undefined : onSelect}
    >
      {isParent && onToggle && !disableExpansion && (
        <button 
          onClick={(e) => { e.stopPropagation(); onToggle(); }} 
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      )}
      {isParent && disableExpansion && <div className="w-6" />}
      {!isParent && (
        <div className={cn("w-1.5 h-1.5 rounded-full", isTestTicket ? "bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.4)]" : "bg-blue-500/30")} />
      )}
      
      <div className="flex-1 truncate text-left">
        <div className={cn("font-bold truncate text-foreground/80", isParent ? "text-[10px]" : "text-[9px]", isTestTicket && "text-pink-600 dark:text-pink-400")}>
          {String(ticket.title || 'Untitled')}
        </div>
        <div className="text-[7px] font-mono text-muted-foreground uppercase flex flex-wrap items-center gap-x-2">
           <span className={cn(isTestTicket && "font-bold")}>{String(ticket.identifier || 'UNK')}</span>
           {isTestTicket && ticket.linked_ticket_id && (
             <span className="text-pink-500 flex items-center gap-0.5 italic">
                <ShieldCheck size={8} />
                Verify {String(ticket.linked_ticket_id)}
             </span>
           )}
           {ticket.blocked_by && !isTestTicket && <span className="text-red-500 flex items-center gap-0.5 font-bold"><Lock size={8} />{String(ticket.blocked_by)}</span>}
           {ticket.blocking && !isTestTicket && <span className="text-blue-500 flex items-center gap-0.5 font-bold"><ChevronRight size={8} />{String(ticket.blocking)}</span>}
        </div>
      </div>
      
      {isParent && onAddChild && !isTestingPhase && (
        <button 
          onClick={(e) => { e.stopPropagation(); onAddChild(); }}
          className="p-1 bg-blue-600/10 text-blue-500 rounded border border-blue-500/20 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover/gantt:opacity-100"
        >
          <Plus size={12} />
        </button>
      )}
    </div>
  );
};
