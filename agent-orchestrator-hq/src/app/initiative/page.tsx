'use client';

import React, { useMemo, useState } from 'react';
import { 
  Trophy, 
  CheckCircle2, 
  Target, 
  TrendingUp,
  ArrowRight,
  Flame,
  Zap,
  Plus,
  Lightbulb,
  Search,
  Scale,
  LineChart
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import StrategicPillarWizard, { PillarId, PillarData } from '@/components/initiative/StrategicPillarWizard';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function InitiativePage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  
  const [pillarData, setPillarData] = useState<PillarData>({
    problem: 'The current monolith architecture tightly couples the frontend rendering logic with the monolithic backend, causing UI updates to require full deployments. This results in a 4-week lead time for minor visual changes, directly impacting our ability to run rapid A/B tests and degrading conversion rates.',
    validation: 'Our Q2 operational reports show that 60% of all P1 deployment incidents were caused by overlapping UI/Backend state changes. Furthermore, the marketing team reported a 15% drop in campaign conversions because we couldn\'t deploy landing page tweaks fast enough to meet market trends.',
    solution: 'Implement a Micro-Frontend architecture using Next.js App Router and React Server Components (RSC). By isolating the presentation layer into deployable micro-apps that communicate with the backend via a GraphQL Federation layer, we can decouple the release lifecycles. We will begin by strangling the Checkout flow.',
    resources: 'Requires 3 dedicated engineers (1 Frontend Architect, 2 Fullstack Engineers) for exactly 4 sprints (8 weeks). Infrastructure costs will increase by approximately $400/mo due to Vercel edge deployments, but this replaces the $1,200/mo cost of scaling the monolithic EC2 clusters.',
    roi: 'By reducing UI deployment lead times from 4 weeks to 1 hour, marketing can execute weekly A/B tests. Based on industry benchmarks, this agility increases conversion rates by roughly 5-8%, translating to an estimated +$50,000 MRR. Engineering operational costs also decrease by $800/mo.'
  });
  const [activePillar, setActivePillar] = useState<PillarId | null>(null);

  const [isInitializing, setIsInitializing] = useState(false);
  const isReady = Object.values(pillarData).every(val => val.length > 10);

  const handleInitializeEpic = async () => {
    setIsInitializing(true);
    try {
      const epicDescription = `Strategic Initiative: Micro-Frontend Decoupling\n\n**Problem:**\n${pillarData.problem}\n\n**Solution:**\n${pillarData.solution}\n\n**ROI:**\n${pillarData.roi}`;
      
      // Transform pillars into Document artifacts
      const documents = Object.entries(pillarData).map(([key, content]) => {
        const titleMap: any = {
           problem: t('pillar_problem'),
           validation: t('pillar_validation'),
           solution: t('pillar_solution'),
           resources: t('pillar_resources'),
           roi: t('pillar_roi')
        };
        return {
           name: `${key}_pitch_document.md`,
           title: titleMap[key] || 'Pitch Document',
           content: `# ${titleMap[key]}\n\n${content}`
        };
      });

      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Decouple Monolithic Frontend Architecture',
          description: epicDescription,
          tier: 'Epic',
          documents
        })
      });

      // Clear UI after successful creation
      setPillarData({ problem: '', validation: '', solution: '', resources: '', roi: '' });
      window.location.reload();
    } catch (err) {
      console.error('Failed to initialize epic:', err);
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <>
    <TicketHandler phaseId="initiative" tier="Epic">
      {({ 
        filteredTickets: epics, 
        searchQuery, 
        setSearchQuery, 
        activeFilters, 
        toggleAssigneeFilter, 
        resetFilters,
        temporalBoundaries
      }) => (
        <LifecyclePageLayout
          phaseId="initiative"
          tier="Epic"
          title={t('initiative')}
          description={t('initiative_desc')}
          buttonLabel={t('new_epic')}
          
          sidebarProps={{
            tickets: epics,
            searchQuery,
            onSearchChange: setSearchQuery,
            activeAssigneeFilters: activeFilters.assignees,
            onToggleAssignee: toggleAssigneeFilter,
            onResetFilters: resetFilters
          }}

          dashboardContent={
            <div className="space-y-12">
              
              {/* Pitch New Initiative Section */}
              <section className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 text-left">
                <div className="flex items-center justify-between px-2">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono italic">
                    <Trophy size={14} className="text-indigo-500" />
                    {t('pitch_title')}
                  </h2>
                  <div className="flex items-center gap-3">
                    <button 
                      disabled={!isReady || isInitializing}
                      onClick={handleInitializeEpic}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 uppercase tracking-widest",
                        isReady ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-muted text-muted-foreground cursor-not-allowed border border-border shadow-none"
                      )}
                    >
                      {isInitializing ? <Zap className="animate-spin" size={14} /> : <Plus size={14} />} 
                      {isInitializing ? t('saving_to_vault') : t('initialize_epic')}
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                   <PillarCard 
                      id="problem" 
                      title={t('pillar_problem')} 
                      icon={<Lightbulb size={24} className="text-amber-500" />} 
                      isComplete={pillarData.problem.length > 10} 
                      onClick={() => setActivePillar('problem')} 
                      bg="bg-amber-500/10" 
                      border="border-amber-500/20"
                      solidifiedText={t('solidified')}
                      draftText={t('draft_required')}
                   />
                   <PillarCard 
                      id="validation" 
                      title={t('pillar_validation')} 
                      icon={<Search size={24} className="text-blue-500" />} 
                      isComplete={pillarData.validation.length > 10} 
                      onClick={() => setActivePillar('validation')} 
                      bg="bg-blue-500/10" 
                      border="border-blue-500/20"
                      solidifiedText={t('solidified')}
                      draftText={t('draft_required')}
                   />
                   <PillarCard 
                      id="solution" 
                      title={t('pillar_solution')} 
                      icon={<Target size={24} className="text-indigo-500" />} 
                      isComplete={pillarData.solution.length > 10} 
                      onClick={() => setActivePillar('solution')} 
                      bg="bg-indigo-500/10" 
                      border="border-indigo-500/20"
                      solidifiedText={t('solidified')}
                      draftText={t('draft_required')}
                   />
                   <PillarCard 
                      id="resources" 
                      title={t('pillar_resources')} 
                      icon={<Scale size={24} className="text-pink-500" />} 
                      isComplete={pillarData.resources.length > 10} 
                      onClick={() => setActivePillar('resources')} 
                      bg="bg-pink-500/10" 
                      border="border-pink-500/20"
                      solidifiedText={t('solidified')}
                      draftText={t('draft_required')}
                   />
                   <PillarCard 
                      id="roi" 
                      title={t('pillar_roi')} 
                      icon={<LineChart size={24} className="text-green-500" />} 
                      isComplete={pillarData.roi.length > 10} 
                      onClick={() => setActivePillar('roi')} 
                      bg="bg-green-500/10" 
                      border="border-green-500/20"
                      solidifiedText={t('solidified')}
                      draftText={t('draft_required')}
                   />
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                <StatCard 
                  icon={<Trophy size={20} />} 
                  label={t('strategic_progress')} 
                  value={`${epics.filter(e => e.status === 'Done').length}/${epics.length}`}
                  desc={t('strategic_vision')}
                  color="amber"
                />
                <StatCard 
                  icon={<Target size={20} />} 
                  label="Epic Velocity" 
                  value="4.2 / mo"
                  desc="Throughput Analysis"
                  color="blue"
                />
                <StatCard 
                  icon={<TrendingUp size={20} />} 
                  label="Impact Score" 
                  value="98.2%"
                  desc="Mission Alignment"
                  color="green"
                />
              </section>
            </div>
          }
        />
      )}
    </TicketHandler>

    {activePillar && (
      <StrategicPillarWizard 
         pillarId={activePillar} 
         initialData={pillarData[activePillar]} 
         onSave={(id, data) => {
           setPillarData(prev => ({ ...prev, [id]: data }));
           setActivePillar(null);
         }} 
         onClose={() => setActivePillar(null)} 
      />
    )}
    </>
  );
}

function PillarCard({ title, icon, isComplete, onClick, bg, border, solidifiedText, draftText }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-6 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col items-center justify-center gap-4 text-center aspect-square shadow-lg",
        isComplete ? "bg-card border-border shadow-inner" : "bg-muted/30 border-dashed border-border hover:border-foreground/30",
        isComplete && `border-b-4 ${border}`
      )}
    >
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner border", isComplete ? bg : "bg-muted text-muted-foreground", isComplete ? border : "border-border")}>
         {isComplete ? icon : <Plus size={24} className="opacity-50" />}
      </div>
      <div className="space-y-1">
         <h3 className={cn("text-xs font-bold uppercase tracking-widest", isComplete ? "text-foreground" : "text-muted-foreground")}>{title}</h3>
         <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center justify-center gap-1">
            {isComplete ? <><CheckCircle2 size={10} className="text-green-500" /> {solidifiedText}</> : draftText}
         </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, desc, color }: { icon: any, label: string, value: string, desc: string, color: 'amber'|'blue'|'green' }) {
   const colors = {
      amber: "text-amber-500 border-amber-500/20",
      blue: "text-blue-500 border-blue-500/20",
      green: "text-green-500 border-green-500/20"
   };
   return (
      <div className={cn("bg-card border border-border rounded-3xl p-6 space-y-4 shadow-xl border-l-4", colors[color])}>
         <div className="flex items-center justify-between opacity-80">
            {icon}
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-muted rounded border border-border font-mono">{label}</span>
         </div>
         <div>
            <div className="text-3xl font-bold text-foreground tracking-tighter italic">{value}</div>
            <p className="text-muted-foreground text-[10px] mt-1 uppercase font-bold tracking-tighter">{desc}</p>
         </div>
      </div>
   );
}
