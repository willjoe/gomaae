'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Clock,
  User,
  Paperclip,
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
import TicketFormModal from './TicketFormModal';
import { useLifecycle } from '@/context/LifecycleContext';
import { getStatusBadgeClasses, getAgentStateClasses } from '@/lib/phaseConfig';
import { getBlocking, getUnitTestTarget, isStartGateSatisfied, getBlockingPhase } from '@/lib/blocking';
import { scoreColor } from '@/components/initiative/PillarCard';
import { groupOwnerIdentifier, getReviewGroupFor } from '@/lib/reviewGroups';
import { Ticket } from './gantt/types';
import EvidencePanel from './EvidencePanel';
import TicketChat from './TicketChat';


interface TicketDetailViewProps {
  ticket: Ticket;
  phaseId: string;
  onClose: () => void;
}

export default function TicketDetailView({ ticket, phaseId, onClose }: TicketDetailViewProps) {
  const { t, tickets: allTickets, setPhaseSelectedTicket, navigatePhaseHistory, phaseStates, getTicketByIdentifier, refreshTickets } = useLifecycle();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  // "Add Story" from an Epic's hierarchy section.
  const [showAddChild, setShowAddChild] = useState(false);
  const [starting, setStarting] = useState(false);
  const [merging, setMerging] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [generatingChildren, setGeneratingChildren] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Commits on this ticket's dedicated branch (ticket/<identifier>).
  const [commits, setCommits] = useState<{ hash: string; short: string; message: string; author: string; date: string }[]>([]);
  const [branch, setBranch] = useState('');
  const [prs, setPrs] = useState<{ repo: string; number: number | null; url: string; state: string }[]>([]);
  // Comments synced from the tracker (Linear), with any attachments saved to Files & Assets.
  const [comments, setComments] = useState<{ id: string; author: string; body: string; created_at: string; attachments: { name: string; path: string; url: string }[] }[]>([]);
  // Fulfillment score (0-100) + feedback — tier-specific bar (Epic=WHY, Story=WHAT,
  // Task=HOW, Test=proof of the parent Task's DoD). The POST is idempotent: the API
  // returns the stored score without an LLM call when the ticket hasn't changed.
  const [ticketScore, setTicketScore] = useState<{ score: number; feedback: string } | null>(null);
  const [scoringTicket, setScoringTicket] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setTicketScore(null);
    fetch(`/api/tickets/score?ticketId=${ticket.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success && d.scores[ticket.id]) setTicketScore(d.scores[ticket.id]); })
      .catch(() => {});
    setScoringTicket(true);
    fetch('/api/tickets/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticketId: ticket.id }),
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success && typeof d.score === 'number') setTicketScore({ score: d.score, feedback: d.feedback || '' }); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setScoringTicket(false); });
    return () => { cancelled = true; };
  }, [ticket.id, ticket.updated_at]);
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
    fetch(`/api/tickets/comments?ticketId=${ticket.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setComments(d.comments || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ticket.id, ticket.status, ticket.agent_state, ticket.updated_at]);

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

  // Null/invalid-safe date formatter. Imported tickets often have no start/due dates;
  // formatting a null would render the Unix epoch (12/31/1969), so show a placeholder instead.
  const fmtDate = (iso?: string | null, opts?: { withTime?: boolean }) => {
    if (!iso) return 'Not set';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Not set';
    return opts?.withTime ? d.toLocaleString() : d.toLocaleDateString();
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
    ((phaseId === 'planning' || phaseId === 'initiative') && ticket.tier === 'Epic') ||
    (phaseId === 'development' && ticket.tier === 'Story') ||
    (phaseId === 'testing' && ticket.tier === 'Story') ||
    (phaseId === 'release' && ticket.tier === 'Story');

  // LLM child generation is available for Epic→Story and Story→Task.
  const canGenerateChildren = ticket.tier === 'Epic' || ticket.tier === 'Story';

  const childLabel =
    ticket.tier === 'Epic' ? 'Stories' :
    ticket.tier === 'Story' ? 'Tasks' :
    phaseId === 'testing' ? 'QA' : 'Children';

  // --- Agent run flow: To Do/Backlog --(Start)--> agent_state 'Queued' (provision) --> status 'In Progress' ---
  // 'In Queue' is the internal agent_state, NOT a ticket status.
  const isTodoStatus = (s: string) => ['TO DO', 'TODO', 'BACKLOG'].includes(s?.toUpperCase());
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

  // Two-phase blocking: determines which status transitions are permitted.
  const blockingPhase = getBlockingPhase(ticket, allTickets);
  // Can start (→ In Progress) only when not fully blocked. 'partial' is OK because In Progress is allowed.
  const isPhaseBlocked = blockingPhase === 'blocked';
  // Can go to In Review only when phase is 'clear' (blocker is Done).
  const isPhasePartial = blockingPhase === 'partial';

  const isStartable = !isReadOnly && !isQueued && !isPhaseBlocked && isTodoStatus(ticket.status);
  const isProvisioning = starting || isQueued;

  // Review/merge is per BRANCH, not per ticket. Test tickets share their Task's
  // branch, so only the branch owner offers "Approve & Merge", and only once the
  // whole branch is fulfilled (every member In Review).
  const isTestTicket = ticket.tier === 'QA' || ticket.tier === 'UnitTest';
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

  // Reject review: send the ticket back to In Progress for the agent to rework.
  const handleReject = async () => {
    if (rejecting) return;
    const reason = window.prompt('Rejection reason (shown to agent on next run):');
    if (reason === null) return; // cancelled
    setRejecting(true);
    try {
      await fetch('/api/tickets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticket.id, status: 'In Progress', agent_state: null }),
      });
      await refreshTickets();
    } catch (e) {
      console.error('[TicketDetailView] Reject failed:', e);
    } finally {
      setRejecting(false);
    }
  };

  const handleGenerateChildren = async () => {
    if (generatingChildren) return;
    setGeneratingChildren(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/tickets/generate-children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parentTicketId: ticket.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Generation failed');
      await refreshTickets();
    } catch (e: any) {
      setGenerateError(e.message);
    } finally {
      setGeneratingChildren(false);
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
               ticket.tier === 'Task' ? "bg-violet-500/10 text-violet-600 dark:text-violet-500 border-violet-500/30" :
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
            {/* Phase-blocked: show why the ticket cannot start yet */}
            {isPhaseBlocked && !isQueued && isTodoStatus(ticket.status) && (
                <div
                    title={`Blocked: ${ticket.blocked_by} has not reached In Review yet.`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 cursor-not-allowed"
                >
                    <Lock size={14} />
                    Blocked · Awaiting {ticket.blocked_by}
                </div>
            )}
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
            {ticket.status === 'In Review' && (isBranchOwner || isTestTicket) && isOnlineReview && (
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
            {ticket.status === 'In Review' && (isBranchOwner || isTestTicket) && !isOnlineReview && (
                <>
                  <button
                      onClick={handleApprove}
                      disabled={merging || rejecting || !groupFulfilled || isPhasePartial}
                      title={
                        isPhasePartial
                          ? `Cannot merge yet — ${ticket.blocked_by} must reach Done before this ticket can complete.`
                          : groupFulfilled
                            ? `Merge ${groupBranchName} into the repository and complete ${reviewGroup?.total ?? 1} ticket(s)`
                            : `Awaiting ${groupPending.map((t) => t.identifier).join(', ')} before ${groupBranchName} can merge`
                      }
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 text-white disabled:cursor-not-allowed",
                        isPhasePartial ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-none border border-orange-500/30"
                          : groupFulfilled ? "bg-green-600 hover:bg-green-500 disabled:opacity-60 disabled:cursor-wait" : "bg-muted text-muted-foreground shadow-none"
                      )}
                  >
                      {merging ? <Loader2 size={14} className="animate-spin" /> : isPhasePartial ? <Lock size={14} /> : <GitMerge size={14} />}
                      {merging ? 'Merging…' : isPhasePartial ? `Awaiting ${ticket.blocked_by} · Done` : groupFulfilled ? 'Approve & Merge' : `Awaiting ${groupPending.length} ticket${groupPending.length === 1 ? '' : 's'}`}
                  </button>
                  <button
                      onClick={handleReject}
                      disabled={merging || rejecting}
                      title="Send back to In Progress — the agent will rework the implementation"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                  >
                      {rejecting ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                      {rejecting ? 'Rejecting…' : 'Reject'}
                  </button>
                </>
            )}
            {ticket.status === 'In Review' && !isBranchOwner && !isTestTicket && (
                <div
                    title={`This ticket is written on ${groupBranchName} and is merged together with ${branchOwnerIdentifier}.`}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400"
                >
                    <GitBranch size={14} />
                    On {groupBranchName} · merges with {branchOwnerIdentifier}
                </div>
            )}
            {canGenerateChildren && (
                <button
                    onClick={handleGenerateChildren}
                    disabled={generatingChildren}
                    title={`Use AI to generate ${childLabel} from this ${ticket.tier}`}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-wait text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                >
                    {generatingChildren ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {generatingChildren ? `Generating ${childLabel}…` : `Generate ${childLabel}`}
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
          {generateError && (
            <p className="text-[10px] text-red-500 font-medium px-1 mt-1">{generateError}</p>
          )}
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
               {/* Fulfillment score + feedback — same rater pattern as the strategy pillars. */}
               {(scoringTicket || ticketScore) && (
                 <section className="rounded-2xl p-4 border border-border bg-muted/30 flex items-start gap-4 animate-in fade-in duration-300">
                    <Bot size={16} className="shrink-0 mt-0.5" style={{ color: !scoringTicket && ticketScore ? scoreColor(ticketScore.score, 38) : '#94a3b8' }} />
                    <div className="space-y-1 flex-1">
                       <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: !scoringTicket && ticketScore ? scoreColor(ticketScore.score, 38) : '#94a3b8' }}>
                          Fulfillment Score · {scoringTicket && !ticketScore ? 'Rating…' : `${ticketScore?.score}/100`}
                       </div>
                       <p className="text-xs text-foreground/80 leading-relaxed">
                          {ticketScore?.feedback || (scoringTicket ? 'The Product Management AI Supporter is reviewing this ticket…' : 'No feedback yet.')}
                       </p>
                    </div>
                    <div
                       className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md ring-2 ring-card shrink-0 self-start"
                       style={{ background: !scoringTicket && ticketScore ? scoreColor(ticketScore.score) : ticketScore ? scoreColor(ticketScore.score) : '#94a3b8' }}
                       title={`How well this ${ticket.tier} ticket fulfills its tier's bar (Epic=why, Story=what, Task=how, Test=proof) and attribute completeness`}
                    >
                       {ticketScore ? ticketScore.score : <Loader2 size={14} className="animate-spin" />}
                    </div>
                 </section>
               )}

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
                             <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter">{ticket.document_type || 'document'} versioning active</div>
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

               {/* Evidence Panel — required for test tickets (UnitTest / QA) before approval */}
               {(ticket.tier === 'UnitTest' || ticket.tier === 'QA') && (
                 <section className="space-y-4 animate-in fade-in duration-300">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <CheckCircle2 size={14} className="text-emerald-500" />
                     Test Evidence
                     <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-bold uppercase tracking-wider">Required for Done</span>
                   </h3>
                   <EvidencePanel ticketId={ticket.id} readOnly={ticket.status === 'Done'} />
                 </section>
               )}

               {/* PR Panel — QA/UnitTest tickets in review are treated as a pull request */}
               {isTestTicket && ticket.status === 'In Review' && (() => {
                 const linkedTask = ticket.linked_ticket_id
                   ? allTickets.find((t) => t.identifier === ticket.linked_ticket_id || t.id === ticket.linked_ticket_id)
                   : null;
                 const storyTicket = linkedTask?.parent_id
                   ? allTickets.find((t) => t.id === linkedTask.parent_id)
                   : null;
                 const fromBranch = groupBranchName;
                 const toBranch = storyTicket?.git_branch ?? (storyTicket ? `feature/…` : 'feature/…');
                 return (
                   <section className="space-y-4 animate-in fade-in duration-300">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <GitMerge size={14} className="text-emerald-500" />
                       Pull Request Review
                     </h3>
                     <div className="rounded-2xl border border-emerald-500/20 bg-card overflow-hidden">
                       <div className="px-5 py-3 bg-emerald-500/5 border-b border-emerald-500/10 flex items-center gap-3 flex-wrap">
                         <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 shrink-0">
                           {fromBranch}
                         </span>
                         <ArrowRight size={11} className="text-muted-foreground shrink-0" />
                         <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                           {toBranch}
                         </span>
                         <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                           QA + Task review
                         </span>
                       </div>
                       <div className="px-5 py-4 space-y-3">
                         <p className="text-[11px] text-muted-foreground leading-relaxed">
                           This QA ticket shares{' '}
                           <span className="font-mono text-foreground/80">{fromBranch}</span>{' '}
                           with{' '}
                           {linkedTask ? (
                             <button
                               className="font-bold text-foreground underline decoration-dotted underline-offset-2 hover:text-blue-500 transition-colors"
                               onClick={() => handleNavigateToId(linkedTask.id)}
                             >
                               {linkedTask.identifier}
                             </button>
                           ) : 'the linked task'}{' '}
                           and will be merged together once both tickets are In Review.
                         </p>
                         {!groupFulfilled && groupPending.length > 0 && (
                           <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                             Awaiting: {groupPending.map((t) => t.identifier).join(', ')}
                           </p>
                         )}
                         {groupFulfilled && (
                           <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                             All group members are In Review — ready to merge.
                           </p>
                         )}
                       </div>
                     </div>
                   </section>
                 );
               })()}

               {/* Review Panel — shown for Task tickets In Review; shows linked test evidence */}
               {ticket.tier === 'Task' && ticket.status === 'In Review' && (() => {
                 const testTickets = allTickets.filter(t =>
                   (t.tier === 'UnitTest' || t.tier === 'QA') && t.linked_ticket_id === ticket.identifier
                 );
                 if (testTickets.length === 0) return null;
                 return (
                   <section className="space-y-4 animate-in fade-in duration-300">
                     <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                       <Eye size={14} className="text-violet-500" />
                       Code Review — Test Evidence
                     </h3>
                     <div className="space-y-4">
                       {testTickets.map(t => (
                         <div key={t.id} className="border border-border rounded-xl overflow-hidden">
                           <div className="px-3 py-2 bg-muted/40 flex items-center gap-2">
                             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t.identifier}</span>
                             <span className="text-xs text-foreground font-medium truncate">{t.title}</span>
                             <span className={cn("ml-auto text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border", getStatusBadgeClasses(t.status))}>{t.status}</span>
                           </div>
                           <div className="p-3">
                             <EvidencePanel ticketId={t.id} readOnly />
                           </div>
                         </div>
                       ))}
                     </div>
                   </section>
                 );
               })()}

               {/* Hierarchy Section — always shown for Epics so stories can be added. */}
               {(parentTicket || childTickets.length > 0 || ticket.tier === 'Epic') && (
                 <section className="space-y-4">
                    <div className="flex items-center justify-between">
                       <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                          <FolderTree size={14} />
                          Node Hierarchy Traceability
                       </h3>
                       {ticket.tier === 'Epic' && (
                         <button
                           onClick={() => setShowAddChild(true)}
                           className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                         >
                            <Plus size={12} /> Add Story
                         </button>
                       )}
                    </div>
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

               {/* Comments — synced from the tracker; attachments are saved to Files & Assets. */}
               <section className="space-y-4 text-left">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                     <MessageSquare size={14} />
                     Comments {comments.length > 0 && <span className="text-muted-foreground/60">({comments.length})</span>}
                  </h3>
                  {comments.length === 0 ? (
                     <p className="text-[11px] text-muted-foreground italic px-1">No comments synced for this ticket.</p>
                  ) : (
                     <div className="space-y-3">
                        {comments.map((c) => (
                           <div key={c.id} className="bg-card border border-border rounded-2xl p-4 space-y-2 shadow-sm">
                              <div className="flex items-center justify-between">
                                 <span className="text-[11px] font-bold text-foreground">{c.author}</span>
                                 <span className="text-[9px] text-muted-foreground uppercase tracking-widest">{fmtDate(c.created_at, { withTime: true })}</span>
                              </div>
                              <div className="text-[12px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{c.body}</div>
                              {c.attachments?.length > 0 && (
                                 <div className="flex flex-wrap gap-2 pt-1">
                                    {c.attachments.map((a, i) => (
                                       <a
                                          key={i}
                                          href={a.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          title={a.path ? `Saved to Files & Assets: ${a.path}` : a.url}
                                          className="flex items-center gap-1 px-2 py-1 bg-muted rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground border border-border transition-colors"
                                       >
                                          <Paperclip size={10} /> {a.name}
                                       </a>
                                    ))}
                                 </div>
                              )}
                           </div>
                        ))}
                     </div>
                  )}
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
                       <div className={cn("p-4 rounded-xl border flex flex-col gap-1 transition-all",
                         blockingPhase === 'blocked' ? "bg-red-500/5 border-red-500/20"
                         : blockingPhase === 'partial' ? "bg-orange-500/5 border-orange-500/20"
                         : ticket.blocked_by ? "bg-green-500/5 border-green-500/20"
                         : "bg-muted/30 border-border"
                       )}>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Blocked By</span>
                            {ticket.blocked_by && (
                              <span className={cn("text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                                blockingPhase === 'blocked' ? "bg-red-500/15 text-red-500"
                                : blockingPhase === 'partial' ? "bg-orange-500/15 text-orange-500"
                                : "bg-green-500/15 text-green-600"
                              )}>
                                {blockingPhase === 'blocked' ? 'Waiting for In Review'
                                  : blockingPhase === 'partial' ? 'Waiting for Done'
                                  : 'Clear'}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                             {ticket.blocked_by ? (
                                ticket.blocked_by.split(',').map(ident => {
                                  const blockerTicket = allTickets.find(t => t.identifier === ident.trim());
                                  return (
                                  <button
                                    key={ident}
                                    onClick={() => handleNavigateToIdentifier(ident.trim())}
                                    className={cn("text-xs font-bold flex items-center gap-2 px-2 py-1 rounded-lg border transition-all",
                                      blockingPhase === 'blocked' ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                                      : blockingPhase === 'partial' ? "bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/20"
                                      : "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400 hover:bg-green-500/20"
                                    )}
                                  >
                                     <Lock size={12} className={blockingPhase === 'blocked' ? "text-red-500" : blockingPhase === 'partial' ? "text-orange-500" : "text-green-500"} />
                                     <span>{ident.trim()}</span>
                                     {blockerTicket && <span className="opacity-60">· {blockerTicket.status}</span>}
                                  </button>
                                  );
                                })
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
                <div className="space-y-4">
                   {/* Approximate tokens — editable before work begins */}
                   <div className="space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-tighter text-muted-foreground">Approx Tokens (pre-work)</span>
                      <input
                        type="number"
                        min={0}
                        defaultValue={ticket.expected_token_usage ?? ''}
                        placeholder="e.g. 50000"
                        className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
                        onBlur={async (e) => {
                          const val = e.target.value ? Number(e.target.value) : null;
                          await fetch('/api/tickets', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ ticketId: ticket.id, expected_token_usage: val }),
                          });
                          refreshTickets();
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      />
                   </div>
                   {/* Actual tokens — set by agent after completion */}
                   <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                         <span className="text-muted-foreground">Actual Tokens (post-work)</span>
                         <span className="text-foreground">{ticket.actual_token_usage ?? '—'} / {ticket.expected_token_usage ?? '—'}</span>
                      </div>
                      {ticket.expected_token_usage ? (
                        <div className="h-1.5 bg-card rounded-full overflow-hidden border border-border shadow-inner">
                           <div
                             className={cn("h-full transition-all duration-1000", (Number(ticket.actual_token_usage || 0) / Number(ticket.expected_token_usage)) > 0.9 ? "bg-red-500" : "bg-amber-500")}
                             style={{ width: `${Math.min((Number(ticket.actual_token_usage || 0) / Number(ticket.expected_token_usage)) * 100, 100)}%` }}
                           />
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/60 italic">Set approx tokens above to enable budget tracking.</p>
                      )}
                   </div>
                </div>
             </div>
           )}

           {/* AI Agent Specifications — execution tiers only. Epics (the why) and
               Stories (the what) are human-owned; AI agents are assigned from Task down. */}
           {!isReadOnly && ticket.tier !== 'Epic' && ticket.tier !== 'Story' && (
             <div className="space-y-6 pt-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2 flex items-center gap-2">
                   <Zap size={14} className="text-blue-500" />
                   Agent Specification
                </h4>
                <div className="space-y-4">
                   <MetaItem icon={<UserCheck size={14} />} label="Assigned Role" value={ticket.llm_role || 'Unassigned'} />
                   <MetaItem icon={<Clock size={14} />} label="Approx Runtime" value={ticket.approx_runtime_minutes ? `${ticket.approx_runtime_minutes} min (timeout ${ticket.approx_runtime_minutes * 3} min)` : 'Not set'} />
                   {ticket.in_progress_at && (
                     <MetaItem icon={<Activity size={14} />} label="Actual Runtime" value={(() => {
                       const start = new Date(ticket.in_progress_at).getTime();
                       const end = ticket.in_review_at ? new Date(ticket.in_review_at).getTime() : Date.now();
                       const mins = Math.round((end - start) / 60_000);
                       const label = ticket.in_review_at ? `${mins} min` : `${mins} min (running)`;
                       return ticket.approx_runtime_minutes ? `${label} — approx was ${ticket.approx_runtime_minutes} min` : label;
                     })()} />
                   )}
                   {/* Personality Vector is defined per Agent Role, not per ticket. See Agent Roles page. */}
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
                 <MetaItem icon={<Clock size={14} />} label="Earliest Start" value={fmtDate(ticket.start_date)} />
                 <MetaItem icon={<CheckCircle2 size={14} />} label="Target Delivery" value={fmtDate(ticket.due_date)} />
                 <MetaItem icon={<Activity size={14} />} label="TTL Deadline" value={ticket.ttl ? fmtDate(ticket.ttl, { withTime: true }) : 'Permanent'} />
                 <MetaItem icon={<RotateCcw size={14} className="text-muted-foreground" />} label="Last Registry Sync" value={fmtDate(ticket.updated_at, { withTime: true })} />
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

      {/* AI Agent Chat — collapsible strip at the bottom of the detail panel */}
      <div className="border-t border-border">
        <button
          onClick={() => setShowChat(!showChat)}
          className="w-full flex items-center gap-2 px-6 py-3 hover:bg-muted/40 transition-colors text-left"
        >
          <MessageSquare size={13} className="text-blue-500 shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Agent Chat</span>
          <span className="text-[9px] text-muted-foreground/50 ml-1">— Ask the AI about this ticket</span>
          <ChevronRight
            size={13}
            className={cn('ml-auto text-muted-foreground transition-transform shrink-0', showChat && 'rotate-90')}
          />
        </button>
        {showChat && (
          <div className="h-[340px] border-t border-border">
            <TicketChat ticketId={ticket.id} ticketIdentifier={ticket.identifier} />
          </div>
        )}
      </div>

      {/* Add a child Story under this Epic (parent pre-selected). */}
      {showAddChild && (
        <TicketFormModal
          phaseId="planning"
          tier="Story"
          title="New Story"
          defaultParentId={ticket.id}
          onClose={() => setShowAddChild(false)}
        />
      )}
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
