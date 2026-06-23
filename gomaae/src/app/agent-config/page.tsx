'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Bot, 
  Cpu, 
  Play, 
  Settings, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Zap,
  Users,
  X,
  UserPlus,
  Trash2,
  Pause,
  Box
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import { isTicketBlocked, getActiveBlockers, isStartGateSatisfied, getUnitTestTarget } from '@/lib/blocking';
import { buildReviewGroups } from '@/lib/reviewGroups';
import TicketHandler from '@/components/TicketHandler';
import AgentAssignmentRow from '@/components/automation/AgentAssignmentRow';
import BranchReviewCard from '@/components/automation/BranchReviewCard';
import ContainerCard from '@/components/automation/ContainerCard';
import TicketDetailView from '@/components/TicketDetailView';


export default function AgentConfigPage() {
  const { tickets, loading, t, setPhaseSelectedTicket, refreshTickets, phaseStates } = useLifecycle();

  // Selected ticket (opened by clicking a row / container).
  const selectedTicketId = phaseStates['automation']?.selectedTicketId;
  const selectedTicket = (tickets || []).find((tk: any) => tk.id === selectedTicketId);

  // Queue drain: ignite any queued ticket whose dependencies are satisfied.
  // A queued ticket blocked by a not-yet-Done ticket REMAINS in queue; the
  // blocked_by / blocking attributes are never modified here.
  const ignitingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const list = tickets || [];
    for (const tk of list) {
      // UnitTest tickets also wait until their target Task is In Review (code exists).
      if (tk.agent_state === 'Queued' && !isTicketBlocked(tk, list) && isStartGateSatisfied(tk, list) && !ignitingRef.current.has(tk.id)) {
        ignitingRef.current.add(tk.id);
        // Real agent execution (provision -> code -> commit -> review).
        fetch('/api/tickets/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId: tk.id }),
        })
          .then(() => refreshTickets())
          .catch(() => {})
          .finally(() => { ignitingRef.current.delete(tk.id); });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets]);

  // While any container is active, poll so live agent_phase / queue state updates.
  const hasActive = (tickets || []).some((t) => t.agent_state === 'Queued' || t.agent_state === 'Running');
  useEffect(() => {
    if (!hasActive) return;
    const id = setInterval(() => { refreshTickets(); }, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActive]);
  
  // Automation settings
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState(false);
  const [branchingStrategy, setBranchingStrategy] = useState('ticket-id-slug');

  // Governance settings

  // Default AI agent selector (moved here from the AI Engine page). Reads the
  // cached model registry and the current default; grouped by provider.
  const [aiModels, setAiModels] = useState<any[]>([]);
  const [defaultEngine, setDefaultEngine] = useState<string>('');
  useEffect(() => {
    fetch('/api/ai/models').then(r => r.json()).then(d => { if (d.success) setAiModels(d.models || []); }).catch(() => {});
    fetch('/api/config').then(r => r.json()).then(d => { if (d.success) setDefaultEngine(d.config?.default_ai_engine || ''); }).catch(() => {});
  }, []);

  const PROVIDER_LABELS: Record<string, string> = {
    anthropic: 'Anthropic', google: 'Antigravity', openai: 'OpenAI', ollama: 'Meta / Ollama',
  };
  const modelsByProvider = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const m of aiModels) (groups[m.providerId] ||= []).push(m);
    return groups;
  }, [aiModels]);

  const handleSetDefaultEngine = async (modelId: string) => {
    setDefaultEngine(modelId);
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_ai_engine: modelId }),
      });
    } catch (err) {
      console.error('Failed to set default engine:', err);
    }
  };

  // Active agent containers = tickets currently held by an agent (Queued/Running).
  const containers = useMemo(
    () => (tickets || []).filter((t: any) => t.agent_state),
    [tickets],
  );

  // UI State: Collapsible Sections
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  const toggleSection = (status: string) => {
    setCollapsedSections(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleToggleAutoTrigger = async () => {
    const nextValue = !autoTriggerEnabled;
    setAutoTriggerEnabled(nextValue);
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto_trigger_enabled: nextValue ? 'true' : 'false' })
        });
    } catch (err) {
        console.error('Failed to persist trigger setting:', err);
    }
  };

  const handlePauseAll = async (status: string, tickets: any[]) => {
    try {
        const promises = tickets.map(t => 
            fetch('/api/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: t.id, status: 'In Review' })
            })
        );
        await Promise.all(promises);
        window.location.reload();
    } catch (err) {
        console.error('Failed to pause all:', err);
    }
  };

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar font-sans text-left transition-colors duration-300">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold italic tracking-tight text-indigo-500 underline decoration-indigo-500/20 underline-offset-8 decoration-4">
             {t('agent_config')}
          </h1>
          <p className="text-muted-foreground mt-2 italic">Map autonomous workers to high-integrity ticket nodes and configure sandbox triggers.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={cn(
             "px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all",
             autoTriggerEnabled ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-muted border-border text-muted-foreground opacity-50"
           )}>
              <Zap size={14} className={cn(autoTriggerEnabled && "animate-pulse")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{autoTriggerEnabled ? 'Auto-Trigger Active' : 'Triggers Paused'}</span>
           </div>
        </div>
      </header>

      {selectedTicket ? (
        <TicketDetailView
          ticket={selectedTicket}
          phaseId="automation"
          onClose={() => setPhaseSelectedTicket('automation', null)}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Agent Assignment View */}
        <div className="lg:col-span-2 space-y-8">
          {/* Default AI Agent — top of the middle panel, aligned with the side panel. */}
          <section className="bg-card border border-border rounded-3xl p-6 shadow-xl border-t-4 border-t-amber-500">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl border border-border bg-card shadow-sm text-amber-500"><Cpu size={18} /></div>
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Product Management AI Supporter</h2>
                  <p className="text-[11px] text-muted-foreground italic mt-0.5">The LLM that backs the lifecycle pages — Initiative brainstorming, synthesis, scoring &amp; more.</p>
                </div>
              </div>
              {aiModels.length === 0 ? (
                <span className="text-[10px] text-muted-foreground italic uppercase tracking-widest opacity-60">
                  No models found — configure providers on the AI Engine page
                </span>
              ) : (
                <div className="relative">
                  <select
                    value={defaultEngine}
                    onChange={(e) => handleSetDefaultEngine(e.target.value)}
                    className="appearance-none bg-muted/50 border border-border rounded-xl pl-4 pr-10 py-2.5 text-xs font-bold text-foreground outline-none focus:ring-2 focus:ring-amber-500/30 min-w-[280px] cursor-pointer"
                  >
                    <option value="">— Select supporter —</option>
                    {Object.keys(modelsByProvider).map((pid) => (
                      <optgroup key={pid} label={PROVIDER_LABELS[pid] || pid}>
                        {modelsByProvider[pid].map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronRight size={14} className="rotate-90 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>
              )}
            </div>
          </section>
          {(() => {
                const searchQuery = ""; // Simplified as it was managed by TicketHandler
                // Filter and Sort according to requirements
                const displayTickets = (tickets || [])
                  .filter(task => {
                    // Tasks and their test tickets only — Stories are planning artifacts, not agent work
                    if (!['Task', 'QA', 'UnitTest'].includes(task.tier)) return false;
                    
                    if (task.status === 'Done' && task.updated_at) {
                        const updatedDate = new Date(task.updated_at);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return updatedDate > sevenDaysAgo;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    const getOrder = (status: string | null | undefined) => {
                      if (!status) return 5;
                      const s = status.toLowerCase().replace(/\s+/g, '');
                      if (s === 'todo') return 1;
                      if (s === 'inprogress') return 2;
                      if (s === 'inreview') return 3;
                      if (s === 'done') return 4;
                      return 5;
                    };

                    return getOrder(a.status) - getOrder(b.status);
                  });

                // Branch review groups: test tickets share their Task's branch, so
                // the "In Review" stage is shown as one card per branch (owner +
                // tests combined) rather than separate rows. A group surfaces once
                // any member is In Review.
                const reviewGroups = buildReviewGroups(
                  (tickets || []).filter((t: any) => ['Task', 'QA', 'UnitTest'].includes(t.tier))
                ).filter((g) => g.inReviewCount > 0);

                // Build task→QA pairs across ALL displayTickets so QA tickets always
                // appear inline with their parent task, regardless of status section.
                const allDisplayTickets = tickets || [];
                const taskQaMap = new Map<string, any[]>(); // taskId → QA/UnitTest tickets
                const qaShownWithTask = new Set<string>();
                for (const t of displayTickets.filter(t => t.tier === 'Task')) {
                  const qas = allDisplayTickets.filter((q: any) =>
                    (q.tier === 'QA' || q.tier === 'UnitTest') &&
                    (q.parent_id === t.id || q.linked_ticket_id === t.identifier || q.linked_ticket_id === t.id)
                  );
                  if (qas.length > 0) {
                    taskQaMap.set(t.id, qas);
                    qas.forEach((q: any) => qaShownWithTask.add(q.id));
                  }
                }

                return (
                  <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl transition-colors duration-300">
                    <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                       <div className="flex items-center gap-3">
                          <Cpu size={18} className="text-indigo-500" />
                          <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Worker Assignment Registry</h2>
                       </div>
                       <div className="relative">
                          <input
                            type="text"
                            placeholder="Filter registry..."
                            value={searchQuery}
                            readOnly
                            className="bg-card border border-border rounded-xl px-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 font-medium italic opacity-50 cursor-not-allowed"
                          />
                       </div>
                    </div>
                  <div className="divide-y divide-border/50">
                     {['Todo', 'In Progress', 'In Review', 'Done'].map(status => {
                       const norm = (s: string | null | undefined) => (s || '').toLowerCase().replace(/\s+/g, '');
                       // Exclude QA tickets that are shown inline with their parent task
                       const sectionTickets = displayTickets.filter(t =>
                         norm(t.status) === norm(status) && !qaShownWithTask.has(t.id)
                       );
                       // In Review is shown as branch review cards (grouped), not rows.
                       const isReviewStage = status === 'In Review';
                       const sectionCount = isReviewStage ? reviewGroups.length : sectionTickets.length;
                       if (sectionCount === 0 && status === 'Done') return null; // Hide empty done section

                       const isCollapsed = collapsedSections.includes(status);

                       return (
                         <div key={status} className="flex flex-col">
                            <div className="px-6 py-3 bg-muted/20 hover:bg-muted/40 flex items-center justify-between transition-colors group">
                               <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSection(status)}>
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    status === 'Todo' ? "bg-amber-500" :
                                    status === 'In Progress' ? "bg-blue-500" :
                                    status === 'In Review' ? "bg-pink-500" : "bg-green-500"
                                  )} />
                                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground opacity-80">{isReviewStage ? 'In Review · Branches' : status}</span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-card border border-border text-[9px] font-mono text-muted-foreground">{sectionCount}</span>
                               </div>

                               <div className="flex items-center gap-4">
                                  {status === 'Todo' && (
                                     <div className="flex items-center gap-2 pr-4 border-r border-border/50">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Start ToDo tickets automatically</span>
                                        <button
                                          onClick={handleToggleAutoTrigger}
                                          className={cn(
                                            "w-8 h-4 rounded-full relative transition-colors duration-300",
                                            autoTriggerEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"
                                          )}
                                        >
                                          <div className={cn(
                                            "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300",
                                            autoTriggerEnabled ? "translate-x-4" : "translate-x-0"
                                          )} />
                                        </button>
                                     </div>
                                  )}

                                  {status === 'In Progress' && sectionTickets.length > 0 && (
                                     <button
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handlePauseAll(status, sectionTickets);
                                       }}
                                       className="px-2 py-1 rounded bg-muted border border-border hover:bg-foreground/5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground transition-all flex items-center gap-2 mr-2"
                                     >
                                        <Pause size={10} />
                                        Pause All
                                     </button>
                                  )}

                                  <ChevronRight
                                    size={14}
                                    className={cn("text-muted-foreground transition-transform duration-200 cursor-pointer", !isCollapsed && "rotate-90")}
                                    onClick={() => toggleSection(status)}
                                  />
                               </div>
                            </div>

                            {!isCollapsed && isReviewStage && (
                              <div className="p-4 space-y-4 animate-in slide-in-from-top-1 duration-200">
                                 {reviewGroups.map((g) => (
                                   <BranchReviewCard
                                     key={g.branch}
                                     group={g}
                                     onSelectTicket={(id) => setPhaseSelectedTicket('automation', id)}
                                   />
                                 ))}
                                 {reviewGroups.length === 0 && (
                                    <div className="p-10 text-center text-muted-foreground italic text-[10px] uppercase tracking-widest opacity-40">
                                       No branches in review
                                    </div>
                                 )}
                              </div>
                            )}
                            {!isCollapsed && !isReviewStage && (
                              <div className="divide-y divide-border/30 animate-in slide-in-from-top-1 duration-200">
                                 {sectionTickets.map((task) => {
                                   const utTarget = getUnitTestTarget(task, tickets || []);
                                   const awaitingReview = !isStartGateSatisfied(task, tickets || [])
                                     ? (utTarget ? `${utTarget.identifier} review` : 'target task')
                                     : undefined;
                                   const relatedTests = task.tier === 'Task'
                                     ? (taskQaMap.get(task.id) || [])
                                     : [];
                                   return (
                                   <AgentAssignmentRow
                                     key={task.id}
                                     task={task}
                                     onSelect={() => setPhaseSelectedTicket('automation', task.id)}
                                     forceQueue={task.agent_state === 'Queued'}
                                     activeBlockers={getActiveBlockers(task, tickets || [])}
                                     awaitingReview={awaitingReview}
                                     relatedTests={relatedTests}
                                     onSelectTest={(id) => setPhaseSelectedTicket('automation', id)}
                                   />
                                   );
                                 })}
                                 {sectionTickets.length === 0 && (
                                    <div className="p-10 text-center text-muted-foreground italic text-[10px] uppercase tracking-widest opacity-40">
                                       No active signals in {status}
                                    </div>
                                 )}
                              </div>
                            )}
                         </div>
                       );
                     })}
                     {displayTickets.length === 0 && (
                        <div className="p-20 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-50">
                           No tickets available for agentic assignment.
                        </div>
                     )}
                  </div>
                  </div>
                );
          })()}
        </div>

        {/* Sidebar: Containers & Sandbox */}
        <div className="space-y-8">
           {/* Agent Container Registry */}
           <section className="bg-card border border-border rounded-3xl p-6 space-y-5 shadow-xl border-t-4 border-t-blue-500">
              <div className="flex items-center justify-between border-b border-border pb-4">
                 <div className="flex items-center gap-3">
                    <Box size={20} className="text-blue-500" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Agent Containers</h2>
                 </div>
                 <span className="px-1.5 py-0.5 rounded-md bg-card border border-border text-[9px] font-mono text-muted-foreground">{containers.length} active</span>
              </div>

              <div className="space-y-3">
                 {containers.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-[10px] uppercase tracking-widest font-bold opacity-50 italic">
                       No active containers
                    </div>
                 ) : containers.map((c: any) => (
                    <ContainerCard
                       key={c.id}
                       container={c}
                       activeBlockers={getActiveBlockers(c, tickets || [])}
                       onSelect={() => setPhaseSelectedTicket('automation', c.id)}
                    />
                 ))}
              </div>
           </section>

           <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-xl border-t-4 border-t-indigo-500">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                 <Terminal size={20} className="text-indigo-500" />
                 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Sandbox Orchestration</h2>
              </div>
              
              <div className="space-y-4">
                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Branching Strategy</label>
                    <select 
                      value={branchingStrategy}
                      onChange={(e) => setBranchingStrategy(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold italic appearance-none"
                    >
                       <option value="ticket-id-slug">ticket/[id]-[slug]</option>
                       <option value="agent-id">agent/[agent-id]/[id]</option>
                       <option value="flat">flat-queue-branch</option>
                    </select>
                 </div>

                 <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-500">
                       <Database size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Isolated Mount</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                       Repo cloning disabled. project-level repository will be volume-mounted to the sandbox for real-time atomic edits.
                    </p>
                    <div className="text-[8px] font-mono text-indigo-600/60 dark:text-indigo-400/40 truncate">
                       mount --bind /app/repos /sandbox/workspace
                    </div>
                 </div>
              </div>
           </section>

        </div>

      </div>
      )}
    </div>
  );
}
