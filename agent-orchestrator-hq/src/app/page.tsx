'use client';

import React, { useMemo, useState } from 'react';
import { 
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  ArrowRight,
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


export default function PlanningPage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [scale, setScale] = useState<GanttScale>('weeks');
  
  const epics = useMemo(() => tickets.filter((tk: any) => tk.tier === 'Epic'), [tickets]);

  return (
    <TicketHandler phaseId="planning" tier="Story">
      {({ 
        filteredTickets, 
        searchQuery, 
        setSearchQuery, 
        activeFilters, 
        toggleAssigneeFilter, 
        resetFilters,
        temporalBoundaries
      }) => (
        <LifecyclePageLayout
          phaseId="planning"
          tier="Story"
          title={t('planning')}
          description={t('planning_desc')}
          buttonLabel={t('new_story')}
          
          sidebarProps={{
            tickets: filteredTickets,
            searchQuery,
            onSearchChange: setSearchQuery,
            activeAssigneeFilters: activeFilters.assignees,
            onToggleAssignee: toggleAssigneeFilter,
            onResetFilters: resetFilters
          }}

          dashboardContent={
            <div className="space-y-12">
              {/* Decoupled Gantt with Unified View Switcher */}
              <HierarchicalRoadmapGantt 
                phaseId="planning"
                parents={epics}
                childTickets={filteredTickets}
                onSelectTicket={(ticket) => setPhaseSelectedTicket('planning', ticket.id)}
                onAddChild={(parent) => console.log("Add Story to Epic:", parent.id)}
                parentLabel="Epic"
                childLabel="Story"
                scale={scale}
                onScaleChange={setScale}
                readOnlyParent={true}
                temporalBoundaries={temporalBoundaries}
              />

              {/* Functional Planning Dashboard */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <StatCard 
                  icon={<Layers size={20} />} 
                  label={t('draft')} 
                  value={`${filteredTickets.filter(s => s.status === 'Todo').length} Stories`}
                  desc="Awaiting Breakdown"
                  color="violet"
                />
                <StatCard 
                  icon={<Clock size={20} />} 
                  label={t('validation')} 
                  value={`${filteredTickets.filter(s => s.status === 'In Review').length} In QA`}
                  desc="Approval Pending"
                  color="pink"
                />
                <StatCard 
                  icon={<CheckCircle2 size={20} />} 
                  label={t('finalized')} 
                  value={`${filteredTickets.filter(s => s.status === 'Done').length} Built`}
                  desc="Merged to Trunk"
                  color="green"
                />
              </section>

              {/* Functional Backlog Section */}
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-2 flex items-center gap-2 font-mono italic">
                  <BookOpen size={14} className="text-violet-500" />
                  {t('requirement_map')}
                </h2>
                <div className="space-y-3">
                  {loading ? (
                    <div className="text-center py-20 text-muted-foreground italic font-mono text-xs animate-pulse tracking-widest uppercase">Mapping functional requirements...</div>
                  ) : filteredTickets.length === 0 ? (
                    <div className="text-center py-20 border-2 border-dashed border-border rounded-3xl text-muted-foreground italic uppercase text-[10px] tracking-widest font-bold opacity-50 font-sans">
                      No stories mapped to current project objectives.
                    </div>
                  ) : filteredTickets.map(story => (
                    <div 
                      key={story.id} 
                      onClick={() => setPhaseSelectedTicket('planning', story.id)}
                      className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between hover:border-violet-500/30 transition-all cursor-pointer group shadow-lg"
                    >
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-violet-500/10 rounded-xl flex items-center justify-center text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-all shadow-inner border border-violet-500/20 font-bold text-xl">
                          <Layers size={22} />
                        </div>
                        <div>
                          <div className="font-bold text-lg text-foreground tracking-tight">{story.title}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-[9px] text-muted-foreground uppercase font-mono tracking-tighter font-bold opacity-80 font-sans">
                            <span className="bg-muted px-1.5 py-0.5 rounded border border-border">{story.identifier}</span>
                            <span className="flex items-center gap-1">
                                <div className={cn("w-1.5 h-1.5 rounded-full", getStatusDotClasses(story.status))} />
                                {story.status}
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight size={18} className="text-muted-foreground group-hover:text-violet-500 transition-all group-hover:translate-x-1" />
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

