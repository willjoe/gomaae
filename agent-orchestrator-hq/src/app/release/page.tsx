'use client';

import React, { useMemo, useState } from 'react';
import { Rocket, Globe, PackageCheck, Activity, TrendingUp, ArrowRight, AlertCircle, Plus } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import RoadmapGantt from '@/components/RoadmapGantt';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale } from '@/components/gantt/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ReleasePage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [scale, setScale] = useState<GanttScale>('days');
  
  const shippedTickets = useMemo(() => tickets.filter((tk: any) => tk.tier === 'Triage' && tk.status === 'Done'), [tickets]);
  const productionDone = shippedTickets.length;

  return (
    <TicketHandler phaseId="release" tier="Triage">
      {({ 
        filteredTickets: triageTickets, 
        searchQuery, 
        setSearchQuery, 
        activeFilters, 
        toggleAssigneeFilter, 
        resetFilters,
        temporalBoundaries
      }) => {
        const triagePending = triageTickets.filter(tk => tk.status !== 'Done').length;

        return (
          <LifecyclePageLayout
            phaseId="release"
            tier="Triage"
            title={t('operation')}
            description={t('operation_desc')}
            buttonLabel={t('new_triage')}
            
            sidebarProps={{
              tickets: triageTickets,
              searchQuery,
              onSearchChange: setSearchQuery,
              activeAssigneeFilters: activeFilters.assignees,
              onToggleAssignee: toggleAssigneeFilter,
              onResetFilters: resetFilters
            }}

            dashboardContent={
              <div className="space-y-12 font-sans">
                {/* Maintenance Gantt (Decoupled from Sidebar via TicketHandler) */}
                <RoadmapGantt
                  tickets={triageTickets}
                  onSelectTicket={(tk: any) => setPhaseSelectedTicket('release', tk.id)}
                  scale={scale}
                  onScaleChange={setScale}
                  temporalBoundaries={temporalBoundaries}
                  phaseId="release"
                />

                {/* Operation Status Dashboard */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <StatCard 
                    icon={<TrendingUp size={20} />} 
                    label={t('production')} 
                    value={`${productionDone} Artifacts`}
                    desc="Live Systems Healthy"
                    color="green"
                  />
                  <StatCard 
                    icon={<Activity size={20} />} 
                    label={t('feedback')} 
                    value={`${triagePending} Triage`}
                    desc="Intake Review Pending"
                    color="orange"
                  />
                  <StatCard 
                    icon={<Globe size={20} />} 
                    label="Global" 
                    value="99.98%"
                    desc={t('global_uptime')}
                    color="blue"
                  />
                </section>

                {/* Production History */}
                <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl transition-colors duration-300 text-left">
                  <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
                        <PackageCheck size={14} />
                        {t('live_artifacts')}
                      </h2>
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded tracking-tighter uppercase font-mono italic">Production Release Active</span>
                  </div>
                  <div className="divide-y divide-border/50 text-sm">
                      {loading ? (
                        <div className="text-center py-12 text-muted-foreground italic text-xs font-mono animate-pulse tracking-widest uppercase">Monitoring production signals...</div>
                      ) : shippedTickets.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground italic font-sans">No production history found.</div>
                      ) : shippedTickets.map(tk => (
                        <div 
                          key={tk.id} 
                          onClick={() => setPhaseSelectedTicket('release', tk.id)}
                          className="p-6 flex items-center justify-between hover:bg-green-500/5 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center space-x-5 text-left">
                              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 border border-green-500/20 group-hover:scale-110 transition-transform shadow-lg">
                                <Rocket size={24} />
                              </div>
                              <div>
                                <div className="font-bold text-lg text-foreground tracking-tight">{tk.title}</div>
                                <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter font-bold opacity-80">{tk.identifier} • Released to Public</div>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-8">
                              <div className="hidden sm:block">
                                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-right mb-1">{t('stability')}</div>
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    <span className="text-[10px] text-green-500 font-mono font-bold tracking-tighter uppercase">Live</span>
                                  </div>
                              </div>
                              <ArrowRight size={20} className="text-muted-foreground/30 group-hover:text-green-500 transition-all group-hover:translate-x-1" />
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

function StatCard({ icon, label, value, desc, color }: { icon: any, label: string, value: string, desc: string, color: 'green'|'orange'|'blue' }) {
   const colors = {
      green: "text-green-500 border-green-500/20",
      orange: "text-orange-500 border-orange-500/20",
      blue: "text-blue-500 border-blue-500/20"
   };
   return (
      <div className={cn("bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl border-l-4", colors[color])}>
         <div className="flex items-center justify-between opacity-80">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-muted rounded border border-border font-mono">{label}</span>
         </div>
         <div>
            <div className="text-3xl font-bold text-foreground tracking-tighter italic">{value}</div>
            <p className="text-muted-foreground text-[10px] mt-1 uppercase font-bold tracking-tighter">{desc}</p>
         </div>
      </div>
   );
}
