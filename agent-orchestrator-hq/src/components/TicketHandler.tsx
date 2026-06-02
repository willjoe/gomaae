'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useLifecycle } from '@/context/LifecycleContext';
import { Ticket } from './gantt/types';

interface TicketHandlerProps {
  phaseId: string;
  tier: string;
  children: (data: {
    filteredTickets: Ticket[];
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    activeFilters: {
      assignees: string[];
    };
    toggleAssigneeFilter: (id: string) => void;
    resetFilters: () => void;
  }) => React.ReactNode;
}

export default function TicketHandler({ phaseId, tier, children }: TicketHandlerProps) {
  const { tickets: allTickets, loading, phaseStates, setPhaseFilteredTickets } = useLifecycle();
  
  // Local state for UI controls, but results can be synced to global context if needed
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<string[]>([]);

  // 1. Filter Logic
  const tierTickets = useMemo(() => 
    allTickets.filter((tk: any) => tk.tier === tier), 
  [allTickets, tier]);

  const filteredTickets = useMemo(() => {
    return tierTickets.filter(tk => {
      const title = tk.title || '';
      const identifier = tk.identifier || '';
      const matchesSearch = title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            identifier.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesAssignee = assigneeFilter.length === 0 || 
                              assigneeFilter.includes(tk.assigned_agent_id);
      
      return matchesSearch && matchesAssignee;
    });
  }, [tierTickets, searchQuery, assigneeFilter]);

  // 2. Sync with LifecycleContext for other consumers (like global chat)
  useEffect(() => {
    if (!loading) {
      const newIds = filteredTickets.map(t => t.id);
      const currentIds = phaseStates[phaseId]?.filteredTicketIds || [];
      
      // Only update if the content has changed to prevent infinite loops
      if (JSON.stringify(newIds) !== JSON.stringify(currentIds)) {
        setPhaseFilteredTickets(phaseId, newIds);
      }
    }
  }, [filteredTickets, loading, phaseId, phaseStates, setPhaseFilteredTickets]);

  const toggleAssigneeFilter = (id: string) => {
    setAssigneeFilter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setAssigneeFilter([]);
  };

  return (
    <>
      {children({
        filteredTickets,
        searchQuery,
        setSearchQuery,
        activeFilters: {
          assignees: assigneeFilter
        },
        toggleAssigneeFilter,
        resetFilters
      })}
    </>
  );
}
