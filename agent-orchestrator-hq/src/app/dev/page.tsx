'use client';

import React from 'react';
import { 
  Terminal, 
  CheckCircle2, 
  Clock, 
  Ticket as TicketIcon,
  ArrowRight,
  Code2,
  Play,
  Database
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import RoadmapGantt from '@/components/RoadmapGantt';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DevelopmentPage() {
  const { tickets, loading, setPhaseSelectedTicket, t, phaseStates } = useLifecycle();
  
  const filteredIds = phaseStates['development']?.filteredTicketIds;
  const tasks = tickets.filter((tk: any) => tk.tier === 'Task' && (!filteredIds || filteredIds.includes(tk.id)));

  const inProgressTasks = tasks.filter(tk => tk.status === 'In Progress');
  const todoTasks = tasks.filter(tk => tk.status === 'Todo');
  const doneTasks = tasks.filter(tk => tk.status === 'Done');

  const dashboardContent = (
    <div className="space-y-12 relative">
      {/* Main Gantt Roadmap */}
      <RoadmapGantt 
        tickets={tasks} 
        onSelectTicket={(task) => setPhaseSelectedTicket('development', task.id)} 
        scale="days"
      />

      <section className="grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-amber-500/50 hover:border-amber-500/30 transition-colors">
            <div className="flex items-center justify-between text-amber-500 font-mono">
                <Terminal size={20} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('active')}</span>
            </div>
            <div>
                <div className="text-3xl font-bold text-white tracking-tighter italic">{inProgressTasks.length} Workers</div>
                <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter font-sans">{t('sandbox_mode')}</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-blue-600/50 hover:border-blue-500/30 transition-colors font-mono">
            <div className="flex items-center justify-between text-blue-400">
                <Clock size={20} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('queue')}</span>
            </div>
            <div>
                <div className="text-3xl font-bold text-white tracking-tighter italic">{todoTasks.length} Tasks</div>
                <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter font-sans">Awaiting Assignment</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 group hover:border-green-500/30 transition-colors border-l-4 border-l-green-600/50">
            <div className="flex items-center justify-between text-green-500 font-mono">
                <CheckCircle2 size={20} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('merged')}</span>
            </div>
            <div>
                <div className="text-3xl font-bold text-white tracking-tighter italic">{doneTasks.length} {t('active')}</div>
                <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter font-sans">Verified Implementation</p>
            </div>
        </div>
      </section>

      {/* Tactical Backlog (Tasks) */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl shadow-blue-900/5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2 font-mono">
            <TicketIcon size={14} />
            {t('implementation_queue')}
            </h2>
        </div>
        <div className="divide-y divide-slate-800">
            {loading ? (
            <div className="text-center py-12 text-slate-600 italic font-mono text-xs animate-pulse tracking-widest uppercase">Synchronizing local state...</div>
            ) : tasks.length === 0 ? (
            <div className="text-center py-12 border-slate-800 rounded-xl text-slate-600 italic uppercase text-[10px] tracking-widest font-bold opacity-50 font-sans">
                No active implementation tasks in registry.
            </div>
            ) : tasks.map(task => (
            <div 
                key={task.id} 
                onClick={() => setPhaseSelectedTicket('development', task.id)}
                className="p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors group cursor-pointer"
            >
                <div className="flex items-center space-x-4 text-left">
                <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform border border-slate-800 shadow-lg group-hover:border-blue-500/30 group-hover:bg-blue-600/5">
                    <Code2 size={20} />
                </div>
                <div>
                    <div className="text-sm font-bold text-slate-200 tracking-tight">{task.title}</div>
                    <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-500 font-mono tracking-tighter uppercase font-bold opacity-80 font-sans">
                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{task.identifier}</span>
                    <span className="flex items-center gap-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", task.status === 'Done' ? "bg-green-500" : (task.status === 'In Progress' ? "bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]" : "bg-slate-700"))} />
                        {task.status}
                    </span>
                    <span className="text-slate-600 italic lowercase tracking-normal font-normal opacity-60 font-sans leading-none">{t('requirement_fulfillment')}</span>
                    </div>
                </div>
                </div>
                <div className="flex items-center gap-6">
                <button className="p-2 bg-blue-600 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-blue-900/50 active:scale-95 hover:bg-blue-500">
                    <Play size={14} fill="currentColor" />
                </button>
                <ArrowRight size={18} className="text-slate-800 group-hover:text-blue-500 transition-colors" />
                </div>
            </div>
            ))}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-3xl p-12 text-center space-y-4 opacity-40">
        <Database size={32} className="mx-auto text-slate-700" />
        <p className="text-[10px] text-slate-600 italic font-mono uppercase tracking-widest leading-loose font-sans text-center">
            {t('local_volume')}<br/>
            <span className="text-[8px] opacity-70 font-bold">Internal Volume: /app/data/ticket-manager.db</span>
        </p>
      </div>
    </div>
  );

  return (
    <LifecyclePageLayout
      phaseId="development"
      tier="Task"
      title={t('development')}
      description={t('development_desc')}
      buttonLabel={t('new_task')}
      dashboardContent={dashboardContent}
    />
  );
}
