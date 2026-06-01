'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronRight, X, User, Users, Archive, CheckCircle2, Calendar, Filter, RotateCcw } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TieredTicketListSidebarProps {
  phaseId: string;
  initialTier: string;
  selectedId?: string | null;
  onSelectTicket?: (ticket: any) => void;
  headerAction?: React.ReactNode;
}

export default function TieredTicketListSidebar({ phaseId, initialTier, selectedId, onSelectTicket, headerAction }: TieredTicketListSidebarProps) {
  const { t } = useLifecycle();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterFocused, setIsFilterFocused] = useState(false);
  
  // Filter States
  const [search, setSearch] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);
  const [parentFilter, setParentFilter] = useState<string[]>([]);
  const [dateType, setDateType] = useState('updated_at');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTickets();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (data.tickets) {
        setTickets(data.tickets.filter((tk: any) => tk.tier === initialTier));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isFilterActive = search !== '' || assigneeFilter.length > 0 || parentFilter.length > 0 || startDate !== '' || endDate !== '';

  const filtered = tickets.filter(tk => {
    const ms = tk.title.toLowerCase().includes(search.toLowerCase()) || tk.identifier.toLowerCase().includes(search.toLowerCase());
    const ma = assigneeFilter.length === 0 || assigneeFilter.includes(tk.assigned_agent_id);
    const mp = parentFilter.length === 0 || parentFilter.includes(tk.parent_id);
    return ms && ma && mp;
  });

  const { setPhaseFilteredTickets } = useLifecycle();
  
  useEffect(() => {
     if (!loading) {
         setPhaseFilteredTickets(phaseId, filtered.map(t => t.id));
     }
  }, [search, assigneeFilter, parentFilter, loading, phaseId, tickets]);

  const uniqueAssignees = Array.from(new Set(tickets.map(tk => tk.assigned_agent_id).filter(Boolean)));

  const sections = [
    { id: 'my-active', label: 'My Active', icon: <User size={12} />, items: filtered.filter(tk => tk.status === 'In Progress' && tk.assigned_agent_id === 'Claude-dev-1'), color: 'text-blue-500' },
    { id: 'active', label: 'Active', icon: <Users size={12} />, items: filtered.filter(tk => tk.status === 'In Progress' && tk.assigned_agent_id !== 'Claude-dev-1'), color: 'text-purple-500' },
    { id: 'backlog', label: 'Backlog', icon: <Archive size={12} />, items: filtered.filter(tk => tk.status === 'Todo'), color: 'text-muted-foreground' },
    { id: 'completed', label: 'Completed', icon: <CheckCircle2 size={12} />, items: filtered.filter(tk => tk.status === 'Done'), color: 'text-green-600' }
  ];

  return (
    <div ref={filterRef} className="bg-card border border-border rounded-2xl flex flex-col h-full shadow-2xl dark:shadow-black/40 relative group/registry font-sans text-left transition-colors duration-300">
      
      {/* Search Header */}
      <div className="p-4 border-b border-border bg-muted/20 z-30 relative rounded-t-2xl min-h-[65px]">
        {headerAction && <div className="mb-4">{headerAction}</div>}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
          <input 
            type="text"
            onFocus={() => setIsFilterFocused(true)}
            placeholder={t('filter_placeholder', { tier: initialTier })}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
                "w-full bg-card border border-border rounded-xl pl-10 pr-8 py-2.5 text-xs text-foreground outline-none transition-all font-medium",
                isFilterFocused ? "opacity-0 pointer-events-none" : "hover:border-accent cursor-pointer"
            )}
          />
        </div>

        {/* Filter Overlay */}
        {isFilterFocused && (
          <div className="absolute top-0 -left-6 -right-6 bg-card border border-border rounded-3xl shadow-[0_32px_64px_rgba(0,0,0,0.3)] dark:shadow-[0_32px_64px_rgba(0,0,0,0.9)] z-[70] overflow-hidden animate-in fade-in zoom-in-95 duration-200 p-1 text-left ring-1 ring-black/5 dark:ring-white/10">
             <div className="px-10 py-4 border-b border-border bg-muted/50 rounded-t-2xl relative">
                <Search className="absolute left-[52px] top-[26px] text-blue-500" size={14} />
                <input 
                  autoFocus
                  type="text"
                  placeholder={t('search_placeholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-10 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-bold italic tracking-tight"
                />
                <button onClick={() => setIsFilterFocused(false)} className="absolute right-12 top-[26px] p-0.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
             </div>
             <div className="p-6 space-y-8 bg-card overflow-y-auto max-h-[400px] custom-scrollbar">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        <User size={12} />
                        <span>{t('active_tickets')}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uniqueAssignees.map(id => (
                            <button key={id} onClick={() => setAssigneeFilter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                                className={cn("px-2 py-1 rounded-lg text-[9px] font-bold border", assigneeFilter.includes(id) ? "bg-blue-600 border-blue-400 text-white" : "bg-card border-border text-muted-foreground")}>
                                {id}
                            </button>
                        ))}
                    </div>
                </div>
                <button onClick={() => {setSearch(''); setAssigneeFilter([]); setParentFilter([]);}} className="w-full py-2 bg-muted border border-border rounded-xl text-[9px] font-bold uppercase text-muted-foreground hover:text-red-500 transition-colors">
                   Reset Filters
                </button>
             </div>
          </div>
        )}
      </div>

      {/* Ticket List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar z-0 border-t border-border">
        {loading ? (
           <div className="p-12 text-center text-muted-foreground text-[10px] font-mono animate-pulse uppercase">Indexing...</div>
        ) : filtered.length === 0 ? (
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
                      <div key={tk.id} onClick={() => onSelectTicket?.(tk)}
                        className={cn("p-3 hover:bg-muted/50 transition-all cursor-pointer group flex items-start justify-between border-l-2", selectedId === tk.id ? "bg-blue-600/10 border-blue-500" : "border-transparent")}>
                        <div className="space-y-1 pr-2 max-w-[85%] text-left">
                            <div className="flex items-center gap-2">
                                <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded border font-mono transition-colors", selectedId === tk.id ? "bg-blue-600 text-white border-blue-400" : "bg-muted text-muted-foreground border-border")}>
                                    {tk.identifier}
                                </span>
                                <span className={cn(
                                    "text-[7px] font-bold uppercase tracking-tighter px-1 rounded-sm border",
                                    tk.status === 'Done' ? "bg-green-500/10 text-green-600 border-green-500/20" : 
                                    tk.status === 'In Progress' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : 
                                    "bg-muted text-muted-foreground border-border"
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
         <div className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter italic font-sans">{t('registry_scan')}: {filtered.length} {t('matches')}</div>
      </div>
    </div>
  );
}
