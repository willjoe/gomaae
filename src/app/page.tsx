'use client';

import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  ArrowRight,
  LayoutGrid,
  GanttChartSquare,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getStatusDotClasses } from '@/lib/phaseConfig';
import StatCard from '@/components/StatCard';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import HierarchicalRoadmapGantt from '@/components/HierarchicalRoadmapGantt';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale } from '@/components/gantt/types';

const BOARD_COLUMNS = [
  { id: 'Backlog',   label: 'Backlog',     color: 'border-muted-foreground/30 text-muted-foreground' },
  { id: 'Todo',      label: 'Todo',        color: 'border-blue-500/40 text-blue-400' },
  { id: 'In Progress', label: 'In Progress', color: 'border-amber-500/40 text-amber-400' },
  { id: 'In Review', label: 'In Review',   color: 'border-violet-500/40 text-violet-400' },
  { id: 'Done',      label: 'Done',        color: 'border-green-500/40 text-green-400' },
] as const;

function KanbanBoard({ stories, onSelect }: { stories: any[]; onSelect: (id: string) => void }) {
  const byStatus = useMemo(() => {
    const map: Record<string, any[]> = {};
    BOARD_COLUMNS.forEach(c => { map[c.id] = []; });
    stories.forEach(s => {
      const col = BOARD_COLUMNS.find(c => c.id === s.status)?.id ?? 'Backlog';
      map[col].push(s);
    });
    return map;
  }, [stories]);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[420px]">
      {BOARD_COLUMNS.map(col => (
        <div key={col.id} className="flex-shrink-0 w-64">
          <div className={cn('flex items-center gap-2 mb-3 px-1 pb-2 border-b-2', col.color)}>
            <span className="text-[10px] font-bold uppercase tracking-widest font-mono">{col.label}</span>
            <span className="ml-auto text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
              {byStatus[col.id].length}
            </span>
          </div>
          <div className="space-y-2">
            {byStatus[col.id].length === 0 && (
              <div className="text-center py-8 text-[10px] text-muted-foreground/40 uppercase tracking-widest font-mono italic border border-dashed border-border rounded-xl">
                Empty
              </div>
            )}
            {byStatus[col.id].map(story => (
              <div
                key={story.id}
                onClick={() => onSelect(story.id)}
                className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-blue-500/40 hover:shadow-md transition-all group"
              >
                <div className="text-sm font-semibold text-foreground leading-snug group-hover:text-blue-400 transition-colors line-clamp-2">
                  {story.title}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[9px] font-mono font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border uppercase">
                    {story.identifier}
                  </span>
                  {story.assignee && (
                    <span className="text-[9px] text-muted-foreground truncate max-w-[80px]">{story.assignee}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PlanningPage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [scale, setScale] = useState<GanttScale>('weeks');
  const [view, setView] = useState<'gantt' | 'board'>('gantt');

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
              {/* View toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit border border-border">
                <button
                  onClick={() => setView('gantt')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    view === 'gantt'
                      ? 'bg-background text-foreground shadow border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <GanttChartSquare size={13} />
                  Gantt
                </button>
                <button
                  onClick={() => setView('board')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    view === 'board'
                      ? 'bg-background text-foreground shadow border border-border'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <LayoutGrid size={13} />
                  Board
                </button>
              </div>

              {view === 'gantt' ? (
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
              ) : (
                <section className="animate-in fade-in duration-200">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-1 mb-4 flex items-center gap-2 font-mono italic">
                    <LayoutGrid size={14} className="text-blue-500" />
                    Story Board
                  </h2>
                  {loading ? (
                    <div className="text-center py-20 text-muted-foreground italic font-mono text-xs animate-pulse tracking-widest uppercase">Loading stories...</div>
                  ) : (
                    <KanbanBoard
                      stories={filteredTickets}
                      onSelect={(id) => setPhaseSelectedTicket('planning', id)}
                    />
                  )}
                </section>
              )}

              {/* Stats */}
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <StatCard
                  icon={<Layers size={20} />}
                  label={t('draft')}
                  value={`${filteredTickets.filter(s => s.status === 'Todo').length} Stories`}
                  desc="Awaiting Breakdown"
                  color="blue"
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

              {/* Requirement Map (list view — visible in both modes) */}
              <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
                <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-2 flex items-center gap-2 font-mono italic">
                  <BookOpen size={14} className="text-blue-500" />
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
                      className="bg-card border border-border p-5 rounded-2xl flex items-center justify-between hover:border-blue-500/30 transition-all cursor-pointer group shadow-lg"
                    >
                      <div className="flex items-center space-x-5">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all shadow-inner border border-blue-500/20 font-bold text-xl">
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
                      <ArrowRight size={18} className="text-muted-foreground group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
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
