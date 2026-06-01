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
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function InitiativePage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const epics = tickets.filter((tk: any) => tk.tier === 'Epic');

  const activeCount = epics.filter(e => e.status !== 'Done').length;
  const completedCount = epics.filter(e => e.status === 'Done').length;
  const overallProgress = epics.length > 0 ? (completedCount / epics.length) * 100 : 0;

  const dashboardContent = (
    <div className="space-y-12">
      {/* Executive Dashboard Overview */}
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
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div className="h-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition-all duration-1000" style={{ width: `${overallProgress}%` }} />
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

      {/* Strategic Roadmap List */}
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-2 flex items-center gap-2 font-mono">
          <Trophy size={14} />
          {t('roadmap_list')}
        </h2>
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20 text-slate-600 italic font-mono text-xs animate-pulse">Scanning strategic mission control...</div>
          ) : epics.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-600 italic uppercase text-[10px] tracking-widest font-bold opacity-50">
              No active strategic initiatives defined.
            </div>
          ) : epics.map(epic => (
            <div 
              key={epic.id} 
              onClick={() => setPhaseSelectedTicket('initiative', epic.id)}
              className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between hover:border-amber-900/50 hover:bg-amber-900/5 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center space-x-6">
                <div className="w-14 h-14 bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 text-amber-500 group-hover:scale-105 transition-transform shadow-inner">
                  <Target size={28} />
                </div>
                <div>
                  <div className="font-bold text-xl text-slate-100 tracking-tight group-hover:text-amber-400 transition-colors">{epic.title}</div>
                  <div className="flex items-center gap-4 mt-2 text-[10px] text-slate-500 uppercase font-mono tracking-tighter font-bold opacity-80">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800">{epic.identifier}</span>
                    <span className="flex items-center gap-1">
                        <div className={cn("w-2 h-2 rounded-full", epic.status === 'Done' ? "bg-green-500" : "bg-amber-500 animate-pulse")} />
                        {epic.status}
                    </span>
                    <span className="text-slate-700 italic lowercase tracking-normal font-normal opacity-60">{t('strategic_vision')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right hidden md:block space-y-1">
                    <div className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">{t('epic_maturity')}</div>
                    <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-800 shadow-inner">
                      <div className={cn("h-full transition-all duration-700", epic.status === 'Done' ? "bg-green-500 w-full" : "bg-amber-500 w-1/3")} />
                    </div>
                </div>
                <div className="p-2 bg-slate-950 rounded-full border border-slate-800 text-slate-700 group-hover:text-amber-500 group-hover:border-amber-500/50 transition-all group-hover:translate-x-1 shadow-lg">
                    <ArrowRight size={20} />
                </div>
              </div>
            </div>
          ))}
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
      themeColor="text-amber-500"
      decorationColor="decoration-amber-600/30"
      buttonLabel={t('new_epic')}
      buttonColor="bg-amber-600 hover:bg-amber-500 shadow-amber-900/20"
      dashboardContent={dashboardContent}
    />
  );
}
