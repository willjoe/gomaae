'use client';

import React from 'react';
import { Rocket, Globe, PackageCheck, Activity, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import RoadmapGantt from '@/components/RoadmapGantt';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ReleasePage() {
  const { tickets, loading, setPhaseSelectedTicket, t, phaseStates } = useLifecycle();
  
  const filteredIds = phaseStates['release']?.filteredTicketIds;
  const shippedTickets = tickets.filter((tk: any) => (tk.status === 'Done' || tk.tier === 'Triage') && (!filteredIds || filteredIds.includes(tk.id)));
  
  const productionDone = shippedTickets.filter(tk => tk.status === 'Done').length;
  const triagePending = shippedTickets.filter(tk => tk.tier === 'Triage').length;

  const dashboardContent = (
    <div className="space-y-12 font-sans">
      {/* Main Gantt Roadmap */}
      <RoadmapGantt 
        tickets={shippedTickets} 
        onSelectTicket={(tk) => setPhaseSelectedTicket('release', tk.id)} 
        scale="weeks"
      />

      {/* Operation Status Dashboard */}
      <section className="grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-green-500/50 hover:border-green-500/30 transition-colors">
            <div className="flex items-center justify-between text-green-500">
              <TrendingUp size={20} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono">{t('production')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{productionDone} Artifacts</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">Live Systems Healthy</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-orange-500/50 hover:border-orange-500/30 transition-colors">
            <div className="flex items-center justify-between text-orange-500">
              <Activity size={20} />
              <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest px-2 py-0.5 bg-orange-950/20 rounded border border-orange-900/30 font-mono">{t('feedback')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{triagePending} Triage</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">Pending Intake Review</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 group hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between text-blue-500">
              <Globe size={20} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono">Global</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">99.98%</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter font-sans">{t('global_uptime')}</p>
            </div>
        </div>
      </section>

      {/* Production History */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl shadow-orange-900/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 font-mono">
              <PackageCheck size={14} />
              {t('live_artifacts')}
            </h2>
            <span className="text-[10px] text-green-500 font-bold bg-green-900/20 px-2 py-0.5 rounded tracking-tighter uppercase font-mono italic font-sans text-right">Production Release Active</span>
        </div>
        <div className="divide-y divide-slate-800 text-sm text-left">
            {loading ? (
              <div className="text-center py-12 text-slate-600 italic text-xs font-mono animate-pulse tracking-widest uppercase">Monitoring production signals...</div>
            ) : shippedTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-600 italic font-sans">No production history found.</div>
            ) : shippedTickets.filter(tk => tk.status === 'Done').map(tk => (
              <div 
                key={tk.id} 
                onClick={() => setPhaseSelectedTicket('release', tk.id)}
                className="p-6 flex items-center justify-between hover:bg-green-900/5 transition-colors group cursor-pointer"
              >
                  <div className="flex items-center space-x-5 text-left">
                    <div className="w-12 h-12 bg-green-600/10 rounded-full flex items-center justify-center text-green-500 border border-green-900/30 group-hover:scale-110 transition-transform shadow-lg shadow-green-950/20">
                      <Rocket size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-100 tracking-tight">{tk.title}</div>
                      <div className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-tighter font-bold opacity-80">{tk.identifier} • Released to Public</div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-8">
                    <div className="hidden sm:block">
                        <div className="text-[10px] text-slate-600 font-bold uppercase tracking-widest text-right mb-1">{t('stability')}</div>
                        <div className="flex items-center gap-1.5 justify-end">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                          <span className="text-[10px] text-green-500 font-mono font-bold tracking-tighter uppercase">Live</span>
                        </div>
                    </div>
                    <ArrowRight size={20} className="text-slate-800 group-hover:text-green-500 transition-all group-hover:translate-x-1" />
                  </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <LifecyclePageLayout
      phaseId="release"
      tier="Triage"
      title={t('operation')}
      description={t('operation_desc')}
      buttonLabel={t('new_triage')}
      dashboardContent={dashboardContent}
    />
  );
}
