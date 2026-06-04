'use client';

import React, { useMemo, useState } from 'react';
import { FlaskConical, Activity, CheckCircle2, ShieldCheck, ArrowRight, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import StatCard from '@/components/StatCard';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import HierarchicalRoadmapGantt from '@/components/HierarchicalRoadmapGantt';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale } from '@/components/gantt/types';


export default function TestingPage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [scale, setScale] = useState<GanttScale>('days');
  
  // In testing phase, align with Dev: show Story -> QA
  // Only show stories that actually have associated QA tickets
  const stories = useMemo(() => {
    const qaLinks = new Set(tickets.filter((t: any) => t.tier === 'QA').map((t: any) => t.linked_ticket_id));
    return tickets.filter((tk: any) => tk.tier === 'Story' && qaLinks.has(tk.id));
  }, [tickets]);

  return (
    <TicketHandler phaseId="testing" tier="QA">
      {({ 
        filteredTickets: qaTicketsOnly, 
        searchQuery, 
        setSearchQuery, 
        activeFilters, 
        toggleAssigneeFilter, 
        resetFilters,
        temporalBoundaries
      }) => {
        const inReviewCount = qaTicketsOnly.filter(tk => tk.status === 'In Review').length;

        return (
          <LifecyclePageLayout
            phaseId="testing"
            tier="QA"
            title={t('testing')}
            description={t('testing_desc')}
            buttonLabel={t('new_qa')}
            
            sidebarProps={{
              tickets: qaTicketsOnly,
              searchQuery,
              onSearchChange: setSearchQuery,
              activeAssigneeFilters: activeFilters.assignees,
              onToggleAssignee: toggleAssigneeFilter,
              onResetFilters: resetFilters
            }}

            dashboardContent={
              <div className="space-y-12 font-sans">
                {/* Universal Verification Waterfall (QA Only) */}
                <HierarchicalRoadmapGantt 
                  phaseId="testing"
                  parents={[]} 
                  childTickets={qaTicketsOnly} 
                  onSelectTicket={(ticket) => setPhaseSelectedTicket('testing', ticket.id)}
                  parentLabel="Verification"
                  childLabel="QA"
                  scale={scale}
                  onScaleChange={setScale}
                  readOnlyParent={true}
                  isTestingPhase={true}
                  disableExpansion={false}
                  temporalBoundaries={temporalBoundaries}
                />

                {/* Quality Control Dashboard - Unified with Dev Style */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <StatCard 
                    icon={<Activity size={20} />} 
                    label={t('review')} 
                    value={`${inReviewCount} Items`}
                    desc="Verification Pending"
                    color="amber"
                  />
                  <StatCard 
                    icon={<FlaskConical size={20} />} 
                    label={t('qa_cycle')} 
                    value={`${qaTicketsOnly.length} Test Assets`}
                    desc="100% Structural Coverage"
                    color="blue"
                  />
                  <StatCard 
                    icon={<CheckCircle2 size={20} />} 
                    label="Traceability" 
                    value="Synchronized"
                    desc="Every node verified"
                    color="green"
                  />
                </section>

                {/* Verification Queue (QA Only) */}
                <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-2xl transition-colors duration-300 text-left">
                  <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
                        <ShieldCheck size={14} />
                        {t('verification_queue')}
                      </h2>
                  </div>
                  <div className="divide-y divide-border/50">
                      {loading ? (
                        <div className="text-center py-12 text-muted-foreground italic text-xs font-mono animate-pulse tracking-widest uppercase">Building test registry...</div>
                      ) : qaTicketsOnly.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground italic uppercase text-[10px] tracking-widest font-bold opacity-50">No active test assets found.</div>
                      ) : qaTicketsOnly.map(tk => (
                        <div 
                          key={tk.id} 
                          onClick={() => setPhaseSelectedTicket('testing', tk.id)}
                          className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center space-x-5 text-left">
                              <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center text-red-500 border border-border group-hover:scale-105 transition-transform shadow-inner">
                                <FlaskConical size={24} />
                              </div>
                              <div>
                                <div className="font-bold text-lg text-foreground tracking-tight">{tk.title}</div>
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono mt-1.5 uppercase tracking-tighter font-bold opacity-80">
                                   <span className="bg-muted px-1.5 py-0.5 rounded border border-border">{tk.identifier}</span>
                                   <span className="flex items-center gap-1">
                                      <div className={cn("w-1.5 h-1.5 rounded-full", tk.status === 'Done' ? "bg-green-500" : (tk.status === 'In Progress' ? "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.4)]" : "bg-slate-700"))} />
                                      {tk.status}
                                   </span>
                                   <span className="text-red-500/80 font-bold uppercase italic">{tk.linked_ticket_id ? `Verify ${tk.linked_ticket_id}` : 'General Test'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6">
                              <button className="text-[10px] font-bold uppercase px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-500 transition-all shadow-lg active:scale-95">
                                {t('approve_release')}
                              </button>
                              <ArrowRight size={20} className="text-muted-foreground/30 group-hover:text-red-500 transition-colors" />
                            </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            }
          />
        );
      }}
    </TicketHandler>
  );
}

