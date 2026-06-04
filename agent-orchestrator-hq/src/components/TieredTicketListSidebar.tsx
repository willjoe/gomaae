'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronRight, X, User, Users, Archive, CheckCircle2, Calendar, Filter, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { MY_AGENT_ID, getStatusBadgeClasses } from '@/lib/phaseConfig';
import { useLifecycle } from '@/context/LifecycleContext';
import { Ticket } from './gantt/types';


interface TieredTicketListSidebarProps {
  phaseId: string;
  initialTier: string;
  tickets: Ticket[]; // Now takes tickets as props
  selectedId?: string | null;
  onSelectTicket?: (ticket: any) => void;
  headerAction?: React.ReactNode;
  
  // Filter Props (Controlled from parent handler)
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeAssigneeFilters: string[];
  onToggleAssignee: (id: string) => void;
  onResetFilters: () => void;
}

export default function TieredTicketListSidebar({ 
  phaseId, 
  initialTier, 
  tickets, 
  selectedId, 
  onSelectTicket, 
  headerAction,
  searchQuery,
  onSearchChange,
  activeAssigneeFilters,
  onToggleAssignee,
  onResetFilters
}: TieredTicketListSidebarProps) {
  const { t, loading, tickets: allTickets } = useLifecycle();
  const [isFilterFocused, setIsFilterFocused] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const uniqueAssignees = useMemo(() => {
    const tierTickets = allTickets.filter(tk => tk.tier === initialTier);
    return Array.from(new Set(tierTickets.map(tk => tk.assigned_agent_id).filter(Boolean)));
  }, [allTickets, initialTier]);

  const sections = [
    { id: 'my-active', label: t('my_active'), icon: <User size={12} />, items: tickets.filter(tk => (tk.status === 'In Progress' || tk.status === 'In Review') && tk.assigned_agent_id === MY_AGENT_ID), color: 'text-blue-500' },
    { id: 'active', label: t('active_tickets'), icon: <Users size={12} />, items: tickets.filter(tk => (tk.status === 'In Progress' || tk.status === 'In Review') && tk.assigned_agent_id !== MY_AGENT_ID), color: 'text-purple-500' },
    { id: 'backlog', label: t('backlog'), icon: <Archive size={12} />, items: tickets.filter(tk => tk.status === 'Todo'), color: 'text-muted-foreground' },
    { id: 'completed', label: t('completed_tickets'), icon: <CheckCircle2 size={12} />, items: tickets.filter(tk => tk.status === 'Done'), color: 'text-green-600' }
  ];

  return (
    <div ref={filterRef} className="bg-card border border-border rounded-2xl flex flex-col h-full shadow-2xl dark:shadow-black/40 relative group/registry font-sans text-left transition-colors duration-300 overflow-visible">
      
      {/* Search Header */}
      <div className="p-4 border-b border-border bg-muted/20 z-30 relative rounded-t-2xl min-h-[65px]">
        {headerAction && <div className="mb-4">{headerAction}</div>}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
          <input 
            type="text"
            onFocus={() => setIsFilterFocused(true)}
            placeholder={t('filter_placeholder', { tier: initialTier })}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={cn(
                "w-full bg-card border border-border rounded-xl pl-10 pr-8 py-2.5 text-xs text-foreground outline-none transition-all font-medium",
                isFilterFocused ? "opacity-0 pointer-events-none" : "hover:border-accent cursor-pointer"
            )}
          />
        </div>

        {/* Filter Overlay */}
        {isFilterFocused && (
          <div className="absolute top-0 -left-6 -right-6 bg-card border border-border rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.9)] z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1 text-left ring-1 ring-black/5 dark:ring-white/10">
             <div className="px-6 py-4 border-b border-border bg-muted/50 rounded-t-2xl relative">
                {headerAction && <div className="mb-4 invisible pointer-events-none">{headerAction}</div>}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-blue-500" size={14} />
                  <input 
                    autoFocus
                    type="text"
                    placeholder={t('search_placeholder')}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold italic tracking-tight"
                  />
                  <button onClick={() => setIsFilterFocused(false)} className="absolute right-3 top-2.5 p-0.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                    <X size={18} />
                  </button>
                </div>
             </div>
             <div className="p-6 space-y-8 bg-card overflow-y-auto max-h-[400px] custom-scrollbar">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <User size={12} />
                        <span>{t('active_tickets')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueAssignees.length === 0 ? (
                           <span className="text-[10px] text-muted-foreground italic">No assigned agents found</span>
                        ) : uniqueAssignees.map(id => (
                            <button key={id} onClick={() => onToggleAssignee(id)}
                                className={cn("px-2 py-1 rounded-lg text-[9px] font-bold border", activeAssigneeFilters.includes(id) ? "bg-blue-600 border-blue-400 text-white" : "bg-card border-border text-muted-foreground")}>
                                {id}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={onResetFilters} className="w-full py-2 bg-muted border border-border rounded-xl text-[9px] font-bold uppercase text-muted-foreground hover:text-red-500 transition-colors">
                   Reset Filters
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar z-0 border-t border-border rounded-b-2xl">
        {loading ? (
           <div className="p-12 text-center text-muted-foreground text-[10px] font-mono animate-pulse uppercase">Indexing...</div>
        ) : tickets.length === 0 ? (
           <div className="p-12 text-center text-muted-foreground text-[10px] italic uppercase font-bold tracking-widest">Empty Registry</div>
        ) : (
          sections.map(section => {
            if (section.items.length === 0) return null;
            return (
              <div key={section.id}>
                 <div className="sticky top-0 z-10 px-4 py-1.5 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between">
                    <div className={cn("flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider", section.color)}>
                       {section.icon}
                       <span>{section.label}</span>
                    </div>
                    <span className="text-[9px] font-mono text-muted-foreground">{section.items.length}</span>
                 </div>
                 <div className="divide-y divide-border/50">
                    {section.items.map(tk => (
                      <div 
                        key={tk.id} 
                        onClick={() => onSelectTicket?.(tk)}
                        className={cn("p-3 hover:bg-muted/50 transition-all cursor-pointer group flex items-start justify-between border-l-2", selectedId === tk.id ? "bg-blue-600/10 border-blue-500" : "border-transparent")}
                      >
                        <div className="space-y-1 pr-2 max-w-[85%] text-left">
                            <div className="flex items-center gap-2">
                                <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded border font-mono transition-colors", selectedId === tk.id ? "bg-blue-600 text-white border-blue-400" : "bg-muted text-muted-foreground border-border")}>
                                    {tk.identifier}
                                </span>
                                <span className={cn(
                                    "text-[7px] font-bold uppercase tracking-tighter px-1 rounded-sm border",
                                    getStatusBadgeClasses(tk.status)
                                )}>
                                    {tk.status}
                                </span>
                            </div>
                            <div className={cn("text-[11px] font-semibold transition-colors leading-tight", selectedId === tk.id ? "text-foreground font-bold" : "text-muted-foreground group-hover:text-foreground")}>
                              {tk.title}
                            </div>
                        </div>
                        <ChevronRight size={12} className={cn("mt-1 shrink-0", selectedId === tk.id ? "text-blue-500" : "text-muted-foreground/30")} />
                      </div>
                    ))}
                 </div>
              </div>
            );
          })
        )}
      </div>

      {/* Registry Scan Footer */}
      <div className="p-3 border-t border-border bg-muted/30 text-center rounded-b-2xl shrink-0">
         <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter italic font-sans">{t('registry_scan')}: {tickets.length} {t('matches')}</div>
      </div>
    </div>
  );
}
