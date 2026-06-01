'use client';

import React from 'react';
import { RefreshCcw, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import TieredTicketListSidebar from './TieredTicketListSidebar';
import TicketDetailView from './TicketDetailView';
import TacticalCommandChat from './TacticalCommandChat';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LifecyclePageLayoutProps {
  phaseId: string;
  tier: string;
  title: string;
  description: string;
  themeColor: string;
  decorationColor: string;
  buttonLabel: string;
  buttonColor: string;
  dashboardContent: React.ReactNode;
  sidebarWidgets?: React.ReactNode;
}

export default function LifecyclePageLayout({
  phaseId,
  tier,
  title,
  description,
  themeColor,
  decorationColor,
  buttonLabel,
  buttonColor,
  dashboardContent,
  sidebarWidgets
}: LifecyclePageLayoutProps) {
  const { tickets, loading, phaseStates, setPhaseSelectedTicket, refreshTickets, t } = useLifecycle();
  
  const phaseTickets = tickets.filter((tk: any) => tk.tier === tier);
  const selectedTicketId = phaseStates[phaseId]?.selectedTicketId;
  const selectedTicket = phaseTickets.find(tk => tk.id === selectedTicketId);

  const handleSelectTicket = (ticket: any) => {
    if (selectedTicketId === ticket.id) {
      setPhaseSelectedTicket(phaseId, null);
    } else {
      setPhaseSelectedTicket(phaseId, ticket.id);
    }
  };

  const headerAction = (
    <button className={cn("w-full flex items-center justify-center gap-2 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-lg active:scale-95", buttonColor)}>
      <Plus size={16} />
      <span>{buttonLabel}</span>
    </button>
  );

  return (
    <div className="flex h-full overflow-hidden font-sans">
      {/* Scrollable Dashboard Pane */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 relative">
        <header className="flex justify-between items-center pb-8 border-b border-slate-800/50">
          <div>
            <h1 className={cn("text-3xl font-bold italic tracking-tight underline underline-offset-8 decoration-4", themeColor, decorationColor)}>
              {title}
            </h1>
            <p className="text-slate-400 mt-2 text-sm italic">{description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <RefreshCcw 
              size={18} 
              className={cn("cursor-pointer text-slate-500 hover:text-slate-300 transition-colors", loading && "animate-spin")} 
              onClick={refreshTickets}
            />
          </div>
        </header>

        {selectedTicket ? (
          <div className="pb-20">
            <TicketDetailView 
               ticket={selectedTicket} 
               onClose={() => setPhaseSelectedTicket(phaseId, null)} 
            />
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {dashboardContent}
          </div>
        )}
      </div>

      {/* Static Sidebar Pane */}
      <div className="w-[300px] p-8 border-l border-slate-900 bg-slate-900/10 shrink-0 flex flex-col h-full relative space-y-6">
        <div className="flex-1 h-full">
           <TieredTicketListSidebar 
             phaseId={phaseId}
             initialTier={tier} 
             selectedId={selectedTicketId}
             onSelectTicket={handleSelectTicket} 
             headerAction={headerAction}
           />
        </div>
        
        {sidebarWidgets && (
           <div className="shrink-0 pr-1">
              {sidebarWidgets}
           </div>
        )}

        <div className="shrink-0">
           <TacticalCommandChat phaseId={phaseId} />
        </div>
      </div>
    </div>
  );
}
