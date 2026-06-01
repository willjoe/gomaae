'use client';

import React from 'react';
import { FlaskConical, Activity, CheckCircle2, Clock, ShieldCheck, Video, ArrowRight } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import RoadmapGantt from '@/components/RoadmapGantt';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TestingPage() {
  const { tickets, loading, setPhaseSelectedTicket, t, phaseStates } = useLifecycle();
  
  const filteredIds = phaseStates['testing']?.filteredTicketIds;
  const testTickets = tickets.filter((tk: any) => (tk.status === 'In Review' || tk.tier === 'QA') && (!filteredIds || filteredIds.includes(tk.id)));
  
  const inReviewCount = testTickets.filter(tk => tk.status === 'In Review').length;
  const qaCount = testTickets.filter(tk => tk.tier === 'QA').length;

  const dashboardContent = (
    <div className="space-y-12 font-sans">
      {/* Main Gantt Roadmap */}
      <RoadmapGantt 
        tickets={testTickets} 
        onSelectTicket={(tk) => setPhaseSelectedTicket('testing', tk.id)} 
        scale="days"
      />

      {/* Quality Control Dashboard */}
      <section className="grid grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-pink-500/50 hover:border-pink-500/30 transition-colors">
            <div className="flex items-center justify-between text-pink-400">
              <Activity size={20} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono">{t('review')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{inReviewCount} Items</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">Pending Approval</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-purple-500/50 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center justify-between text-purple-400">
              <FlaskConical size={20} />
              <span className="text-[10px] font-bold text-purple-500 uppercase tracking-widest px-2 py-0.5 bg-purple-950/20 rounded border border-purple-900/30 font-mono">{t('qa_cycle')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{qaCount} QA Tickets</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">Verification Logs</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 group hover:border-green-500/30 transition-colors border-l-4 border-l-green-600/50">
            <div className="flex items-center justify-between text-green-500">
              <CheckCircle2 size={20} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono">{t('passed')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">98.4% {t('score')}</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">{t('system_reliability')}</p>
            </div>
        </div>
      </section>

      {/* Verification Queue */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl shadow-pink-900/5">
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 font-mono">
              <ShieldCheck size={14} />
              {t('verification_queue')}
            </h2>
        </div>
        <div className="divide-y divide-slate-800">
            {loading ? (
              <div className="text-center py-12 text-slate-600 italic text-xs font-mono animate-pulse tracking-widest uppercase">Running quality gates...</div>
            ) : testTickets.length === 0 ? (
              <div className="text-center py-12 text-slate-600 italic uppercase text-[10px] tracking-widest font-bold opacity-50">No tickets currently in validation.</div>
            ) : testTickets.map(tk => (
              <div 
                key={tk.id} 
                onClick={() => setPhaseSelectedTicket('testing', tk.id)}
                className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-colors group cursor-pointer"
              >
                  <div className="flex items-center space-x-5 text-left">
                    <div className="w-12 h-12 bg-pink-600/10 rounded-xl flex items-center justify-center text-pink-500 border border-pink-900/30 group-hover:scale-105 transition-transform shadow-inner">
                      <FlaskConical size={24} />
                    </div>
                    <div>
                      <div className="font-bold text-lg text-slate-100 tracking-tight">{tk.title}</div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-1.5 uppercase tracking-tighter font-bold opacity-80">
                         <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{tk.identifier}</span>
                         <span className="flex items-center gap-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full", tk.status === 'Done' ? "bg-green-500" : "bg-pink-500 animate-pulse")} />
                            {tk.status}
                         </span>
                         <span className="text-slate-600 italic lowercase tracking-normal font-normal opacity-60">{t('feature_verification')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <button className="text-[10px] font-bold uppercase px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-500 transition-all shadow-lg shadow-pink-900/40 active:scale-95">
                      {t('approve_release')}
                    </button>
                    <ArrowRight size={20} className="text-slate-800 group-hover:text-pink-500 transition-colors" />
                  </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );

  return (
    <LifecyclePageLayout
      phaseId="testing"
      tier="QA"
      title={t('testing')}
      description={t('testing_desc')}
      buttonLabel={t('new_qa')}
      dashboardContent={dashboardContent}
    />
  );
}
