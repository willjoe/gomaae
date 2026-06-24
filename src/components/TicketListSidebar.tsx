'use client';

import React, { useState, useEffect } from 'react';
import { Search, Filter, Ticket, ChevronRight, X, FlaskConical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getTierBadgeClasses, getStatusDotClasses } from '@/lib/phaseConfig';


interface TicketListSidebarProps {
  initialTier?: string;
}

export default function TicketListSidebar({ initialTier }: TicketListSidebarProps) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [search, tickets]);

  const fetchTickets = async () => {
    try {
      const res = await fetch('/api/tickets');
      const data = await res.json();
      if (data.tickets) {
        // Strictly filter by the tier assigned to this page at the data level
        const tierTickets = initialTier && initialTier !== 'All' 
          ? data.tickets.filter((t: any) => t.tier === initialTier)
          : data.tickets;
        setTickets(tierTickets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = tickets;
    
    if (search) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(search.toLowerCase()) || 
        t.identifier.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    setFilteredTickets(result);
  };

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col h-[500px] overflow-hidden shadow-inner transition-colors duration-300">
      {/* Header & Search */}
      <div className="p-4 border-b border-border space-y-3 bg-muted/20">
        <div className="flex items-center justify-between">
           <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Registry: {initialTier}s</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 text-muted-foreground/60" size={14} />
          <input 
            type="text"
            placeholder={`Search ${initialTier}s...`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-9 pr-8 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-blue-500/50 transition-all placeholder:text-muted-foreground/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-2.5 text-muted-foreground/60 hover:text-foreground">
               <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/30 custom-scrollbar">
        {loading ? (
           <div className="p-8 text-center text-muted-foreground text-[10px] font-mono animate-pulse">Accessing registry...</div>
        ) : filteredTickets.length === 0 ? (
           <div className="p-8 text-center text-muted-foreground text-[10px] italic">No {initialTier}s found.</div>
        ) : (
          filteredTickets.map(t => (
            <div key={t.id} className="p-3 hover:bg-muted/40 transition-colors cursor-pointer group flex items-start justify-between">
               <div className="space-y-1 pr-2 max-w-[85%]">
                  <div className="flex items-center gap-2">
                     <span className={cn(
                       "text-[8px] font-bold px-1 rounded uppercase tracking-tighter border",
                       getTierBadgeClasses(t.tier)
                     )}>
                       {t.identifier}
                     </span>
                     <span className={cn("w-1 h-1 rounded-full", getStatusDotClasses(t.status))} />
                  </div>
                  <div className="text-[11px] font-medium text-foreground/80 group-hover:text-foreground transition-colors truncate">
                    {t.title}
                  </div>
               </div>
               <ChevronRight size={12} className="text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors mt-1 shrink-0" />
            </div>
          ))
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-border bg-muted/10 text-center">
         <div className="text-[9px] text-muted-foreground/60 uppercase tracking-tighter font-bold">Scoped to Lifecycle State</div>
      </div>
    </div>
  );
}
