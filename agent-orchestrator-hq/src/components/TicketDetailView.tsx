'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Clock, 
  User, 
  Tag, 
  Calendar, 
  MessageSquare, 
  GitBranch,
  GitMerge,
  CheckCircle2,
  FileText,
  Eye,
  ArrowRight,
  ShieldCheck,
  Zap,
  Coins,
  Lock,
  Route,
  Activity,
  UserCheck,
  Bot,
  Plus,
  FolderTree,
  Database,
  Code2,
  TableProperties,
  ChevronRight,
  ChevronLeft,
  Rocket,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import DocumentPreview from './DocumentPreview';
import { useLifecycle } from '@/context/LifecycleContext';
import { getStatusBadgeClasses, getAgentStateClasses } from '@/lib/phaseConfig';
import { getBlocking, getUnitTestTarget, isStartGateSatisfied } from '@/lib/blocking';
import { groupOwnerIdentifier, getReviewGroupFor } from '@/lib/reviewGroups';
import { Ticket } from './gantt/types';


interface TicketDetailViewProps {
  ticket: Ticket;
  phaseId: string;
  onClose: () => void;
}

export default function TicketDetailView({ ticket, phaseId, onClose }: TicketDetailViewProps) {
  const { t, tickets: allTickets, setPhaseSelectedTicket, navigatePhaseHistory, phaseStates, getTicketByIdentifier, refreshTickets } = useLifecycle();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [starting, setStarting] = useState(false);
  const [merging, setMerging] = useState(false);

  // Commits on this ticket's dedicated branch (ticket/<identifier>).
  const [commits, setCommits] = useState<{ hash: string; short: string; message: string; author: string; date: string }[]>([]);
  const [branch, setBranch] = useState('');
  const [prs, setPrs] = useState<{ repo: string; number: number | null; url: string; state: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tickets/commits?ticketId=${ticket.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) { setCommits(d.commits || []); setBranch(d.branch || ''); } })
      .catch(() => {});
    fetch(`/api/tickets/prs?ticketId=${ticket.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setPrs(d.prs || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ticket.id, ticket.status, ticket.agent_state]);

  // Online branch (has a synced PR) => platform owns the merge; show a PR link.
  const primaryPrUrl = prs.find((p) => p.url)?.url || '';
  const isOnlineReview = prs.some((p) => p.url);

  const relTime = (iso: string) => {
    const ms = Date.now() - new Date(iso).getTime();
    const m = Math.round(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  const phaseState = phaseStates[phaseId];
  const canGoBack = phaseState.historyIndex > 0;
  const canGoForward = phaseState.historyIndex < phaseState.navigationHistory.length - 1;

  const childTickets = useMemo(() => {
    return allTickets.filter(t => t.parent_id === ticket.id);
  }, [allTickets, ticket.id]);

  const parentTicket = useMemo(() => {
    if (!ticket.parent_id) return null;
    return allTickets.find(t => t.id === ticket.parent_id);
  }, [allTickets, ticket.parent_id]);

  // "Blocking" is derived from other tickets' blocked_by (no stored column).
  const blockingList = useMemo(() => getBlocking(ticket.identifier, allTickets), [ticket.identifier, allTickets]);

  if (!ticket) return null;

  const handleNavigateToIdentifier = (ident: string) => {
    const target = getTicketByIdentifier(ident);
    if (target) {
      setPhaseSelectedTicket(phaseId, target.id);
    }
  };

  const handleNavigateToId = (id: string) => {
    setPhaseSelectedTicket(phaseId, id);
  };

  // Determine if editable based on phase and tier
  const isReadOnly = 
    (phaseId === 'planning' && ticket.tier === 'Epic') ||
    (phaseId === 'development' && ticket.tier === 'Story') ||
    (phaseId === 'testing' && ticket.tier === 'Story') ||
    (phaseId === 'release' && ticket.tier === 'Story');

  const canAddChild = 
    (phaseId === 'planning' && ticket.tier === 'Epic') ||
    (phaseId === 'development' && ticket.tier === 'Story') ||
    (phaseId === 'testing' && ticket.tier === 'Story') ||
    (phaseId === 'release' && ticket.tier === 'Story');

  const childLabel =
    phaseId === 'planning' ? 'Story' :
    phaseId === 'development' ? 'Task' :
    phaseId === 'testing' ? 'QA' : 'Child';

  // --- Agent run flow: To Do/Backlog --(Start)--> agent_state 'Queued' (provision) --> status 'In Progress' ---
  // 'In Queue' is the internal agent_state, NOT a ticket status.
  const isTodoStatus = (s: string) => s === 'To Do' || s === 'Todo' || s === 'ToDo';
  const isQueued = ticket.agent_state === 'Queued';
  // A UnitTest can be queued anytime, but the queue-drain only ignites it once
  // the Task it targets is In Review (its code exists). While queued-and-gated it
  // sits In Queue, exactly like a dependency-blocked ticket.
  const utTarget = getUnitTestTarget(ticket, allTickets);
  const startGateOk = isStartGateSatisfied(ticket, allTickets);
  const awaitingReview = !startGateOk
    ? (utTarget ? `${utTarget.identifier} (currently ${utTarget.status})` : 'the target task, which does not exist yet')
    : null;
  const isGatedInQueue = isQueued && !startGateOk;
  const isStartable = !isReadOnly && !isQueued && (isTodoStatus(ticket.status) || ticket.status === 'Backlog');
  const isProvisioning = starting || isQueued;

  // Review/merge is per BRANCH, not per ticket. Test tickets share their Task's
  // branch, so only the branch owner offers "Approve & Merge", and only once the
  // whole branch is fulfilled (every member In Review).
  const branchOwnerIdentifier = groupOwnerIdentifier(ticket, allTickets);
  const isBranchOwner = branchOwnerIdentifier === ticket.identifier;
  const reviewGroup = getReviewGroupFor(ticket, allTickets);
  const groupFulfilled = !!reviewGroup?.fulfilled;
  const groupPending = reviewGroup?.pending ?? [];
  const groupBranchName = reviewGroup?.branch ?? `ticket/${branchOwnerIdentifier.toLowerCase()}`;

  const handleStart = async () => {
    if (starting || isQueued) return;
    setStarting(true);
    try {
      // 1. Agent claims the ticket -> agent_state 'Queued' (status unchanged, visible immediately).
      await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, agent_state: 'Queued' }),
      });
      await refreshTickets();
      // 2. Run the real agent: provision -> code -> commit -> In Review.
      await fetch('/api/tickets/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      });
      await refreshTickets();
    } catch (e) {
      console.error('[TicketDetailView] Start failed:', e);
    } finally {
      setStarting(false);
    }
  };

  // Approve the review = merge the ticket's branch into the repository -> Done.
  const handleApprove = async () => {
    if (merging) return;
    setMerging(true);
    try {
      await fetch('/api/tickets/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id }),
      });
      await refreshTickets();
    } catch (e) {
      console.error('[TicketDetailView] Approve failed:', e);
    } finally {
      setMerging(false);
    }
  };

  // For Raw Data View - everything in the object
  const rawEntries = Object.entries(ticket).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300 font-sans text-left transition-colors duration-300">
      {/* Header */}
      <div className="p-8 border-b border-border bg-muted/30 flex items-start justify-between">
        <div className="space-y-4 max-w-[80%]">
          <div className="flex items-center gap-4">
             {/* History Navigation Arrows */}
             <div className="flex items-center bg-card border border-border rounded-xl p-0.5 shadow-sm">
                <button 
                  disabled={!canGoBack}
                  onClick={() => navigatePhaseHistory(phaseId, 'back')}
                  className="p-1.5 hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Back"
                >
                   <ChevronLeft size={18} />
                </button>
                <div className="w-px h-4 bg-border" />
                <button 
                  disabled={!canGoForward}
                  onClick={() => navigatePhaseHistory(phaseId, 'forward')}
                  className="p-1.5 hover:bg-muted disabled:opacity-20 disabled:cursor-not-allowed rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Forward"
                >
                   <ChevronRight size={18} />
                </button>
             </div>

             <span className={cn(
               "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border shadow-lg transition-colors",
               ticket.tier === 'Epic' ? "bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/30" :
               ticket.tier === 'Story' ? "bg-blue-500/10 text-blue-600 dark:text-blue-500 border-blue-500/30" :
               "bg-muted text-muted-foreground border-border"
             )}>
               {ticket.identifier}
             </span>
             {isReadOnly && (
                <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 text-[9px] font-bold uppercase tracking-tighter border border-slate-500/20">
                   Input Asset (Read-Only)
                </span>
             )}
             <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border transition-colors",
                getStatusBadgeClasses(ticket.status)
             )}>
                {ticket.status}
             </span>
             {ticket.agent_state && (
                <span className={cn(
                   "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-tighter border transition-colors flex items-center gap-1",
                   getAgentStateClasses(ticket.agent_state)
                )}>
                   {ticket.agent_state === 'Queued' && <Loader2 size={9} className="animate-spin" />}
                   Agent: {ticket.agent_state === 'Queued' ? 'In Queue' : ticket.agent_state}
                </span>
             )}
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-foreground leading-tight italic decoration-blue-500/20 underline underline-offset-8">
            {ticket.title}
          </h2>
          <div className="flex items-center gap-2">
            {(isStartable || isProvisioning) && (
                <button
                    onClick={handleStart}
                    disabled={isProvisioning}
                    title={isGatedInQueue ? `In queue — waiting for ${awaitingReview} to reach In Review before this unit test runs.` : undefined}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 text-white",
                        isGatedInQueue ? "bg-fuchsia-600 cursor-default"
                          : isProvisioning ? "bg-amber-600 cursor-wait"
                          : "bg-emerald-600 hover:bg-emerald-500"
                    )}
                >
                    {isGatedInQueue ? <Lock size={14} /> : isProvisioning ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />}
                    {isGatedInQueue ? 'In Queue · Awaiting Review' : isProvisioning ? 'Provisioning…' : 'Start'}
                </button>
            )}
            {ticket.status === 'In Review' && isBranchOwner && isOnlineReview && (
                <a
                    href={primaryPrUrl || '#'}
                    target="_blank"
                    rel="noreferrer"
                    title="Connected to GitHub — approve & merge on the platform; the ticket completes when the PR is merged."
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 text-white bg-foreground/90 hover:bg-foreground"
                >
                    <GitBranch size={14} /> Approve &amp; Merge on GitHub
                </a>
            )}
            {ticket.status === 'In Review' && isBranchOwner && !isOnlineReview && (
                <button
                    onClick={handleApprove}
                    disabled={merging || !groupFulfilled}
                    title={groupFulfilled
                      ? `Merge ${groupBranchName} into the repository and complete ${reviewGroup?.total ?? 1} ticket(s)`
                      : `Awaiting ${groupPending.map((t) => t.identifier).join(', ')} before ${groupBranchName} can merge`}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 text-white disabled:cursor-not-allowed",
                      groupFulfilled ? "bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-wait" : "bg-muted text-muted-foreground shadow-none"
                    )}
                >
                    {merging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
                    {merging ? 'Merging…' : groupFulfilled ? 'Approve & Merge' : `Awaiting ${groupPending.length} ticket${groupPending.length === 1 ? '' : 's'}`}
                </button>
            )}
            {ticket.status === 'In Review' && !isBranchOwner && (
                <div
                    title={`This test ticket is written on ${groupBranchName} and is merged together with ${branchOwnerIdentifier}.`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400"
                >
                    <GitBranch size={14} />
                    On {groupBranchName} · merges with {branchOwnerIdentifier}
                </div>
            )}
            {canAddChild && (
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95">
                    <Plus size={14} />
                    Generate {childLabel}
                </button>
            )}
            <button 
                onClick={() => setShowRawData(!showRawData)}
                className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                    showRawData ? "bg-purple-600 text-white border-purple-400 shadow-lg" : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                )}
            >
                <TableProperties size={14} />
                {showRawData ? 'Hide Raw Data' : 'Inspect Columns'}
            </button>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-3 hover:bg-muted rounded-2xl text-muted-foreground hover:text-foreground transition-all active:scale-90"
        >
          <X size={24} />
        </button>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-border min-h-[600px]">
        {/* Left Side: Body & High-Integrity Context */}
        <div className="lg:col-span-2 p-8 space-y-12 overflow-y-auto custom-scrollbar h-[800px]">
           
           {showRawData ? (
             <section className="space-y-4 animate-in fade-in duration-300">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                   <Database size={14} className="text-purple-500" />
                   Raw Registry Column Audit
                </h3>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-inner font-mono text-[10px]">
                   <table className="w-full text-left border-collapse">
                      <thead>
                         <tr className="bg-muted/50 text-muted-foreground uppercase tracking-widest">
                            <th className="px-4 py-3 border-b border-border">Column Key</th>
                            <th className="px-4 py-3 border-b border-border">Stored Value</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                         {rawEntries.map(([key, val]) => (
                            <tr key={key} className="hover:bg-muted/20 transition-colors">
                               <td className="px-4 py-2 text-foreground font-bold opacity-70">{key}</td>
                               <td className="px-4 py-2 text-foreground break-all">{val === null ? <span className="text-muted-foreground italic opacity-50">NULL</span> : String(val)}</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </section>
           ) : (
             <>
               {/* Document Link Widget */}
               {ticket.document_name && (
                 <section className="space-y-4 animate-in slide-in-from-top-2 duration-500">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <FileText size={14} />
                       {isReadOnly ? 'Associated Intelligence' : t('linked_docs')}
                    </h3>
                    <div 
                       onClick={() => setIsPreviewOpen(!isPreviewOpen)}
                       className="bg-blue-600/5 border border-blue-500/20 p-5 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-blue-600/10 transition-all shadow-lg"
                    >
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-card rounded-xl flex items-center justify-center border border-border text-blue-500 shadow-inner group-hover:scale-105 transition-transform">
                             <FileText size={22} />
                          </div>
                          <div>
                             <div className="font-bold text-foreground">{ticket.document_name}</div>
                             <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter">{ticket.document_type} versioning active</div>
                          </div>
                       </div>
                       <div className="flex items-center gap-2 text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={12} />
                          {isPreviewOpen ? 'Hide Preview' : 'Show Preview'}
                       </div>
                    </div>

                    {isPreviewOpen && (
                      <div className="mt-6 border-t border-border pt-6">
                        <DocumentPreview 
                           doc={{ 
                             name: ticket.document_name!, 
                             type: ticket.document_type as any, 
                             content: ticket.document_content! 
                           }} 
                           onClose={() => setIsPreviewOpen(false)}
                        />
                      </div>
                    )}
                 </section>
               )}

               {/* Hierarchy Section */}
               {(parentTicket || childTickets.length > 0) && (
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <FolderTree size={14} />
                       Node Hierarchy Traceability
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                       {parentTicket && (
                         <div className="space-y-2">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Parent Node</div>
                            <div 
                              onClick={() => handleNavigateToId(parentTicket.id)}
                              className="p-4 bg-muted/30 border border-border rounded-xl flex items-center justify-between group cursor-pointer hover:bg-blue-600/5 transition-all shadow-sm"
                            >
                               <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-bold bg-muted px-2 py-0.5 rounded border border-border">{parentTicket.identifier}</span>
                                  <span className="text-sm font-semibold text-foreground/80 group-hover:text-foreground">{parentTicket.title}</span>
                               </div>
                               <ArrowRight size={14} className="text-muted-foreground group-hover:text-blue-500" />
                            </div>
                         </div>
                       )}

                       {childTickets.length > 0 && (
                         <div className="space-y-2">
                            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Nested Child Nodes ({childTickets.length})</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {childTickets.map(ct => (
                                 <div 
                                    key={ct.id}
                                    onClick={() => handleNavigateToId(ct.id)}
                                    className="p-3 bg-card border border-border rounded-xl flex items-center justify-between group cursor-pointer hover:border-blue-500/30 transition-all shadow-sm"
                                 >
                                    <div className="flex flex-col overflow-hidden">
                                       <span className="text-[8px] font-bold text-muted-foreground uppercase">{ct.identifier}</span>
                                       <span className="text-xs font-bold text-foreground/80 group-hover:text-foreground truncate">{ct.title}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-muted-foreground group-hover:text-blue-500 shrink-0" />
                                 </div>
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                 </section>
               )}

               <section className="space-y-4 text-left">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <MessageSquare size={14} />
                     {isReadOnly ? 'Contextual Brief' : t('requirement_brief')}
                  </h3>
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap font-medium bg-muted/30 p-6 rounded-2xl border border-border shadow-inner italic">
                     {ticket.description || 'No detailed documentation provided.'}
                  </div>
               </section>

               {/* Framework Specific: Security & Scope */}
               {!isReadOnly && (ticket.resource_scope || ticket.mutation_scope) && (
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Lock size={14} className="text-red-500/50" />
                       Security & Authorization Scope
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                       <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
                          <div className="space-y-2">
                             <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Resource Read Access (VFS)</div>
                             <div className="flex flex-wrap gap-2">
                                {ticket.resource_scope?.split(',').map((p: string, i: number) => (
                                   <span key={i} className="px-2 py-1 bg-muted rounded-lg text-[10px] font-mono text-muted-foreground border border-border">{p.trim()}</span>
                                ))}
                             </div>
                          </div>
                          <div className="space-y-2">
                             <div className="text-[9px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest px-1">Mutation Authorization (Write)</div>
                             <div className="flex flex-wrap gap-2">
                                {ticket.mutation_scope?.split(',').map((p: string, i: number) => (
                                   <span key={i} className="px-2 py-1 bg-amber-500/10 rounded-lg text-[10px] font-mono text-amber-600 dark:text-amber-500 border border-amber-500/20">{p.trim()}</span>
                                ))}
                             </div>
                          </div>
                       </div>
                    </div>
                 </section>
               )}

               {/* Dependency Logic */}
               {(ticket.blocked_by || blockingList.length > 0) && (
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Route size={14} />
                       Critical Path & Dependencies
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div className={cn("p-4 rounded-xl border flex flex-col gap-1 transition-all", ticket.blocked_by ? "bg-red-500/5 border-red-500/20" : "bg-muted/30 border-border")}>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Blocked By</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                             {ticket.blocked_by ? (
                                ticket.blocked_by.split(',').map(ident => (
                                  <button 
                                    key={ident}
                                    onClick={() => handleNavigateToIdentifier(ident.trim())}
                                    className="text-xs font-bold flex items-center gap-2 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all"
                                  >
                                     <Lock size={12} className="text-red-500" />
                                     <span>{ident.trim()}</span>
                                  </button>
                                ))
                             ) : (
                                <span className="text-muted-foreground italic font-normal text-xs">No blockers identified</span>
                             )}
                          </div>
                       </div>
                       <div className={cn("p-4 rounded-xl border flex flex-col gap-1 transition-all", blockingList.length ? "bg-blue-500/5 border-blue-500/20" : "bg-muted/30 border-border")}>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Blocking Execution Of</span>
                          <div className="flex flex-wrap gap-2 mt-1">
                             {blockingList.length ? (
                                blockingList.map(ident => (
                                  <button
                                    key={ident}
                                    onClick={() => handleNavigateToIdentifier(ident)}
                                    className="text-xs font-bold flex items-center gap-2 bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 transition-all"
                                  >
                                     <ArrowRight size={12} className="text-blue-500" />
                                     <span>{ident}</span>
                                  </button>
                                ))
                             ) : (
                                <span className="text-muted-foreground italic font-normal text-xs">Not currently blocking downstream tasks</span>
                             )}
                          </div>
                       </div>
                    </div>
                 </section>
               )}

               {/* Branch Commits (linked to this ticket's dedicated branch) */}
               {commits.length > 0 && (
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <GitBranch size={14} className="text-violet-500" />
                       Branch Commits
                       <span className="font-mono text-[9px] bg-muted border border-border rounded px-1.5 py-0.5 text-muted-foreground normal-case tracking-normal">{branch}</span>
                       <span className="text-[9px] font-mono text-muted-foreground">({commits.length})</span>
                    </h3>
                    <div className="rounded-xl border border-border overflow-hidden divide-y divide-border/50">
                       {commits.map(cm => (
                          <div key={cm.hash} className="flex items-center gap-3 p-3 bg-muted/20 hover:bg-muted/40 transition-colors">
                             <span className="font-mono text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded px-1.5 py-0.5 shrink-0">{cm.short}</span>
                             <span className="text-xs text-foreground/90 font-medium flex-1 truncate">{cm.message}</span>
                             <span className="text-[9px] text-muted-foreground font-mono shrink-0 hidden md:block max-w-[140px] truncate">{cm.author}</span>
                             <span className="text-[9px] text-muted-foreground/70 shrink-0">{relTime(cm.date)}</span>
                          </div>
                       ))}
                    </div>
                 </section>
               )}

               {/* Linked Ticket (Traceability) */}
               {ticket.linked_ticket_id && (
                 <section className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Zap size={14} className="text-pink-500" />
                       Registry Traceability Link
                    </h3>
                    <div 
                      onClick={() => handleNavigateToIdentifier(ticket.linked_ticket_id!)}
                      className="p-4 bg-pink-500/5 border border-pink-500/20 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-pink-500/10 transition-all shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                           <ShieldCheck size={18} className="text-pink-500" />
                           <div>
                              <div className="text-[10px] font-bold text-pink-600 dark:text-pink-400 uppercase tracking-widest">Linked Implementation Node</div>
                              <div className="text-sm font-bold text-foreground">Verify Identifier: {ticket.linked_ticket_id}</div>
                           </div>
                        </div>
                        <ArrowRight size={16} className="text-pink-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                 </section>
               )}
             </>
           )}
        </div>

        {/* Right Side: High-Integrity Metadata */}
        <div className="p-8 space-y-8 bg-muted/20">
           {/* FinOps Governance */}
           {!isReadOnly && (
             <div className="space-y-6">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                   <Coins size={14} className="text-amber-500" />
                   FinOps Governance
                </h4>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                         <span className="text-muted-foreground">Token Consumption</span>
                         <span className="text-foreground">{ticket.actual_token_usage || 0} / {ticket.expected_token_usage || 0}</span>
                      </div>
                      <div className="h-1.5 bg-card rounded-full overflow-hidden border border-border shadow-inner">
                         <div 
                           className={cn("h-full transition-all duration-1000", (Number(ticket.actual_token_usage || 0) / Number(ticket.expected_token_usage || 1)) > 0.9 ? "bg-red-500" : "bg-amber-500")}
                           style={{ width: `${Math.min((Number(ticket.actual_token_usage || 0) / Number(ticket.expected_token_usage || 1)) * 100, 100)}%` }} 
                         />
                      </div>
                   </div>
                </div>
             </div>
           )}

           {/* AI Agent Specifications */}
           {!isReadOnly && (
             <div className="space-y-6 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                   <Zap size={14} className="text-blue-500" />
                   Agent Specification
                </h4>
                <div className="space-y-4">
                   <MetaItem icon={<UserCheck size={14} />} label="Assigned Role" value={ticket.llm_role || 'Generalist'} />
                   <MetaItem icon={<Bot size={14} />} label="Mandated Model" value={ticket.authorized_model || 'System Default'} />
                   <MetaItem icon={<ShieldCheck size={14} />} label="Personality Vector" value={ticket.personality_vector || 'none'} />
                </div>
             </div>
           )}

           {/* Temporal Context */}
           <div className="space-y-6 pt-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                 <Calendar size={14} className="text-emerald-500" />
                 Temporal Context
              </h4>
              <div className="space-y-4">
                 <MetaItem icon={<Clock size={14} />} label="Earliest Start" value={new Date(ticket.start_date).toLocaleDateString()} />
                 <MetaItem icon={<CheckCircle2 size={14} />} label="Target Delivery" value={new Date(ticket.due_date).toLocaleDateString()} />
                 <MetaItem icon={<Activity size={14} />} label="TTL Deadline" value={ticket.ttl ? new Date(ticket.ttl).toLocaleString() : 'Permanent'} />
                 <MetaItem icon={<RotateCcw size={14} className="text-muted-foreground" />} label="Last Registry Sync" value={new Date(ticket.updated_at).toLocaleString()} />
              </div>
           </div>

           <div className="pt-8 border-t border-border">
              <div className={cn("p-4 rounded-2xl space-y-2 border", isReadOnly ? "bg-blue-500/5 border-blue-500/10" : "bg-amber-600/5 border-amber-500/10")}>
                 <h5 className={cn("text-[10px] font-bold uppercase tracking-widest", isReadOnly ? "text-blue-500" : "text-amber-500")}>
                    {isReadOnly ? 'Upstream Requirement' : t('locked_stage')}
                 </h5>
                 <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                    {isReadOnly ? 'This asset is a finalized output from a previous stage and is used here as a technical constraint.' : t('locked_desc')}
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function RotateCcw({ size, className }: { size: number, className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
        </svg>
    )
}

function MetaItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 font-sans text-left transition-colors duration-300">
       <div className="text-muted-foreground/60">{icon}</div>
       <div className="overflow-hidden">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter leading-none">{label}</div>
          <div className="text-[11px] font-bold text-foreground mt-0.5 truncate">{value}</div>
       </div>
    </div>
  );
}
