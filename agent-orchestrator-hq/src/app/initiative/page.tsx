'use client';

import React from 'react';
import { 
  Trophy,
  TrendingUp,
  Activity,
  CheckCircle2,
  Target,
  ArrowRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import RoadmapGantt from '@/components/RoadmapGantt';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function InitiativePage() {
  const { tickets, setPhaseSelectedTicket, t, phaseStates } = useLifecycle();
  
  const filteredIds = phaseStates['initiative']?.filteredTicketIds;
  const epics = tickets.filter((tk: any) => tk.tier === 'Epic' && (!filteredIds || filteredIds.includes(tk.id)));

  const activeCount = epics.filter(e => e.status !== 'Done').length;
  const completedCount = epics.filter(e => e.status === 'Done').length;
  const overallProgress = epics.length > 0 ? (completedCount / epics.length) * 100 : 0;

  const dashboardContent = (
    <div className="space-y-12">
      {/* Main Gantt Roadmap */}
      <RoadmapGantt 
        tickets={epics} 
        onSelectTicket={(epic) => setPhaseSelectedTicket('initiative', epic.id)} 
      />

      {/* Executive Summary Row */}
      <section className="grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-amber-500/50 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-amber-600/10 border border-amber-500/20 text-amber-500">
                  <TrendingUp size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('velocity')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{t('strategic_progress')}</div>
              <div className="flex items-end gap-2 mt-1">
                  <span className="text-amber-500 font-bold text-xl">{Math.round(overallProgress)}%</span>
                  <span className="text-slate-500 text-[10px] mb-1 uppercase font-bold tracking-tighter font-mono">{t('completion_rate')}</span>
              </div>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-blue-600/50 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-400">
                  <Activity size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('status')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{activeCount} {t('active')}</div>
              <div className="flex items-end gap-2 mt-1">
                  <span className="text-blue-400 font-bold text-xl">{epics.length}</span>
                  <span className="text-slate-500 text-[10px] mb-1 uppercase font-bold tracking-tighter font-mono">{t('total')} Epics</span>
              </div>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 group hover:border-green-500/30 transition-colors border-l-4 border-l-green-600/50">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-xl bg-green-600/10 border border-green-500/20 text-green-500">
                  <CheckCircle2 size={20} />
              </div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('history')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{completedCount} {t('shipped')}</div>
              <div className="flex items-end gap-2 mt-1">
                  <span className="text-green-500 font-bold text-xl">{completedCount}</span>
                  <span className="text-slate-500 text-[10px] mb-1 uppercase font-bold tracking-tighter font-mono">Archived</span>
              </div>
            </div>
        </div>
      </section>
    </div>
  );

  return (
    <LifecyclePageLayout
      phaseId="initiative"
      tier="Epic"
      title={t('initiative')}
      description={t('initiative_desc')}
      buttonLabel={t('new_epic')}
      dashboardContent={dashboardContent}
    />
  );
}
