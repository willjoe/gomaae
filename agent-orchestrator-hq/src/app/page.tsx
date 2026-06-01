'use client';

import React from 'react';
import { 
  CheckCircle2,
  Clock,
  BookOpen,
  Layers,
  ArrowRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PlanningPage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const stories = tickets.filter((tk: any) => tk.tier === 'Story');

  const draftStories = stories.filter(s => s.status === 'Todo');
  const inReviewStories = stories.filter(s => s.status === 'In Review');
  const doneStories = stories.filter(s => s.status === 'Done');

  const dashboardContent = (
    <div className="space-y-12">
      {/* Functional Planning Dashboard */}
      <section className="grid grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-indigo-400/50 hover:border-indigo-400/30 transition-colors">
            <div className="flex items-center justify-between text-indigo-400">
              <Layers size={20} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono">{t('draft')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{draftStories.length} Stories</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">Awaiting Technical Breakdown</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 border-l-4 border-l-pink-500/50 hover:border-pink-500/30 transition-colors">
            <div className="flex items-center justify-between text-pink-400">
              <Clock size={20} />
              <span className="text-[10px] font-bold text-pink-500 uppercase tracking-widest px-2 py-0.5 bg-pink-950/20 rounded border border-pink-900/30 font-mono">{t('validation')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{inReviewStories.length} In QA</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">Pending Feature Approval</p>
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl shadow-black/20 group hover:border-green-500/30 transition-colors border-l-4 border-l-green-600/50">
            <div className="flex items-center justify-between text-green-500">
              <CheckCircle2 size={20} />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-0.5 bg-slate-950 rounded border border-slate-800 font-mono">{t('finalized')}</span>
            </div>
            <div>
              <div className="text-3xl font-bold text-white tracking-tighter italic">{doneStories.length} Built</div>
              <p className="text-slate-500 text-[10px] mt-1 uppercase font-bold tracking-tighter">Merged into Master Trunk</p>
            </div>
        </div>
      </section>

      {/* Functional Backlog Section */}
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 px-2 flex items-center gap-2 font-mono font-bold italic">
          <BookOpen size={14} className="text-indigo-400" />
          {t('requirement_map')}
        </h2>
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-20 text-slate-600 italic font-mono text-xs animate-pulse tracking-widest uppercase">Mapping functional requirements...</div>
          ) : stories.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-3xl text-slate-600 italic uppercase text-[10px] tracking-widest font-bold opacity-50 font-sans">
              No stories mapped to current project objectives.
            </div>
          ) : stories.map(story => (
            <div 
              key={story.id} 
              onClick={() => setPhaseSelectedTicket('planning', story.id)}
              className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between hover:border-indigo-900/50 hover:bg-indigo-900/5 transition-all cursor-pointer group shadow-lg"
            >
              <div className="flex items-center space-x-5">
                <div className="w-12 h-12 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-500 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner border border-indigo-900/20 font-bold text-xl">
                  <Layers size={22} />
                </div>
                <div>
                  <div className="font-bold text-lg text-slate-100 tracking-tight">{story.title}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[9px] text-slate-500 uppercase font-mono tracking-tighter font-bold opacity-80 font-sans">
                    <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">{story.identifier}</span>
                    <span className="flex items-center gap-1">
                        <div className={cn("w-1.5 h-1.5 rounded-full", story.status === 'Done' ? "bg-green-500" : (story.status === 'In Review' ? "bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]" : "bg-slate-700"))} />
                        {story.status}
                    </span>
                    <span className="text-indigo-500/80 italic lowercase tracking-normal font-normal opacity-60 font-sans leading-none">{t('requirement_locked')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="p-2 bg-slate-950 rounded-full border border-slate-800 text-slate-700 group-hover:text-indigo-400 group-hover:border-indigo-500/50 transition-all group-hover:translate-x-1 shadow-lg">
                    <ArrowRight size={18} />
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
      phaseId="planning"
      tier="Story"
      title={t('planning')}
      description={t('planning_desc')}
      themeColor="text-indigo-400"
      decorationColor="decoration-indigo-600/30"
      buttonLabel={t('new_story')}
      buttonColor="bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20"
      dashboardContent={dashboardContent}
    />
  );
}
