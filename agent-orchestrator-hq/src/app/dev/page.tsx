'use client';

import React, { useMemo, useState } from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Ticket as TicketIcon,
  ArrowRight,
  Code2,
  Play,
  Database,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getStatusDotClasses } from '@/lib/phaseConfig';
import StatCard from '@/components/StatCard';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import HierarchicalRoadmapGantt from '@/components/HierarchicalRoadmapGantt';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale } from '@/components/gantt/types';


export default function DevelopmentPage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [scale, setScale] = useState<GanttScale>('days');
  
  const stories = useMemo(() => tickets.filter((tk: any) => tk.tier === 'Story'), [tickets]);

  return (
    <TicketHandler phaseId="development" tier="Task">
      {({ 
        filteredTickets, 
        searchQuery, 
        setSearchQuery, 
        activeFilters, 
        toggleAssigneeFilter, 
        resetFilters,
        temporalBoundaries
      }) => {
        const inProgressTasks = filteredTickets.filter(tk => tk.status === 'In Progress');
        
        return (
          <LifecyclePageLayout
            phaseId="development"
            tier="Task"
            title={t('development')}
            description={t('development_desc')}
            buttonLabel={t('new_task')}
            
            sidebarProps={{
              tickets: filteredTickets,
              searchQuery,
              onSearchChange: setSearchQuery,
              activeAssigneeFilters: activeFilters.assignees,
              onToggleAssignee: toggleAssigneeFilter,
              onResetFilters: resetFilters
            }}

            dashboardContent={
              <div className="space-y-12 relative">
                {/* Hierarchical Gantt (Story -> Task) */}
                <HierarchicalRoadmapGantt 
                  phaseId="development"
                  parents={stories}
                  childTickets={filteredTickets}
                  onSelectTicket={(ticket) => setPhaseSelectedTicket('development', ticket.id)}
                  onAddChild={(parent) => console.log("Add Task to Story:", parent.id)}
                  parentLabel="Story"
                  childLabel="Task"
                  scale={scale}
                  onScaleChange={setScale}
                  readOnlyParent={true}
                  temporalBoundaries={temporalBoundaries}
                />

                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <StatCard 
                    icon={<Terminal size={20} />} 
                    label={t('active')} 
                    value={`${inProgressTasks.length} Workers`}
                    desc={t('sandbox_mode')}
                    color="amber"
                  />
                  <StatCard 
                    icon={<Clock size={20} />} 
                    label={t('queue')} 
                    value={`${filteredTickets.filter(tk => tk.status === 'Todo').length} Tasks`}
                    desc="Awaiting Assignment"
                    color="violet"
                  />
                  <StatCard 
                    icon={<CheckCircle2 size={20} />} 
                    label={t('merged')} 
                    value={`${filteredTickets.filter(tk => tk.status === 'Done').length} Verified`}
                    desc="Implementation Verified"
                    color="green"
                  />
                </section>

                {/* Tactical Backlog (Tasks) */}
                <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 transition-colors duration-300 text-left">
                  <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
                      <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
                      <TicketIcon size={14} />
                      {t('implementation_queue')}
                      </h2>
                  </div>
                  <div className="divide-y divide-border/50">
                      {loading ? (
                      <div className="text-center py-12 text-muted-foreground italic font-mono text-xs animate-pulse tracking-widest uppercase">Synchronizing local state...</div>
                      ) : filteredTickets.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground italic uppercase text-[10px] tracking-widest font-bold opacity-50 font-sans">
                          No active implementation tasks in registry.
                      </div>
                      ) : filteredTickets.map(task => (
                      <div 
                          key={task.id} 
                          onClick={() => setPhaseSelectedTicket('development', task.id)}
                          className="p-5 flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-pointer"
                      >
                          <div className="flex items-center space-x-4 text-left">
                          <div className="w-10 h-10 bg-muted rounded-xl flex items-center justify-center text-violet-500 group-hover:scale-110 transition-transform border border-border shadow-lg group-hover:bg-violet-600/5">
                              <Code2 size={20} />
                          </div>
                          <div>
                              <div className="text-sm font-bold text-foreground tracking-tight">{task.title}</div>
                              <div className="flex items-center gap-2 mt-1 text-[9px] text-muted-foreground font-mono tracking-tighter uppercase font-bold opacity-80 font-sans">
                              <span className="bg-muted px-1.5 py-0.5 rounded border border-border">{task.identifier}</span>
                              <span className="flex items-center gap-1">
                                  <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClasses(task.status))} />
                                  {task.status}
                              </span>
                              </div>
                          </div>
                          </div>
                          <div className="flex items-center gap-6">
                          <button className="p-2 bg-violet-600 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg active:scale-95 hover:bg-violet-500">
                              <Play size={14} fill="currentColor" />
                          </button>
                          <ArrowRight size={18} className="text-muted-foreground/30 group-hover:text-violet-500 transition-colors" />
                          </div>
                      </div>
                      ))}
                  </div>
                </div>

                <div className="bg-muted/20 border border-border border-dashed rounded-3xl p-12 text-center space-y-4 opacity-40">
                  <Database size={32} className="mx-auto text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground italic font-mono uppercase tracking-widest leading-loose font-sans text-center">
                      {t('local_volume')}<br/>
                      <span className="text-[8px] opacity-70 font-bold">Internal Volume: /app/data/ticket-manager.db</span>
                  </p>
                </div>
              </div>
            }
          />
        );
      }}
    </TicketHandler>
  );
}

