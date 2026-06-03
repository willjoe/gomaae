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
  LineChart,
  Rocket,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import StrategicPillarWizard, { PillarId, PillarData } from '@/components/initiative/StrategicPillarWizard';
import PillarCard from '@/components/initiative/PillarCard';
import DelegationReadiness, { DelegationData } from '@/components/initiative/DelegationReadiness';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function InitiativePage() {
  const { tickets, loading, setPhaseSelectedTicket, t, environment } = useLifecycle();
  
  // Get active project name for presentation headers
  const [activeProjectName, setActiveProjectName] = useState('Agentic Engineering HQ');
  React.useEffect(() => {
     fetch('/api/projects').then(res => res.json()).then(data => {
        if (data.success && data.projects) {
           const active = data.projects.find((p: any) => p.is_active === 1);
           if (active) setActiveProjectName(active.name);
        }
     });
  }, []);
  
  // 1. PHASE 1 STATE: Strategic Pillars
  const [pillarData, setPillarData] = useState<PillarData>(
    environment === 'dev' ? {
      problem: 'Monolith coupling causes 4-week UI lead times.\n\nThe current monolith architecture tightly couples the frontend rendering logic with the monolithic backend, causing UI updates to require full deployments. This results in a 4-week lead time for minor visual changes, directly impacting our ability to run rapid A/B tests and degrading conversion rates.',
      market: 'Targeting Enterprise organizations with high P1 deployment risks.\n\nPrimary target is our current Enterprise customer base (1,200+ organizations). Internal Q2 operational reports show that 60% of all P1 deployment incidents were caused by overlapping UI/Backend state changes, validating the urgent need for decoupling.',
      solution: 'Micro-Frontend architecture using RSC and GraphQL Federation.\n\nImplement a Micro-Frontend architecture using Next.js App Router and React Server Components (RSC). By isolating the presentation layer into deployable micro-apps, we can decouple the release lifecycles and enable atomic visual updates.',
      entry: 'Pilot rollout to internal Admin Console followed by Checkout flow.\n\nInitial pilot rollout to our internal Admin Console. Once stabilized, we will migrate the Checkout flow for high-traffic customers. Expansion will be managed via the new HIAD CLI orchestration tool, enabling push-button deployment for autonomous pods.',
      feasibility: 'Validated via HIAD sandbox; requires 3 engineers for 8 weeks.\n\nTechnically validated via the current HIAD sandbox prototype. Requires 3 dedicated engineers for 4 sprints. No major compliance blockers identified as we are maintaining the existing VFS (Virtual File System) security layer.',
      roi: 'Estimated +$50,000 MRR via increased conversion and A/B agility.\n\nEstimated +$50,000 MRR by increasing conversion rates through rapid A/B testing. Engineering operational costs will decrease by roughly $800/mo through infrastructure consolidation and reduced deployment friction.'
    } : { problem: '', market: '', solution: '', entry: '', feasibility: '', roi: '' }
  );
  const [activePillar, setActivePillar] = useState<PillarId | null>(null);

  // 2. PHASE 2 STATE: Delegation Guardrails
  const [delegationData, setDelegationData] = useState<DelegationData>(
    environment === 'dev' ? {
      persona: 'A store manager using a mobile device while walking through a physical warehouse, needing real-time sync with high-latency 5G.',
      mustHave: ['Decoupled Checkout RSC Module', 'Federated GraphQL Layer', 'Atomic Tailwind v4 Theme Sync'],
      niceToHave: ['Advanced Motion Framer Animations', 'Predictive Pre-fetching of Assets'],
      metricDays: 30,
      metricName: 'Checkout Conversion Rate',
      metricTarget: 15
    } : { persona: '', mustHave: [''], niceToHave: [''], metricDays: 30, metricName: '', metricTarget: 0 }
  );

  // UI EXPANSION STATE
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['strategic', 'delegation']);
  const [isInitializing, setIsInitializing] = useState(false);

  const pillarsFilled = Object.values(pillarData).every(val => val.length > 10);
  const delegationFilled = delegationData.persona.length > 10 && delegationData.mustHave.length > 0 && delegationData.metricName.length > 2;

  const getSummary = (text: string) => {
    if (!text || text.trim().length === 0) return '';
    return text.split('\n')[0].trim();
  };

  const pillarSummaries = useMemo(() => ({
    problem: getSummary(pillarData.problem),
    market: getSummary(pillarData.market),
    solution: getSummary(pillarData.solution),
    entry: getSummary(pillarData.entry),
    feasibility: getSummary(pillarData.feasibility),
    roi: getSummary(pillarData.roi)
  }), [pillarData]);

  const togglePhase = (id: string) => {
    setExpandedPhases(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleInitializeEpic = async () => {
    setIsInitializing(true);
    try {
      // 1. Construct the High-Resolution Initiative Brief
      const briefContent = `
# Strategic Initiative: [TITLE]

## 1. Context & Rationale (Why)
- **Problem:** ${pillarData.problem}
- **Market Evidence:** ${pillarData.market}
- **Target Persona:** ${delegationData.persona}

## 2. Technical Edge (What)
- **Unique Strength:** ${pillarData.solution}
- **MVP Boundaries (Must):** ${delegationData.mustHave.join(', ')}
- **MVP Boundaries (Nice):** ${delegationData.niceToHave.join(', ')}

## 3. Execution Strategy (How)
- **Entry Plan:** ${pillarData.entry}
- **Feasibility Note:** ${pillarData.feasibility}

## 4. Success Metrics (ROI)
- **Goal:** ${pillarData.roi}
- **Quantitative KPI:** Within ${delegationData.metricDays} days, ${delegationData.metricName} should reach ${delegationData.metricTarget}%.
      `;

      // 2. Map to Registry Documents
      const documents = [
          { name: 'initiative_brief.md', title: 'Initiative Brief (Full Spec)', content: briefContent },
          { name: 'persona_context.md', title: 'User Persona & iconic Scene', content: `# Persona\n\n${delegationData.persona}` },
          { name: 'success_metrics.md', title: 'Success Metrics (Quantitative)', content: `# Success Metrics\n\nIn ${delegationData.metricDays} days, ${delegationData.metricName} target: ${delegationData.metricTarget}%` }
      ];

      await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Decouple Monolithic Frontend Architecture',
          description: briefContent.substring(0, 500) + '...',
          tier: 'Epic',
          documents
        })
      });

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
            <div className="space-y-12 pb-32">
              
              {/* PHASE 1: STRATEGIC CONCEPTUALIZATION */}
              <section className={cn(
                  "bg-card border rounded-[2rem] overflow-hidden transition-all duration-500 shadow-2xl",
                  expandedPhases.includes('strategic') ? "border-amber-500/20" : "border-border opacity-60"
              )}>
                  <div 
                    onClick={() => togglePhase('strategic')}
                    className="p-8 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors"
                  >
                      <div className="flex items-center gap-4">
                          <div className={cn(
                              "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-colors",
                              pillarsFilled ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                              <Lightbulb size={24} />
                          </div>
                          <div>
                              <h2 className="text-xl font-bold tracking-tight text-foreground">1. {activeProjectName}: {t('step_conceptualize')}</h2>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{pillarsFilled ? t('solidified') : 'Awaiting Pitch Solidification'}</p>
                          </div>
                      </div>
                      {expandedPhases.includes('strategic') ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                  </div>
                  
                  {expandedPhases.includes('strategic') && (
                    <div className="p-8 border-t border-border/50 space-y-8 animate-in slide-in-from-top-4 duration-500">
                        <div className="flex flex-wrap justify-center gap-8 max-w-5xl mx-auto">
                            <PillarCard 
                                id="problem" 
                                title={t('pillar_problem')} 
                                icon={<Lightbulb size={24} className="text-amber-500" />} 
                                isComplete={pillarData.problem.length > 10} 
                                onClick={() => setActivePillar('problem')} 
                                bg="bg-amber-500/10" border="border-amber-500/20"
                                solidifiedText={t('solidified')} draftText={t('draft_required')}
                                summary={pillarSummaries.problem}
                                placeholderSummary={t('pillar_problem_placeholder')}
                            />
                            <PillarCard 
                                id="market" 
                                title={t('pillar_market')} 
                                icon={<Search size={24} className="text-blue-500" />} 
                                isComplete={pillarData.market.length > 10} 
                                onClick={() => setActivePillar('market')} 
                                bg="bg-blue-500/10" border="border-blue-500/20"
                                solidifiedText={t('solidified')} draftText={t('draft_required')}
                                summary={pillarSummaries.market}
                                placeholderSummary={t('pillar_market_placeholder')}
                            />
                            <PillarCard 
                                id="solution" 
                                title={t('pillar_solution')} 
                                icon={<Target size={24} className="text-indigo-500" />} 
                                isComplete={pillarData.solution.length > 10} 
                                onClick={() => setActivePillar('solution')} 
                                bg="bg-indigo-500/10" border="border-indigo-500/20"
                                solidifiedText={t('solidified')} draftText={t('draft_required')}
                                summary={pillarSummaries.solution}
                                placeholderSummary={t('pillar_solution_placeholder')}
                            />
                            <PillarCard 
                                id="entry" 
                                title={t('pillar_entry')} 
                                icon={<Rocket size={24} className="text-pink-500" />} 
                                isComplete={pillarData.entry.length > 10} 
                                onClick={() => setActivePillar('entry')} 
                                bg="bg-pink-500/10" border="border-pink-500/20"
                                solidifiedText={t('solidified')} draftText={t('draft_required')}
                                summary={pillarSummaries.entry}
                                placeholderSummary={t('pillar_entry_placeholder')}
                            />
                            <PillarCard 
                                id="feasibility" 
                                title={t('pillar_feasibility')} 
                                icon={<Scale size={24} className="text-emerald-500" />} 
                                isComplete={pillarData.feasibility.length > 10} 
                                onClick={() => setActivePillar('feasibility')} 
                                bg="bg-emerald-500/10" border="border-emerald-500/20"
                                solidifiedText={t('solidified')} draftText={t('draft_required')}
                                summary={pillarSummaries.feasibility}
                                placeholderSummary={t('pillar_feasibility_placeholder')}
                            />
                            <PillarCard 
                                id="roi" 
                                title={t('pillar_roi')} 
                                icon={<LineChart size={24} className="text-green-500" />} 
                                isComplete={pillarData.roi.length > 10} 
                                onClick={() => setActivePillar('roi')} 
                                bg="bg-green-500/10" border="border-green-500/20"
                                solidifiedText={t('solidified')} draftText={t('draft_required')}
                                summary={pillarSummaries.roi}
                                placeholderSummary={t('pillar_roi_placeholder')}
                            />
                        </div>
                    </div>
                  )}
              </section>

              {/* PHASE 2: DELEGATION READINESS */}
              {pillarsFilled && (
                <section className={cn(
                    "bg-card border rounded-[2rem] overflow-hidden transition-all duration-500 shadow-2xl animate-in slide-in-from-top-8",
                    expandedPhases.includes('delegation') ? "border-indigo-500/20" : "border-border opacity-60"
                )}>
                    <div 
                        onClick={() => togglePhase('delegation')}
                        className="p-8 flex items-center justify-between cursor-pointer hover:bg-muted/10 transition-colors"
                    >
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner transition-colors",
                                delegationFilled ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                            )}>
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-foreground">2. {activeProjectName} {t('step_delegate')}</h2>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{delegationFilled ? t('solidified') : 'Define Execution Guardrails'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <button 
                                disabled={!delegationFilled || isInitializing}
                                onClick={(e) => { e.stopPropagation(); handleInitializeEpic(); }}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 uppercase tracking-widest",
                                    delegationFilled ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-muted text-muted-foreground cursor-not-allowed border border-border shadow-none"
                                )}
                            >
                                {isInitializing ? <Zap className="animate-spin" size={14} /> : <Rocket size={14} />} 
                                {isInitializing ? t('saving_to_vault') : t('issue_epic')}
                            </button>
                            {expandedPhases.includes('delegation') ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}
                        </div>
                    </div>

                    {expandedPhases.includes('delegation') && (
                        <div className="p-8 border-t border-border/50 animate-in slide-in-from-top-4 duration-500">
                             <DelegationReadiness 
                                data={delegationData} 
                                onChange={setDelegationData} 
                             />
                        </div>
                    )}
                </section>
              )}

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
         initialData={pillarData[activePillar as keyof PillarData] || ''} 
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
