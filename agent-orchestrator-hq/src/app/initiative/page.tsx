'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  LineChart,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';
import TicketFormModal from '@/components/TicketFormModal';
import TicketDetailView from '@/components/TicketDetailView';
import { getAgentRoles } from '@/lib/agentRoles';
import StrategicPillarWizard, { PillarData, PillarId } from '@/components/initiative/StrategicPillarWizard';
import DelegationReadiness, { DelegationData } from '@/components/initiative/DelegationReadiness';
import PillarCard from '@/components/initiative/PillarCard';
import { hashContent } from '@/lib/hash';
import dynamic from 'next/dynamic';

// Client-only (Cytoscape touches the DOM, so keep it out of SSR).
const BrainstormSandbox = dynamic(() => import('@/components/initiative/BrainstormSandbox'), { ssr: false });


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
  scene: '',
  mustHave: [''],
  niceToHave: [''],
  metricDays: 30,
  metricName: '',
  metricTarget: 0,
  secondaryMetrics: [],
  metricNotes: ''
};

// Success Metric.md carries the headline metric plus the free-form extensions.
const metricMarkdown = (d: DelegationData) => {
  const secondary = (d.secondaryMetrics || []).map((s) => s.trim()).filter(Boolean);
  let md = `# Success Metric\n\nWithin **${d.metricDays} days**, reach **${d.metricName || 'a target metric'}** of **${d.metricTarget}**.`;
  if (secondary.length) md += `\n\n## Supporting Metrics\n${secondary.map((s) => `- ${s}`).join('\n')}`;
  if ((d.metricNotes || '').trim()) md += `\n\n## Measurement Notes\n${(d.metricNotes || '').trim()}`;
  md += `\n\n<!-- metric:${d.metricDays}|${d.metricName}|${d.metricTarget} -->`;
  return md;
};

// Files in Files & Assets (DocsAssets) that back the Initiative — the source of truth.
const BRIEFS_DIR = '/Global/Briefs';
const PILLAR_FILES: Record<keyof PillarData, string> = {
  problem: 'Problem Definition.md',
  market: 'Customer & Market.md',
  solution: 'Unique Value Proposition.md',
  entry: 'Market Entry.md',
  feasibility: 'Feasibility.md',
  roi: 'Business Value.md',
};
const PILLAR_TITLES: Record<keyof PillarData, string> = {
  problem: 'Problem Definition',
  market: 'Customer & Market',
  solution: 'Unique Value Proposition',
  entry: 'Market Entry',
  feasibility: 'Feasibility',
  roi: 'Business Value',
};
// Delegation persists as readable markdown briefs (like the pillars), one per part.
const DELEGATION_FILES = {
  persona: 'Target Persona.md',
  scene: 'Iconic Scene.md',
  guardrails: 'MVP Guardrails.md',
  metric: 'Success Metric.md',
};

export default function InitiativePage() {
  const { tickets, loading, setPhaseSelectedTicket, phaseStates, t } = useLifecycle();
  
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [activeProjectName, setActiveProjectName] = useState('Select Project');
  const [pillarData, setPillarData] = useState<PillarData>(EMPTY_PILLARS);
  const [delegationData, setDelegationData] = useState<DelegationData>(EMPTY_DELEGATION);
  const [pillarScores, setPillarScores] = useState<Record<string, { score: number; feedback: string; hash?: string }>>({});
  const [scoring, setScoring] = useState<Record<string, boolean>>({});
  const [scoresLoaded, setScoresLoaded] = useState(false);
  const scoreAttempted = useRef<Set<string>>(new Set());
  const [activePillar, setActivePillar] = useState<PillarId | null>(null);
  const [expandedPhases, setExpandedPhases] = useState<string[]>(['strategic', 'delegation']);
  const [isInitializing, setIsInitializing] = useState(false);
  const [showCreateEpic, setShowCreateEpic] = useState(false);

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

  // 2. Load granular strategy + delegation from the Briefs files on disk. These files
  //    are the source of truth, so re-running these after a write updates the UI instantly.
  const loadPillars = useCallback(async () => {
    const next = { ...EMPTY_PILLARS };
    try {
      await Promise.all((Object.keys(PILLAR_FILES) as (keyof PillarData)[]).map(async (key) => {
        const res = await fetch(`/api/documents?path=${encodeURIComponent(`${BRIEFS_DIR}/${PILLAR_FILES[key]}`)}`);
        const data = await res.json();
        if (data.success && data.content) {
          next[key] = data.content.replace(/^# .*\n/, '').trim();
        }
      }));
      setPillarData(next);
    } catch (err) {
      console.error('Failed to fetch strategy pillars from disk:', err);
    }
  }, []);

  const loadDelegation = useCallback(async () => {
    const readDoc = async (file: string): Promise<string> => {
      try {
        const res = await fetch(`/api/documents?path=${encodeURIComponent(`${BRIEFS_DIR}/${file}`)}`);
        const data = await res.json();
        return data.success && data.content ? data.content : '';
      } catch { return ''; }
    };
    const stripHeader = (s: string) => s.replace(/^#\s.*\n/, '').trim();
    const parseBullets = (md: string, heading: string): string[] => {
      const m = md.match(new RegExp(`##\\s*${heading}\\s*\\n([\\s\\S]*?)(?:\\n##\\s|$)`));
      if (!m) return [];
      return m[1].split('\n').map((l) => l.replace(/^[-*]\s+/, '').trim()).filter(Boolean);
    };
    try {
      const [personaMd, sceneMd, guardMd, metricMd] = await Promise.all([
        readDoc(DELEGATION_FILES.persona), readDoc(DELEGATION_FILES.scene),
        readDoc(DELEGATION_FILES.guardrails), readDoc(DELEGATION_FILES.metric),
      ]);
      if (!personaMd && !sceneMd && !guardMd && !metricMd) return; // nothing saved yet
      const mm = metricMd.match(/<!--\s*metric:([^|]*)\|([^|]*)\|([^>]*?)\s*-->/);
      const mustHave = parseBullets(guardMd, 'Must-Have');
      const niceToHave = parseBullets(guardMd, 'Nice-to-Have');
      const secondaryMetrics = parseBullets(metricMd, 'Supporting Metrics');
      const notesMatch = metricMd.match(/##\s*Measurement Notes\s*\n([\s\S]*?)(?=\n##\s|\n<!--|$)/);
      setDelegationData({
        persona: stripHeader(personaMd),
        scene: stripHeader(sceneMd),
        mustHave: mustHave.length ? mustHave : [''],
        niceToHave: niceToHave.length ? niceToHave : [''],
        metricDays: mm ? (Number(mm[1]) || 30) : 30,
        metricName: mm ? mm[2].trim() : '',
        metricTarget: mm ? (Number(mm[3]) || 0) : 0,
        secondaryMetrics,
        metricNotes: notesMatch ? notesMatch[1].trim() : '',
      });
    } catch {
      /* no delegation files yet */
    }
  }, []);

  const loadScores = useCallback(async () => {
    try {
      const res = await fetch('/api/initiative/score');
      const data = await res.json();
      if (data.success) setPillarScores(data.scores || {});
    } catch { /* ignore */ } finally { setScoresLoaded(true); }
  }, []);

  // Re-rate a pillar with the Product Management AI Supporter (fire-and-forget; a
  // spinner shows on the card until it returns). The score is keyed by a content hash.
  const scorePillar = useCallback((pillar: string, title: string, content: string) => {
    const hash = hashContent(content);
    scoreAttempted.current.add(`${pillar}:${hash}`);
    setScoring(prev => ({ ...prev, [pillar]: true }));
    fetch('/api/initiative/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pillar, title, content }),
    })
      .then(r => r.json())
      .then(d => { if (d.success && typeof d.score === 'number') setPillarScores(prev => ({ ...prev, [pillar]: { score: d.score, feedback: d.feedback, hash: d.hash || hash } })); })
      .catch(() => {})
      .finally(() => setScoring(prev => ({ ...prev, [pillar]: false })));
  }, []);

  // Manual Delegation edits auto-save to the brief files once the stored briefs have
  // hydrated (so the initial empty state never overwrites saved content).
  const delegationHydrated = useRef(false);
  useEffect(() => {
    loadPillars();
    loadDelegation().finally(() => { delegationHydrated.current = true; });
    loadScores();
  }, [loadPillars, loadDelegation, loadScores]);

  // Only (re)score a pillar when its brief's content actually differs from what was
  // scored (hash mismatch) — otherwise the stored DB score is kept. Waits for the
  // stored scores to load first so a refresh doesn't re-score unchanged pillars.
  useEffect(() => {
    if (!scoresLoaded) return;
    (Object.keys(PILLAR_FILES) as (keyof PillarData)[]).forEach((k) => {
      const content = (pillarData[k] || '').trim();
      if (content.length <= 10) return;
      const currentHash = hashContent(content);
      const upToDate = pillarScores[k]?.hash === currentHash;
      if (!upToDate && !scoring[k] && !scoreAttempted.current.has(`${k}:${currentHash}`)) {
        scorePillar(k, PILLAR_TITLES[k], content);
      }
    });
  }, [scoresLoaded, pillarData, pillarScores, scoring, scorePillar]);

  // Each Delegation & Guardrails section gets the same score+feedback treatment as
  // the pillars, rated independently (keys delegation_persona / _mvp / _metrics).
  // Edits are keystroke-level (no explicit save), so re-scoring is debounced.
  const delegationSections = useMemo(() => {
    const must = delegationData.mustHave.map((s) => s.trim()).filter(Boolean);
    const nice = delegationData.niceToHave.map((s) => s.trim()).filter(Boolean);
    return {
      persona: {
        title: 'Target Persona & Iconic Scene',
        content: [
          delegationData.persona.trim() && `Persona (who is the user): ${delegationData.persona.trim()}`,
          (delegationData.scene || '').trim() && `Iconic scene (when they need this): ${delegationData.scene.trim()}`,
        ].filter(Boolean).join('\n\n'),
      },
      mvp: {
        title: 'Initial Launch Scope & Flexibility (MVP guardrails)',
        content: [
          must.length > 0 && `Must-have scope:\n${must.map((s) => `- ${s}`).join('\n')}`,
          nice.length > 0 && `Nice-to-have (deferred):\n${nice.map((s) => `- ${s}`).join('\n')}`,
        ].filter(Boolean).join('\n\n'),
      },
      metrics: {
        title: 'Success Metrics (Quantitative)',
        content: [
          delegationData.metricName.trim() &&
            `Primary metric: within ${delegationData.metricDays} days, "${delegationData.metricName.trim()}" reaches ${delegationData.metricTarget}`,
          (delegationData.secondaryMetrics || []).some((s) => s.trim()) &&
            `Supporting metrics:\n${(delegationData.secondaryMetrics || []).map((s) => s.trim()).filter(Boolean).map((s) => `- ${s}`).join('\n')}`,
          (delegationData.metricNotes || '').trim() &&
            `Measurement definition & guardrails:\n${(delegationData.metricNotes || '').trim()}`,
        ].filter(Boolean).join('\n\n'),
      },
    };
  }, [delegationData]);

  useEffect(() => {
    if (!scoresLoaded) return;
    const timer = setTimeout(() => {
      (Object.keys(delegationSections) as (keyof typeof delegationSections)[]).forEach((k) => {
        const { title, content } = delegationSections[k];
        const trimmed = content.trim();
        if (trimmed.length <= 10) return;
        const key = `delegation_${k}`;
        const currentHash = hashContent(trimmed);
        if (pillarScores[key]?.hash !== currentHash && !scoring[key] && !scoreAttempted.current.has(`${key}:${currentHash}`)) {
          scorePillar(key, title, trimmed);
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [scoresLoaded, delegationSections, pillarScores, scoring, scorePillar]);

  const epicTickets = (tickets || []).filter((tk: any) => tk.tier === 'Epic');
  // Clicking an Issued Epic opens its detail in place (same selection state the
  // lifecycle pages use, so registry navigation to an Epic lands here too).
  const selectedEpicId = phaseStates['initiative']?.selectedTicketId;
  const selectedEpic = epicTickets.find((e: any) => e.id === selectedEpicId);
  const pillarsFilled = Object.values(pillarData).every(val => val.length > 10);
  // Real stats for the Initiative panel.
  const pillarKeys = Object.keys(pillarData);
  const filledPillarCount = pillarKeys.filter(k => (pillarData[k as keyof PillarData] || '').length > 10).length;
  const strategicFit = Math.round((filledPillarCount / pillarKeys.length) * 100);
  const agentsReady = getAgentRoles({ activeOnly: true }).length;
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

  // Bridge to execution: combine (don't overwrite) the brainstorm synthesis into the
  // backing Briefs FILES, then re-read so the UI + Files & Assets stay in sync.
  const writeDoc = (filePath: string, content: string) =>
    fetch('/api/documents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: filePath, content }) });

  // Persist manual Delegation & Guardrails edits (debounced). Previously only the
  // brainstorm "Add to Delegation" path wrote the briefs, so hand-typed edits were
  // lost on reload.
  useEffect(() => {
    if (!delegationHydrated.current) return;
    if (JSON.stringify(delegationData) === JSON.stringify(EMPTY_DELEGATION)) return;
    const timer = setTimeout(() => {
      const d = delegationData;
      const mustHave = d.mustHave.map((s) => s.trim()).filter(Boolean);
      const niceToHave = d.niceToHave.map((s) => s.trim()).filter(Boolean);
      void Promise.all([
        d.persona.trim() && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.persona}`, `# Target Persona\n\n${d.persona.trim()}`),
        (d.scene || '').trim() && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.scene}`, `# Iconic Scene\n\n${d.scene.trim()}`),
        (mustHave.length || niceToHave.length) && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.guardrails}`,
          `# MVP Guardrails\n\n## Must-Have\n${mustHave.map((x) => `- ${x}`).join('\n')}\n\n## Nice-to-Have\n${niceToHave.map((x) => `- ${x}`).join('\n')}`),
        (d.metricName.trim() || d.metricTarget) && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.metric}`, metricMarkdown(d)),
      ].filter(Boolean));
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delegationData]);

  const handleAddToStrategic = async (p: Record<string, string>) => {
    const changed: { k: keyof PillarData; content: string }[] = [];
    await Promise.all((Object.keys(PILLAR_FILES) as (keyof PillarData)[]).map(async (k) => {
      const incoming = (p?.[k] || '').trim();
      if (!incoming) return;
      const existing = (pillarData[k] || '').trim();
      const combined = existing ? `${existing}\n\n${incoming}` : incoming;
      await writeDoc(`${BRIEFS_DIR}/${PILLAR_FILES[k]}`, `# ${PILLAR_TITLES[k]}\n\n${combined}`);
      changed.push({ k, content: combined });
    }));
    await loadPillars();
    changed.forEach(({ k, content }) => scorePillar(k, PILLAR_TITLES[k], content)); // re-rate updated pillars
    setExpandedPhases(prev => prev.includes('strategic') ? prev : [...prev, 'strategic']);
  };

  const handleAddToDelegation = async (d: any) => {
    if (!d) return;
    const asArr = (x: any) => Array.isArray(x) ? x : (x ? [String(x)] : []);
    const combineList = (a: string[] = [], b: string[] = []) =>
      Array.from(new Set([...a, ...b].map(s => (s || '').trim()).filter(Boolean)));

    // Singular fields take the latest synthesis (so persona/scene solidify instead of
    // staying stuck on an early stub); the must/nice lists accumulate.
    const persona = (d.persona || delegationData.persona || '').trim();
    const scene = (d.scene || delegationData.scene || '').trim();
    const mustHave = combineList(delegationData.mustHave, asArr(d.mustHave));
    const niceToHave = combineList(delegationData.niceToHave, asArr(d.niceToHave));
    const metricDays = Number(d.metricDays) || delegationData.metricDays || 30;
    const metricName = (d.metricName || delegationData.metricName || '').trim();
    const metricTarget = Number(d.metricTarget) || delegationData.metricTarget || 0;
    const secondaryMetrics = combineList(delegationData.secondaryMetrics || [], asArr(d.secondaryMetrics));
    const metricNotes = (d.metricNotes || delegationData.metricNotes || '').trim();

    await Promise.all([
      persona && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.persona}`, `# Target Persona\n\n${persona}`),
      scene && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.scene}`, `# Iconic Scene\n\n${scene}`),
      (mustHave.length || niceToHave.length) && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.guardrails}`,
        `# MVP Guardrails\n\n## Must-Have\n${mustHave.map(x => `- ${x}`).join('\n')}\n\n## Nice-to-Have\n${niceToHave.map(x => `- ${x}`).join('\n')}`),
      (metricName || metricTarget) && writeDoc(`${BRIEFS_DIR}/${DELEGATION_FILES.metric}`,
        metricMarkdown({ ...delegationData, metricDays, metricName, metricTarget, secondaryMetrics, metricNotes })),
    ].filter(Boolean));

    await loadDelegation();
    setExpandedPhases(prev => prev.includes('delegation') ? prev : [...prev, 'delegation']);
  };

  const handleInitializeEpic = async () => {
    setIsInitializing(true);
    try {
        // 1. LLM breakdown: Epic = the WHY (goal/outcome). Stories are NOT created at
        //    issuance — the epic is perfected first, and stories are imagined from it later.
        const bres = await fetch('/api/initiative/breakdown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pillars: pillarData, delegation: delegationData, projectName: activeProjectName }),
        });
        const bd = await bres.json();
        const epicTitle = (bd.success && bd.epicTitle) || activeProjectName;
        const epicSummary = (bd.success && bd.epicSummary) || pillarSummaries.problem;

        // 2. Create ONLY the Epic (the WHY). Its strategy spec rides along as the
        //    attached document; the briefs themselves stay in Files & Assets — no
        //    Document-tier child tickets, and no Stories (those come later, once
        //    the epic is solidified).
        const epicRes = await fetch('/api/tickets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tier: 'Epic',
                title: epicTitle,
                description: epicSummary,
                document_content: JSON.stringify({ pillars: pillarData, delegation: delegationData }),
                document_name: `Strategy: ${activeProjectName}`,
                status: 'Todo',
            })
        });
        await epicRes.json();

        window.location.reload();
    } catch (err) {
        console.error(err);
    } finally {
        setIsInitializing(false);
    }
  };

  const sidebarContent = (
    <div className="space-y-6 text-left">
       <div className="bg-amber-600/5 border border-amber-500/10 rounded-2xl p-5 space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-500">Initiative Stats</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-0.5">
                <div className="text-xl font-bold text-foreground tabular-nums">
                    {strategicFit}%
                </div>
                <div className="text-[8px] font-bold uppercase text-muted-foreground tracking-tighter">Strategic Fit</div>
             </div>
             <div className="space-y-0.5">
                <div className="text-xl font-bold text-foreground tabular-nums">{agentsReady}</div>
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
      headerAction={
        <button
          onClick={() => setShowCreateEpic(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-amber-900/20 transition-colors active:scale-95"
        >
          <Plus size={16} />
          <span>{t('new_epic') || 'New Epic'}</span>
        </button>
      }
    >
      <div className="space-y-12 pb-20">

         {/* An Issued Epic is open — show its full detail in place of the strategy board. */}
         {selectedEpic && (
            <TicketDetailView
               ticket={selectedEpic}
               phaseId="initiative"
               onClose={() => setPhaseSelectedTicket('initiative', null)}
            />
         )}

         <div className={cn("space-y-12", selectedEpic && "hidden")}>

         {/* Lower-friction entry: dump raw ideas into a live concept graph, then draft. */}
         <BrainstormSandbox onAddToStrategic={handleAddToStrategic} onAddToDelegation={handleAddToDelegation} />

         <section className="space-y-6">
            <div onClick={() => setExpandedPhases(p => p.includes('strategic') ? p.filter(x => x !== 'strategic') : [...p, 'strategic'])} className="flex items-center gap-4 cursor-pointer group">
               <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg", expandedPhases.includes('strategic') ? "bg-amber-600 text-white shadow-amber-900/20" : "bg-muted text-muted-foreground")}>
                  <Trophy size={20} />
               </div>
               <div className="flex-1 border-b border-border pb-4 group-hover:border-amber-500/30 transition-colors">
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
                    score={pillarScores.problem?.score}
                    scoring={!!scoring.problem}
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
                    score={pillarScores.market?.score}
                    scoring={!!scoring.market}
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
                    score={pillarScores.solution?.score}
                    scoring={!!scoring.solution}
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
                    score={pillarScores.entry?.score}
                    scoring={!!scoring.entry}
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
                    score={pillarScores.feasibility?.score}
                    scoring={!!scoring.feasibility}
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
                    score={pillarScores.roi?.score}
                    scoring={!!scoring.roi}
                    onClick={() => setActivePillar('roi')}
                  />
               </div>
            )}
         </section>

         <section className="space-y-6">
            <div onClick={() => setExpandedPhases(p => p.includes('delegation') ? p.filter(x => x !== 'delegation') : [...p, 'delegation'])} className="flex items-center gap-4 cursor-pointer group">
               <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg", expandedPhases.includes('delegation') ? "bg-amber-600 text-white shadow-amber-900/20" : "bg-muted text-muted-foreground")}>
                  <Activity size={20} />
               </div>
               <div className="flex-1 border-b border-border pb-4 group-hover:border-amber-500/30 transition-colors">
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
                     sectionScores={{
                        persona: pillarScores.delegation_persona,
                        mvp: pillarScores.delegation_mvp,
                        metrics: pillarScores.delegation_metrics,
                     }}
                     sectionScoring={{
                        persona: !!scoring.delegation_persona,
                        mvp: !!scoring.delegation_mvp,
                        metrics: !!scoring.delegation_metrics,
                     }}
                  />
               </div>
            )}
         </section>

         <section className="pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 bg-card border border-border rounded-[2.5rem] shadow-2xl relative overflow-hidden group transition-all hover:border-amber-500/30">
               <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                  <ShieldCheck size={200} className="text-amber-500" />
               </div>
               <div className="space-y-2 relative z-10 text-center md:text-left">
                  <h3 className="text-xl font-bold tracking-tight text-foreground italic">Ready to Bring Your Idea to Life?</h3>
                  <p className="text-xs text-muted-foreground max-w-md leading-relaxed">Launching this epic locks in your strategy and hands the requirements to your AI agents to start building.</p>
               </div>
               <button onClick={handleInitializeEpic} disabled={!pillarsFilled || !delegationFilled || isInitializing} className={cn("relative z-10 px-10 py-4 rounded-2xl font-bold uppercase tracking-[0.2em] text-xs transition-all shadow-xl active:scale-95 flex items-center gap-3", pillarsFilled && delegationFilled ? "bg-amber-600 text-white hover:bg-amber-500 shadow-amber-900/40" : "bg-muted text-muted-foreground cursor-not-allowed opacity-50")}>
                  {isInitializing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('initialize_epic')}<ArrowRight size={18} className="animate-pulse" /></>}
               </button>
            </div>
         </section>

         {/* Issued Epics — the strategic "why" tickets created from this Initiative. */}
         <section className="space-y-5">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-amber-600 text-white shadow-lg"><Trophy size={20} /></div>
               <div className="flex-1 border-b border-border pb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold tracking-tight text-foreground italic uppercase tracking-[0.1em]">Issued Epics</h2>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{epicTickets.length}</span>
               </div>
            </div>
            {epicTickets.length === 0 ? (
               <p className="text-sm text-muted-foreground italic px-2">No epics issued yet — complete the strategy above and click Initialize Epic.</p>
            ) : (
               <div className="space-y-2">
                  {epicTickets.map((e: any) => {
                     const storyCount = (tickets || []).filter((t: any) => t.parent_id === e.id && t.tier === 'Story').length;
                     return (
                        <button key={e.id} onClick={() => setPhaseSelectedTicket('initiative', e.id)} className="w-full text-left flex items-center gap-3 p-4 bg-card border border-border rounded-2xl hover:border-amber-500/40 hover:bg-amber-500/5 transition-all group">
                           <span className="px-2 py-0.5 rounded-md text-[9px] font-bold font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">{e.identifier}</span>
                           <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-bold text-foreground truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">{e.title}</h3>
                              {e.description && <p className="text-[11px] text-muted-foreground truncate">{String(e.description).replace(/[#*]/g, '').trim()}</p>}
                           </div>
                           <span className="text-[10px] text-muted-foreground shrink-0 hidden sm:inline">{storyCount} {storyCount === 1 ? 'story' : 'stories'}</span>
                           <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-muted text-muted-foreground shrink-0">{e.status}</span>
                           <ArrowRight size={14} className="text-muted-foreground/40 group-hover:text-amber-500 transition-colors shrink-0" />
                        </button>
                     );
                  })}
               </div>
            )}
         </section>
         </div>
      </div>

      {activePillar && (
        <StrategicPillarWizard
          pillarId={activePillar}
          initialData={pillarData[activePillar]}
          score={pillarScores[activePillar]?.score}
          feedback={pillarScores[activePillar]?.feedback}
          onSave={async (id, val) => {
            setPillarData(prev => ({ ...prev, [id]: val }));
            setActivePillar(null);
            // Persist the edit to the brief file (the source of truth) and re-rate it.
            await writeDoc(`${BRIEFS_DIR}/${PILLAR_FILES[id]}`, `# ${PILLAR_TITLES[id]}\n\n${val}`);
            scorePillar(id, PILLAR_TITLES[id], val);
          }}
          onClose={() => setActivePillar(null)}
        />
      )}

      {showCreateEpic && (
        <TicketFormModal
          phaseId="initiative"
          tier="Epic"
          title={t('new_epic') || 'New Epic'}
          onClose={() => setShowCreateEpic(false)}
          onCreated={(id) => setPhaseSelectedTicket('initiative', id)}
        />
      )}
    </SystemViewerLayout>
  );
}
