'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Trophy, 
  Activity, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Lightbulb, 
  Search, 
  Target, 
  Rocket, 
  Scale, 
  LineChart 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';
import StrategicPillarWizard, { PillarData, PillarId } from '@/components/initiative/StrategicPillarWizard';
import DelegationReadiness, { DelegationData } from '@/components/initiative/DelegationReadiness';
import PillarCard from '@/components/initiative/PillarCard';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const EMPTY_PILLARS: PillarData = {
  problem: '',
  market: '',
  solution: '',
  entry: '',
  feasibility: '',
  roi: ''
};

const EMPTY_DELEGATION: DelegationData = {
  persona: '',
  mustHave: [''],
  niceToHave: [''],
  metricDays: 30,
  metricName: '',
  metricTarget: 0
};

export default function InitiativePage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState('Select Project');
  const [pillarData, setPillarData] = useState<PillarData>(EMPTY_PILLARS);
  const [delegationData, setDelegationData] = useState<DelegationData>(EMPTY_DELEGATION);
  const [activePillar, setActivePillar] = useState<PillarId | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['strategic', 'delegation']);
  const [isInitializing, setIsInitializing] = useState(false);

  // 1. Fetch Project Identity and existing Strategy
  useEffect(() => {
     fetch('/api/projects').then(res => res.json()).then(data => {
        if (data.success && data.projects) {
           const active = data.projects.find((p: any) => p.is_active === 1);
           if (active) {
              setActiveProjectName(active.name);
              setActiveProjectId(active.id);
           }
        }
     });
  }, []);

  // 2. Load granular strategy from OO-DDD Briefs on disk
  useEffect(() => {
     const fetchPillarsFromFiles = async () => {
        const pillarMap: Record<string, keyof PillarData> = {
            'Problem Definition.md': 'problem',
            'Customer & Market.md': 'market',
            'Unique Value Proposition.md': 'solution',
            'Market Entry.md': 'entry',
            'Feasibility.md': 'feasibility',
            'Business Value.md': 'roi'
        };

        const newPillarData = { ...EMPTY_PILLARS };
        
        try {
            await Promise.all(Object.entries(pillarMap).map(async ([filename, key]) => {
                const res = await fetch(`/api/documents?path=${encodeURIComponent(`/Global/Briefs/${filename}`)}`);
                const data = await res.json();
                if (data.success && data.content) {
                    // Extract core content (remove first markdown header if present)
                    const cleanContent = data.content.replace(/^# .*\n/, '').trim();
                    newPillarData[key] = cleanContent;
                }
            }));
            setPillarData(newPillarData);
        } catch (err) {
            console.error('Failed to fetch strategy pillars from disk:', err);
        }
     };

     fetchPillarsFromFiles();
  }, []);

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

  const handleInitializeEpic = async () => {
    setIsInitializing(true);
    try {
        await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tier: 'Epic', 
                title: activeProjectName,
                description: pillarSummaries.problem,
                document_content: JSON.stringify({ pillars: pillarData, delegation: delegationData }),
                document_name: `Strategy: ${activeProjectName}`,
                status: 'Todo'
            })
        });
        window.location.reload();
    } catch (err) {
        console.error(err);
    } finally {
        setIsInitializing(false);
    }
  };

  const sidebarContent = (
    <div className="space-y-6 text-left">
       <div className="bg-indigo-600/5 border border-indigo-500/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Initiative Stats</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-0.5">
                <div className="text-xl font-bold text-foreground tabular-nums">
                    {pillarsFilled ? '100%' : '24%'}
                </div>
                <div className="text-[8px] font-bold uppercase text-muted-foreground tracking-tighter">Strategic Fit</div>
             </div>
             <div className="space-y-0.5">
                <div className="text-xl font-bold text-foreground tabular-nums">8</div>
                <div className="text-[8px] font-bold uppercase text-muted-foreground tracking-tighter">Agents Ready</div>
             </div>
          </div>
       </div>
    </div>
  );

  return (
    <SystemViewerLayout
      id="initiative"
      title={t('initiative')}
      description={t('initiative_desc')}
      wizardType="initiative"
      sidebarContent={sidebarContent}
    >
      <div className="space-y-12 pb-20">
         
         <section className="space-y-6">
            <div onClick={() => setExpandedPhases(p => p.includes('strategic') ? p.filter(x => x !== 'strategic') : [...p, 'strategic'])} className="flex items-center gap-4 cursor-pointer group">
               <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg", expandedPhases.includes('strategic') ? "bg-indigo-600 text-white shadow-indigo-900/20" : "bg-muted text-muted-foreground")}>
                  <Trophy size={20} />
               </div>
               <div className="flex-1 border-b border-border pb-4 group-hover:border-indigo-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                     <h2 className="text-lg font-bold tracking-tight text-foreground italic uppercase tracking-[0.1em]">1. Strategic Conceptualization</h2>
                     <div className="flex items-center gap-2">
                        {pillarsFilled && <CheckCircle2 size={16} className="text-green-500" />}
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{expandedPhases.includes('strategic') ? 'Collapse' : 'Expand'}</span>
                     </div>
                  </div>
               </div>
            </div>

            {expandedPhases.includes('strategic') && (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                  <PillarCard 
                    title={t('pillar_problem')}
                    icon={<Lightbulb />}
                    isComplete={pillarData.problem.length > 10}
                    summary={pillarSummaries.problem}
                    placeholderSummary="Identify the core friction point."
                    bg="bg-amber-500/10"
                    border="border-amber-500/20"
                    solidifiedText={t('solidified')}
                    draftText={t('draft_required')}
                    onClick={() => setActivePillar('problem')}
                  />
                  <PillarCard 
                    title={t('pillar_market')}
                    icon={<Search />}
                    isComplete={pillarData.market.length > 10}
                    summary={pillarSummaries.market}
                    placeholderSummary="Who are we solving this for?"
                    bg="bg-blue-500/10"
                    border="border-blue-500/20"
                    solidifiedText={t('solidified')}
                    draftText={t('draft_required')}
                    onClick={() => setActivePillar('market')}
                  />
                  <PillarCard 
                    title={t('pillar_solution')}
                    icon={<Target />}
                    isComplete={pillarData.solution.length > 10}
                    summary={pillarSummaries.solution}
                    placeholderSummary="Outline the unique technical edge."
                    bg="bg-indigo-500/10"
                    border="border-indigo-500/20"
                    solidifiedText={t('solidified')}
                    draftText={t('draft_required')}
                    onClick={() => setActivePillar('solution')}
                  />
                  <PillarCard 
                    title={t('pillar_entry')}
                    icon={<Rocket />}
                    isComplete={pillarData.entry.length > 10}
                    summary={pillarSummaries.entry}
                    placeholderSummary="Define the go-to-market strategy."
                    bg="bg-pink-500/10"
                    border="border-pink-500/20"
                    solidifiedText={t('solidified')}
                    draftText={t('draft_required')}
                    onClick={() => setActivePillar('entry')}
                  />
                  <PillarCard 
                    title={t('pillar_feasibility')}
                    icon={<Scale />}
                    isComplete={pillarData.feasibility.length > 10}
                    summary={pillarSummaries.feasibility}
                    placeholderSummary="Assess capabilities & constraints."
                    bg="bg-emerald-500/10"
                    border="border-emerald-500/20"
                    solidifiedText={t('solidified')}
                    draftText={t('draft_required')}
                    onClick={() => setActivePillar('feasibility')}
                  />
                  <PillarCard 
                    title={t('pillar_roi')}
                    icon={<LineChart />}
                    isComplete={pillarData.roi.length > 10}
                    summary={pillarSummaries.roi}
                    placeholderSummary="Measure business fit & metrics."
                    bg="bg-green-500/10"
                    border="border-green-500/20"
                    solidifiedText={t('solidified')}
                    draftText={t('draft_required')}
                    onClick={() => setActivePillar('roi')}
                  />
               </div>
            )}
         </section>

         <section className="space-y-6">
            <div onClick={() => setExpandedPhases(p => p.includes('delegation') ? p.filter(x => x !== 'delegation') : [...p, 'delegation'])} className="flex items-center gap-4 cursor-pointer group">
               <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg", expandedPhases.includes('delegation') ? "bg-emerald-600 text-white shadow-emerald-900/20" : "bg-muted text-muted-foreground")}>
                  <Activity size={20} />
               </div>
               <div className="flex-1 border-b border-border pb-4 group-hover:border-emerald-500/30 transition-colors">
                  <div className="flex items-center justify-between">
                     <h2 className="text-lg font-bold tracking-tight text-foreground italic uppercase tracking-[0.1em]">2. Delegation & Guardrails</h2>
                     <div className="flex items-center gap-2">
                        {delegationFilled && <CheckCircle2 size={16} className="text-green-500" />}
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{expandedPhases.includes('delegation') ? 'Collapse' : 'Expand'}</span>
                     </div>
                  </div>
               </div>
            </div>

            {expandedPhases.includes('delegation') && (
               <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                  <DelegationReadiness 
                     data={delegationData}
                     onChange={(newData) => setDelegationData(newData)}
                  />
               </div>
            )}
         </section>

         <section className="pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 bg-card border border-border rounded-[2.5rem] shadow-2xl relative overflow-hidden group transition-all hover:border-indigo-500/30">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <ShieldCheck size={200} className="text-indigo-500" />
               </div>
               <div className="space-y-2 relative z-10 text-center md:text-left">
                  <h3 className="text-xl font-bold tracking-tight text-foreground italic">Ready for High-Integrity Issuance?</h3>
                  <p className="text-xs text-muted-foreground max-w-md leading-relaxed">Issuing this epic will lock the strategic pillars and propagate requirements to the autonomous worker pool.</p>
               </div>
               <button onClick={handleInitializeEpic} disabled={!pillarsFilled || !delegationFilled || isInitializing} className={cn("relative z-10 px-10 py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all shadow-xl active:scale-95 flex items-center gap-3", pillarsFilled && delegationFilled ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/40" : "bg-muted text-muted-foreground cursor-not-allowed opacity-50")}>
                  {isInitializing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('initialize_epic')}<ArrowRight size={18} className="animate-pulse" /></>}
               </button>
            </div>
         </section>
      </div>

      {activePillar && (
        <StrategicPillarWizard 
          pillarId={activePillar}
          initialData={pillarData[activePillar]}
          onSave={(id, val) => {
            setPillarData(prev => ({ ...prev, [id]: val }));
            setActivePillar(null);
          }}
          onClose={() => setActivePillar(null)}
        />
      )}
    </SystemViewerLayout>
  );
}
