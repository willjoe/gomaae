'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown, ChevronRight, Plus, Lock, ShieldCheck } from 'lucide-react';
import { Ticket } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * High-Integrity Gantt Bar Component
 * Implements contextual parent theming:
 * - Epics (Parent of Planning) -> De-emphasized Amber (Initiative)
 * - Stories (Parent of Dev) -> De-emphasized Indigo (Planning)
 */
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

  // Contextual Parent Theming Logic
  const getThemeClasses = () => {
    if (isDisabled) return "cursor-default opacity-20 bg-slate-500 border-slate-400 grayscale";
    
    if (isParent && readOnlyParent) {
      // Epics as parents (Initiative pattern, but greyed)
      if (ticket.tier === 'Epic') {
        return "bg-amber-500/5 border-amber-500/20 text-muted-foreground/60 grayscale-[0.6] italic";
      }
      // Stories as parents (Planning pattern, but greyed)
      if (ticket.tier === 'Story') {
        return "bg-violet-500/5 border-violet-500/20 text-muted-foreground/60 grayscale-[0.6] italic";
      }
      return "bg-muted border-border/50 text-muted-foreground italic";
    }

    if (isParent) {
       return "bg-blue-600/10 border-blue-500/30 text-blue-600";
    }

    // Child/Primary tickets - Unified Blue Theme
    if (isTestTicket) {
      return "bg-blue-600/10 border-blue-600/30 text-blue-600 dark:text-blue-400 hover:scale-[1.02] hover:bg-blue-600/20";
    }

    return "bg-blue-500/10 border-blue-500/30 text-blue-500 hover:bg-blue-500/20 hover:scale-[1.01]";
  };

  return (
    <div 
      style={{ left: `${x}px`, width: `${w}px` }}
      onClick={isDisabled ? undefined : onClick}
      className={cn(
        "absolute transition-all flex items-center px-2 shadow-sm z-10",
        isParent ? "h-6 rounded-lg border-2" : "h-5 rounded-md border shadow-lg transition-transform",
        !isDisabled && "cursor-pointer",
        getThemeClasses()
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
          "flex items-center gap-2 border-b border-border/30 transition-colors bg-card",
          isDisabled ? "opacity-30 cursor-default" : "hover:bg-muted/30 cursor-pointer",
          isParent ? "h-14 px-4" : "h-10 px-10"
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
        <div className={cn("w-1.5 h-1.5 rounded-full", isTestTicket ? "bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.4)]" : "bg-blue-500/30")} />
      )}
      
      <div className="flex-1 truncate text-left">
        <div className={cn(
            "font-bold truncate text-foreground/80", 
            isParent ? "text-[10px]" : "text-[9px]", 
            isTestTicket && "text-blue-600 dark:text-blue-400",
            isParent && ticket.tier === 'Epic' && "text-amber-700/70 dark:text-amber-500/40 italic",
            isParent && ticket.tier === 'Story' && "text-violet-700/70 dark:text-violet-400/40 italic"
        )}>
          {String(ticket.title || 'Untitled')}
        </div>
        <div className="text-[7px] font-mono text-muted-foreground uppercase flex flex-wrap items-center gap-x-2">
           <span className={cn(isTestTicket && "font-bold")}>{String(ticket.identifier || 'UNK')}</span>
           {isTestTicket && ticket.linked_ticket_id && (
             <span className="text-blue-500 flex items-center gap-0.5 italic">
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
