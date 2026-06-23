'use client';

import React, { useState, useMemo } from 'react';
import { 
  X, 
  ChevronRight, 
  Lightbulb, 
  Search, 
  Target, 
  Scale, 
  LineChart,
  Bot,
  Rocket
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';


export type PillarId = 'problem' | 'market' | 'solution' | 'entry' | 'feasibility' | 'roi';

export interface PillarData {
  problem: string;
  market: string;
  solution: string;
  entry: string;
  feasibility: string;
  roi: string;
}

interface StrategicPillarWizardProps {
  pillarId: PillarId;
  initialData: string;
  onSave: (id: PillarId, data: string) => void;
  onClose: () => void;
  score?: number;
  feedback?: string;
}

const scoreColor = (score: number, lightness = 45) => `hsl(${Math.round(Math.max(0, Math.min(100, score)) * 1.2)}, 70%, ${lightness}%)`;

export default function StrategicPillarWizard({ pillarId, initialData, onSave, onClose, score, feedback }: StrategicPillarWizardProps) {
  const { t } = useLifecycle();
  const [content, setContent] = useState(initialData);

  const pillarConfig = useMemo(() => ({
    problem: {
      title: t('pillar_problem'),
      subtitle: t('pillar_problem_sub'),
      icon: <Lightbulb size={24} />,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      prompt: t('pillar_problem_prompt'),
      placeholder: t('pillar_problem_placeholder')
    },
    market: {
      title: t('pillar_market'),
      subtitle: t('pillar_market_sub'),
      icon: <Search size={24} />,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      prompt: t('pillar_market_prompt'),
      placeholder: t('pillar_market_placeholder')
    },
    solution: {
      title: t('pillar_solution'),
      subtitle: t('pillar_solution_sub'),
      icon: <Target size={24} />,
      color: 'text-indigo-500',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      prompt: t('pillar_solution_prompt'),
      placeholder: t('pillar_solution_placeholder')
    },
    entry: {
      title: t('pillar_entry'),
      subtitle: t('pillar_entry_sub'),
      icon: <Rocket size={24} />,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
      border: 'border-pink-500/20',
      prompt: t('pillar_entry_prompt'),
      placeholder: t('pillar_entry_placeholder')
    },
    feasibility: {
      title: t('pillar_feasibility'),
      subtitle: t('pillar_feasibility_sub'),
      icon: <Scale size={24} />,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      prompt: t('pillar_feasibility_prompt'),
      placeholder: t('pillar_feasibility_placeholder')
    },
    roi: {
      title: t('pillar_roi'),
      subtitle: t('pillar_roi_sub'),
      icon: <LineChart size={24} />,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      prompt: t('pillar_roi_prompt'),
      placeholder: t('pillar_roi_placeholder')
    }
  }), [t]);

  const config = pillarConfig[pillarId];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-full overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-inner border", config.bg, config.color, config.border)}>
                 {config.icon}
              </div>
              <div>
                 <h2 className="text-xl font-bold tracking-tight text-foreground">{config.title}</h2>
                 <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{config.subtitle}</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors">
              <X size={20} />
           </button>
        </div>

        {/* Wizard Body */}
        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">

           {/* AI score + feedback reflecting how thought-through this pillar is. */}
           {typeof score === 'number' && (
             <div className="rounded-2xl p-4 border border-border bg-muted/30 flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white shrink-0 shadow" style={{ background: scoreColor(score) }}>
                   {score}
                </div>
                <div className="space-y-1">
                   <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: scoreColor(score, 38) }}>
                      Strategy Score · {score}/100
                   </div>
                   <p className="text-xs text-foreground/80 leading-relaxed">{feedback || 'No feedback yet.'}</p>
                </div>
             </div>
           )}

           <div className="bg-muted/50 border border-border rounded-2xl p-5 flex gap-4">
              <Bot size={24} className="text-indigo-500 shrink-0 mt-1" />
              <div className="space-y-1">
                 <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{t('pillar_prompt_label')}</div>
                 <p className="text-sm text-foreground italic leading-relaxed">{config.prompt}</p>
                 <p className="text-xs text-muted-foreground mt-2 font-mono">Note: Use Markdown. The first line will be extracted as the pillar's one-sentence summary.</p>
              </div>
           </div>

           <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1">{t('pillar_draft_label')}</label>
              <textarea 
                 value={content}
                 onChange={(e) => setContent(e.target.value)}
                 placeholder={config.placeholder}
                 className="w-full h-64 bg-card border border-border rounded-2xl p-5 text-sm text-foreground focus:ring-2 focus:ring-indigo-500/30 outline-none transition-all resize-none leading-relaxed custom-scrollbar shadow-inner font-mono"
              />
           </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/10 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-6 py-2.5 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted transition-colors uppercase tracking-widest"
           >
             {t('cancel')}
           </button>
           <button 
             onClick={() => onSave(pillarId, content)}
             className={cn(
               "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-lg active:scale-95 uppercase tracking-widest",
               content.trim().length > 10 ? "bg-indigo-600 hover:bg-indigo-500" : "bg-muted text-muted-foreground cursor-not-allowed border border-border shadow-none"
             )}
             disabled={content.trim().length <= 10}
           >
             {t('solidify_pillar')}
             <ChevronRight size={16} />
           </button>
        </div>

      </div>
    </div>
  );
}
