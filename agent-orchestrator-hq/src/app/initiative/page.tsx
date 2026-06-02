'use client';

import React, { useMemo, useState } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  Target, 
  TrendingUp,
  ArrowRight,
  Flame,
  Zap,
  Plus
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import HierarchicalRoadmapGantt from '@/components/HierarchicalRoadmapGantt';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale } from '@/components/gantt/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function InitiativePage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [scale, setScale] = useState<GanttScale>('months');
  
  // Initiative phase focuses on Initiative tier as parents, Epics as children
  const initiatives = useMemo(() => tickets.filter((tk: any) => tk.tier === 'Initiative'), [tickets]);

  return (
    <TicketHandler phaseId="initiative" tier="Epic">
      {({ 
        filteredTickets: epics, 
        searchQuery, 
        setSearchQuery, 
        activeFilters, 
        toggleAssigneeFilter, 
        resetFilters,
        temporalBoundaries
      }) => (
        <LifecyclePageLayout
          phaseId="initiative"
          tier="Epic"
          title={t('initiative')}
          description={t('initiative_desc')}
          buttonLabel={t('new_epic')}
          
          sidebarProps={{
            tickets: epics,
            searchQuery,
            onSearchChange: setSearchQuery,
            activeAssigneeFilters: activeFilters.assignees,
            onToggleAssignee: toggleAssigneeFilter,
            onResetFilters: resetFilters
          }}

          dashboardContent={
            <div className="space-y-12">
              {/* Strategic Gantt (Initiative -> Epic) */}
              <HierarchicalRoadmapGantt 
                phaseId="initiative"
                parents={initiatives}
                childTickets={epics}
                onSelectTicket={(ticket) => setPhaseSelectedTicket('initiative', ticket.id)}
                parentLabel="Initiative"
                childLabel="Epic"
                scale={scale}
                onScaleChange={setScale}
                readOnlyParent={true}
                temporalBoundaries={temporalBoundaries}
              />

              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <StatCard 
                  icon={<Trophy size={20} />} 
                  label={t('strategic_progress')} 
                  value={`${epics.filter(e => e.status === 'Done').length}/${epics.length}`}
                  desc={t('strategic_vision')}
                  color="amber"
                />
                <StatCard 
                  icon={<Target size={20} />} 
                  label="Epic Velocity" 
                  value="4.2 / mo"
                  desc="Throughput Analysis"
                  color="blue"
                />
                <StatCard 
                  icon={<TrendingUp size={20} />} 
                  label="Impact Score" 
                  value="98.2%"
                  desc="Mission Alignment"
                  color="green"
                />
              </section>

              {/* Strategic Roadmap List */}
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-2 flex items-center gap-2 font-mono italic">
                  <Flame size={14} className="text-amber-500" />
                  {t('roadmap_list')}
                </h2>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-20 text-muted-foreground italic font-mono text-xs animate-pulse tracking-widest uppercase">Analyzing strategic vector...</div>
                  ) : epics.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl text-muted-foreground italic uppercase text-[10px] tracking-widest font-bold opacity-50 font-sans">
                      No strategic epics identified in the current horizon.
                    </div>
                  ) : epics.map(epic => (
                    <div 
                      key={epic.id} 
                      onClick={() => setPhaseSelectedTicket('initiative', epic.id)}
                      className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between hover:border-amber-500/30 transition-all cursor-pointer group shadow-lg"
                    >
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-inner border border-amber-500/20 font-bold text-xl">
                          <Zap size={22} />
                        </div>
                        <div>
                          <div className="font-bold text-lg text-foreground tracking-tight">{epic.title}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground uppercase font-mono tracking-tighter font-bold opacity-80 font-sans">
                            <span className="bg-muted px-1.5 py-0.5 rounded border border-border">{epic.identifier}</span>
                            <span className="flex items-center gap-1">
                                <div className={cn("w-1.5 h-1.5 rounded-full", epic.status === 'Done' ? "bg-green-500" : (epic.status === 'In Progress' ? "bg-amber-500" : "bg-slate-700"))} />
                                {epic.status}
                            </span>
                            <span className="text-amber-500/80 italic lowercase tracking-normal font-normal opacity-60 font-sans leading-none">{t('epic_maturity')}</span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-muted-foreground group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
                    </div>
                  ))}
                </div>
              </section>
            </div>
          }
        />
      )}
    </TicketHandler>
  );
}

function StatCard({ icon, label, value, desc, color }: { icon: any, label: string, value: string, desc: string, color: 'amber'|'blue'|'green' }) {
   const colors = {
      amber: "text-amber-500 border-amber-500/20",
      blue: "text-blue-500 border-blue-500/20",
      green: "text-green-500 border-green-500/20"
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
