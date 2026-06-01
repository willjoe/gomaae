'use client';

import React from 'react';
import { 
  Trophy,
  TrendingUp,
  Activity,
  CheckCircle2,
  Target,
  ArrowRight,
  Lightbulb,
  FileText,
  BrainCircuit,
  Compass,
  Rocket
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function InitiativePage() {
  const { tickets, setPhaseSelectedTicket, t, phaseStates } = useLifecycle();
  
  const filteredIds = phaseStates['initiative']?.filteredTicketIds;
  const epics = tickets.filter((tk: any) => tk.tier === 'Epic' && (!filteredIds || filteredIds.includes(tk.id)));

  const activeCount = epics.filter(e => e.status !== 'Done').length;
  const overallProgress = epics.length > 0 ? (epics.filter(e => e.status === 'Done').length / epics.length) * 100 : 0;

  const dashboardContent = (
    <div className="space-y-12">
      {/* Strategic Brainstorming Header */}
      <section className="bg-card border border-border rounded-3xl p-10 relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-700 transition-colors duration-300">
         <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <BrainCircuit size={200} className="text-amber-500" />
         </div>
         <div className="relative z-10 space-y-6 max-w-2xl">
            <div className="flex items-center gap-3 text-amber-500 font-bold uppercase tracking-widest text-xs">
               <Lightbulb size={20} className="animate-pulse" />
               {t('brainstorming_title')}
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-foreground leading-tight italic">
               Define the next generation of <span className="text-amber-500 underline decoration-amber-500/30 underline-offset-8">autonomous intelligence</span>.
            </h2>
            <p className="text-muted-foreground text-sm italic leading-relaxed">
               {t('brainstorming_desc')} Use this space to draft high-level blueprints and initialize the primary Epic anchors for the engineering cycle.
            </p>
            <div className="flex items-center gap-4 pt-4">
               <button className="px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs transition-all shadow-lg active:scale-95 flex items-center gap-2">
                  <Plus size={16} />
                  New Product Concept
               </button>
               <button className="px-6 py-3 bg-muted border border-border text-muted-foreground hover:text-foreground rounded-xl font-bold text-xs transition-all flex items-center gap-2">
                  <FileText size={16} />
                  {t('concept_canvas')}
               </button>
            </div>
         </div>
      </section>

      {/* Concept Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
         <ConceptCard 
            icon={<Compass size={24} />} 
            title={t('initiative_blueprint')} 
            desc="Architectural foundations and core mission alignment." 
            color="amber"
         />
         <ConceptCard 
            icon={<Target size={24} />} 
            title={t('market_fit')} 
            desc="Impact analysis and integration vectors." 
            color="blue"
         />
         <ConceptCard 
            icon={<Rocket size={24} />} 
            title="Scalability Path" 
            desc="Lifecycle roadmap from concept to production." 
            color="emerald"
         />
      </section>

      {/* Active Epic Summary (Previously the main focus) */}
      <section className="space-y-6">
         <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
               <Trophy size={14} className="text-amber-500" />
               Current Epic Anchors
            </h3>
            <span className="text-[10px] font-mono text-muted-foreground">{epics.length} Active Initiatives</span>
         </div>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {epics.map(epic => (
               <div 
                  key={epic.id} 
                  onClick={() => setPhaseSelectedTicket('initiative', epic.id)}
                  className="bg-card border border-border p-6 rounded-2xl flex items-center justify-between hover:border-amber-500/30 transition-all cursor-pointer group"
               >
                  <div className="space-y-2">
                     <div className="text-[10px] font-mono text-muted-foreground uppercase">{epic.identifier}</div>
                     <div className="font-bold text-foreground group-hover:text-amber-500 transition-colors">{epic.title}</div>
                  </div>
                  <ArrowRight size={18} className="text-muted-foreground group-hover:text-amber-500 transition-all group-hover:translate-x-1" />
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
      buttonLabel={t('new_epic')}
      dashboardContent={dashboardContent}
    />
  );
}

function ConceptCard({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: 'amber'|'blue'|'emerald' }) {
   const colors = {
      amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
      blue: "text-blue-500 bg-blue-500/10 border-blue-500/20",
      emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
   };

   return (
      <div className="bg-card border border-border p-6 rounded-3xl space-y-4 hover:border-foreground/10 transition-all group shadow-xl">
         <div className={cn("p-3 w-fit rounded-2xl", colors[color])}>
            {icon}
         </div>
         <div className="space-y-1">
            <div className="font-bold text-foreground tracking-tight">{title}</div>
            <p className="text-muted-foreground text-[10px] leading-relaxed italic">{desc}</p>
         </div>
      </div>
   );
}

function Plus({ size }: { size: number }) {
   return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
         <line x1="12" y1="5" x2="12" y2="19"></line>
         <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
   );
}
