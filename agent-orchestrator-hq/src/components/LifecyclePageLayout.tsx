'use client';

import React, { useState } from 'react';
import { RefreshCcw, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import TieredTicketListSidebar from './TieredTicketListSidebar';
import TicketDetailView from './TicketDetailView';
import TacticalCommandChat from './TacticalCommandChat';
import TicketFormModal from './TicketFormModal';
import { useLifecycle } from '@/context/LifecycleContext';
import { lifecycleTheme } from '@/lib/theme';


interface LifecyclePageLayoutProps {
  phaseId: string;
  tier: string;
  title: string;
  description: string;
  buttonLabel: string;
  dashboardContent: React.ReactNode;
  sidebarWidgets?: React.ReactNode;
  
  // Decoupled Sidebar Props
  sidebarProps?: {
    tickets: any[];
    searchQuery: string;
    onSearchChange: (q: string) => void;
    activeAssigneeFilters: string[];
    onToggleAssignee: (id: string) => void;
    onResetFilters: () => void;
  };
}

export default function LifecyclePageLayout({
  phaseId,
  tier,
  title,
  description,
  buttonLabel,
  dashboardContent,
  sidebarWidgets,
  sidebarProps
}: LifecyclePageLayoutProps) {
  const { tickets, loading, phaseStates, setPhaseSelectedTicket, refreshTickets, t } = useLifecycle();
  const theme = lifecycleTheme[phaseId] || lifecycleTheme.initiative;
  const [showCreate, setShowCreate] = useState(false);

  const selectedTicketId = phaseStates[phaseId]?.selectedTicketId;
  const selectedTicket = tickets.find(tk => tk.id === selectedTicketId);

  const handleSelectTicket = (ticket: any) => {
    if (selectedTicketId === ticket.id) {
      setPhaseSelectedTicket(phaseId, null);
    } else {
      setPhaseSelectedTicket(phaseId, ticket.id);
    }
  };

  const headerAction = (
    <button
      onClick={() => setShowCreate(true)}
      className={cn("w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-lg active:scale-95", theme.button)}
    >
      <Plus size={16} />
      <span>{buttonLabel}</span>
    </button>
  );

  return (
    <div className="flex h-full overflow-hidden font-sans text-left transition-colors duration-300">
      {/* Scrollable Dashboard Pane */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md px-8 py-8 border-b border-border flex justify-between items-center transition-colors duration-300">
          <div>
            <h1 className={cn("text-3xl font-bold italic tracking-tight underline underline-offset-8 decoration-4", theme.text, theme.decoration)}>
              {title}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm italic">{description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <RefreshCcw 
              size={18} 
              className={cn("cursor-pointer text-muted-foreground hover:text-foreground transition-colors", loading && "animate-spin")} 
              onClick={refreshTickets}
            />
          </div>
        </header>

        <div className="p-8 space-y-8">
          <div className={cn(selectedTicket ? "hidden" : "animate-in fade-in duration-500")}>
            {dashboardContent}
          </div>

          {selectedTicket && (
            <div className="pb-20">
              <TicketDetailView 
                 ticket={selectedTicket} 
                 phaseId={phaseId}
                 onClose={() => setPhaseSelectedTicket(phaseId, null)} 
              />
            </div>
          )}
        </div>
      </div>

      {/* Static Sidebar Pane */}
      <div className="w-[320px] border-l border-border bg-muted/10 shrink-0 flex flex-col h-full relative">
        {/* Scrollable ticket list — fills all space above the chat */}
        <div className="flex-1 min-h-0 p-4">
           {sidebarProps ? (
             <TieredTicketListSidebar
               phaseId={phaseId}
               initialTier={tier}
               selectedId={selectedTicketId}
               onSelectTicket={handleSelectTicket}
               headerAction={headerAction}
               {...sidebarProps}
             />
           ) : (
             <div className="p-8 text-center text-muted-foreground italic text-xs">Initializing Registry...</div>
           )}
        </div>

        {sidebarWidgets && (
           <div className="shrink-0 px-4 pb-2">
              {sidebarWidgets}
           </div>
        )}

        {/* Chat — shrink-0 guarantees it is always fully visible at the bottom */}
        <div className="shrink-0 px-4 pb-4 pt-3 border-t border-border/50">
           <TacticalCommandChat phaseId={phaseId} />
        </div>
      </div>

      {showCreate && (
        <TicketFormModal
          phaseId={phaseId}
          tier={tier}
          title={buttonLabel}
          onClose={() => setShowCreate(false)}
          onCreated={(id) => setPhaseSelectedTicket(phaseId, id)}
        />
      )}
    </div>
  );
}
