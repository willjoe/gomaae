'use client';

import React, { useState, useMemo } from 'react';
import {
  Bot,
  Play,
  RefreshCcw,
  ChevronRight,
  Square,
  Pause,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Ticket } from '@/components/gantt/types';
import { useLifecycle } from '@/context/LifecycleContext';
import { getTierBadgeClasses } from '@/lib/phaseConfig';


const JSON_HEADERS = { 'Content-Type': 'application/json' };

interface AgentAssignmentRowProps {
  task: Ticket;
  onSelect: () => void;
  forceQueue?: boolean;
  /** Identifiers of not-yet-Done tickets currently blocking this one. */
  activeBlockers?: string[];
  /** For UnitTest tickets: what the ticket is waiting to start on (e.g. "TKT-1004 review"). */
  awaitingReview?: string;
  /** QA / UnitTest children of this Task ticket, shown inline below the task row. */
  relatedTests?: Ticket[];
  onSelectTest?: (id: string) => void;
}

export default function AgentAssignmentRow({ task, onSelect, forceQueue, activeBlockers, awaitingReview, relatedTests, onSelectTest }: AgentAssignmentRowProps) {
  const { refreshTickets } = useLifecycle();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [showAutoFillDialog, setShowAutoFillDialog] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // State is driven by real ticket data: status stays standard; the queue is the
  // internal agent_state column.
  const statusLower = (task.status || '').toLowerCase();
  const isDone = statusLower === 'done';
  const isTodo = statusLower.replace(/\s+/g, '') === 'todo';
  const isInQueue = task.agent_state === 'Queued' || !!forceQueue;
  const isBlocked = isInQueue && (activeBlockers?.length ?? 0) > 0;
  // A UnitTest sits in queue until its target Task is In Review (code exists) —
  // same idle-in-queue treatment as a dependency-blocked ticket.
  const isGated = isInQueue && !!awaitingReview;
  const isInProgress = statusLower === 'in progress';
  const isQA = task.tier === 'QA';
  const isUnitTest = task.tier === 'UnitTest';
  // Test-ticket accents: QA = pink, UnitTest = fuchsia (same family, distinct).
  const testIdBadge = isQA ? "bg-pink-500/10 text-pink-500 border-pink-500/20"
    : isUnitTest ? "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20"
    : getTierBadgeClasses(task.tier);
  const testTitle = isQA ? "text-pink-600 dark:text-pink-400 hover:text-pink-500"
    : isUnitTest ? "text-fuchsia-600 dark:text-fuchsia-400 hover:text-fuchsia-500"
    : "text-foreground hover:text-indigo-500";
  // Blocked / gated tickets sit idle (no spinner) until their gate clears.
  const isAnimated = isInProgress || statusLower === 'in review' || (isInQueue && !isBlocked && !isGated);

  /** Queue the ticket after all required fields are confirmed present. */
  const queueTicket = async () => {
    await fetch('/api/tickets', {
      method: 'PATCH',
      headers: JSON_HEADERS,
      body: JSON.stringify({ ticketId: task.id, agent_state: 'Queued' }),
    });
    await refreshTickets();
  };

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      if (isTodo && !isInQueue) {
        // Preflight: check for missing required fields before queuing.
        const missing: string[] = [];
        if (!task.description?.trim()) missing.push('Description (acceptance criteria)');
        if (!task.llm_role?.trim()) missing.push('Assigned Role');
        if (!task.expected_token_usage) missing.push('Approximate Token Usage');

        if (missing.length > 0) {
          setMissingFields(missing);
          setShowAutoFillDialog(true);
          return; // don't queue yet — wait for user decision
        }

        await queueTicket();
      } else if (isInQueue) {
        // Stop / revert a queued ticket back to To Do.
        await fetch('/api/tickets', {
          method: 'PATCH',
          headers: JSON_HEADERS,
          body: JSON.stringify({ ticketId: task.id, status: 'To Do', agent_state: null }),
        });
        await refreshTickets();
      } else if (isInProgress) {
        // Pause -> In Review.
        await fetch('/api/tickets', {
          method: 'PATCH',
          headers: JSON_HEADERS,
          body: JSON.stringify({ ticketId: task.id, status: 'In Review', agent_state: null }),
        });
        await refreshTickets();
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAutoFill = async () => {
    setIsAutoFilling(true);
    try {
      const res = await fetch('/api/tickets/auto-fill', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ ticketId: task.id }),
      });
      const data = await res.json();
      if (!data.success) {
        console.error('Auto-fill failed:', data.error);
        return;
      }
      // Refresh so the ticket object has the new values, then queue.
      await refreshTickets();
      setShowAutoFillDialog(false);
      // Queue after a tick so the refreshed ticket is available.
      await queueTicket();
    } catch (err) {
      console.error('Auto-fill request failed:', err);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const currentStatus = task.status;

  const renderButton = () => {
    if (isDone) return null;

    let Icon = Play;
    let title = 'Start Agent';
    let btnClass = "bg-blue-600 text-white hover:bg-blue-500";

    if (isInQueue) {
      Icon = Square;
      title = 'Stop Agent (Revert)';
      btnClass = "bg-amber-500 text-white hover:bg-amber-400";
    } else if (isInProgress) {
      Icon = Pause;
      title = 'Pause Agent';
      btnClass = "bg-indigo-600 text-white hover:bg-indigo-500";
    } else if (statusLower === 'in review') {
      Icon = RefreshCcw;
      title = 'Re-run Agent';
      btnClass = "bg-pink-600 text-white hover:bg-pink-500";
    }

    return (
      <button
        onClick={handleAction}
        disabled={isProcessing}
        title={title}
        className={cn(
          "p-1.5 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50",
          btnClass
        )}
      >
        {isProcessing ? <RefreshCcw size={14} className="animate-spin" /> : <Icon size={14} />}
      </button>
    );
  };

  return (
    <>
    <div className="flex flex-col">
    <div className="py-3 px-6 flex items-center justify-between group hover:bg-muted/20 transition-colors">
       <div className="flex items-center gap-4 max-w-[50%]">

          <div className="relative w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden shadow-inner group-hover:scale-105 transition-transform bg-card shrink-0">
              {isAnimated && (
                  <div
                     className="absolute inset-[-100%] animate-spin"
                     style={{
                         background: isInProgress
                            ? 'conic-gradient(from 0deg, transparent 0%, #3b82f6 25%, #60a5fa 50%, #93c5fd 75%, transparent 100%)'
                            : isInQueue
                            ? 'conic-gradient(from 0deg, transparent 0%, #f59e0b 25%, #fbbf24 50%, #fcd34d 75%, transparent 100%)'
                            : 'conic-gradient(from 0deg, transparent 0%, #ec4899 25%, #f472b6 50%, #f9a8d4 75%, transparent 100%)'
                     }}
                  />
              )}
              {!isAnimated && (
                  <div className={cn(
                      "absolute inset-0 border",
                      isDone ? "bg-green-500/10 border-green-500/20" : "bg-muted border-border"
                  )} />
              )}
              <div className={cn(
                  "relative z-10 flex items-center justify-center rounded-[6px]",
                  isInProgress ? "w-[28px] h-[28px] bg-blue-100 dark:bg-blue-900/40" :
                  isInQueue ? "w-[28px] h-[28px] bg-amber-100 dark:bg-amber-900/40" :
                  statusLower === 'in review' ? "w-[28px] h-[28px] bg-red-100 dark:bg-red-900/40" :
                  "w-full h-full bg-transparent"
              )}>
                  <Bot size={16} className={cn(
                      isDone ? "text-green-500" :
                      isInProgress ? "text-blue-600 dark:text-blue-400" :
                      isInQueue ? "text-amber-600 dark:text-amber-400" :
                      statusLower === 'in review' ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                  )} />
              </div>
          </div>

          <div className="space-y-0.5 overflow-hidden">
             <div className="flex items-center gap-2">
                <span className={cn(
                    "text-[8px] font-bold px-1 py-0.5 rounded border font-mono",
                    testIdBadge
                )}>
                    {task.identifier}
                </span>
                <span className={cn(
                  "text-[7px] font-bold uppercase tracking-tighter px-1 rounded-sm",
                  isTodo && !isInQueue ? "text-slate-500 bg-slate-500/10" :
                  isInQueue ? "text-amber-500 bg-amber-500/10" :
                  statusLower === 'in progress' ? "text-blue-500 bg-blue-500/10" :
                  statusLower === 'in review' ? "text-pink-500 bg-pink-500/10" : "text-muted-foreground"
                )}>{isInQueue ? 'In Queue' : currentStatus}</span>
                {isBlocked && (
                  <span className="text-[7px] font-bold uppercase tracking-tighter px-1 rounded-sm text-orange-600 bg-orange-500/10 border border-orange-500/20">
                    Blocked
                  </span>
                )}
                {isGated && !isBlocked && (
                  <span className="text-[7px] font-bold uppercase tracking-tighter px-1 rounded-sm text-fuchsia-600 bg-fuchsia-500/10 border border-fuchsia-500/20">
                    Awaiting Review
                  </span>
                )}
             </div>
             <div
                onClick={onSelect}
                className={cn(
                    "text-xs font-bold tracking-tight truncate cursor-pointer transition-colors",
                    testTitle
                )}
             >
                {task.title}
             </div>
             {isBlocked && (
                <div className="text-[8px] font-bold uppercase tracking-tighter text-orange-600/80 truncate">
                   Waiting on {activeBlockers!.join(', ')} (must be Done)
                </div>
             )}
             {isGated && !isBlocked && (
                <div className="text-[8px] font-bold uppercase tracking-tighter text-fuchsia-600/80 truncate">
                   Awaiting {awaitingReview} (target must be In Review)
                </div>
             )}
          </div>
       </div>

       <div className="flex items-center gap-4">
          {!isDone && (
            <div className="flex items-center gap-3">
               {/* Role + model are specified on the ticket — read-only here. */}
               <div className="flex flex-col gap-0.5 items-end text-right">
                  <div className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 leading-none">Agent Architecture</div>
                  <span className="text-[10px] font-bold italic text-indigo-500 leading-tight truncate max-w-[160px]">{task.llm_role || 'Unassigned'}</span>
                  <span className="text-[9px] font-mono italic text-amber-600/80 dark:text-amber-400/70 leading-tight truncate max-w-[160px]">{task.authorized_model || '—'}</span>
               </div>
               {renderButton()}
            </div>
          )}
          <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-indigo-500 transition-all" />
       </div>
    </div>

    {/* Inline QA / UnitTest tickets — shown right below their parent Task */}
    {relatedTests && relatedTests.length > 0 && (
      <div className="ml-14 mr-6 mb-2 border-l-2 border-pink-500/20 pl-3 space-y-0.5">
        {relatedTests.map((qa) => {
          const qaStatus = (qa.status || '').toLowerCase().replace(/\s+/g, '');
          const isQaTier = qa.tier === 'QA';
          return (
            <div
              key={qa.id}
              onClick={() => onSelectTest?.(qa.id)}
              className="flex items-center justify-between py-1.5 px-3 rounded-lg cursor-pointer transition-colors hover:bg-pink-500/5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={cn(
                  "text-[7px] font-bold px-1 py-0.5 rounded border font-mono shrink-0",
                  isQaTier
                    ? "bg-pink-500/10 text-pink-500 border-pink-500/20"
                    : "bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20"
                )}>
                  {qa.identifier}
                </span>
                <span className={cn(
                  "text-[10px] font-semibold truncate",
                  isQaTier ? "text-pink-600 dark:text-pink-400" : "text-fuchsia-600 dark:text-fuchsia-400"
                )}>
                  {qa.title}
                </span>
              </div>
              <span className={cn(
                "text-[7px] font-bold uppercase tracking-tighter px-1.5 rounded shrink-0 ml-2",
                qaStatus === 'done' ? "text-green-500 bg-green-500/10" :
                qaStatus === 'inreview' ? "text-pink-500 bg-pink-500/10" :
                qaStatus === 'inprogress' ? "text-blue-500 bg-blue-500/10" :
                "text-slate-500 bg-slate-500/10"
              )}>
                {qa.status}
              </span>
            </div>
          );
        })}
      </div>
    )}
    </div>

    {/* Auto-fill dialog — shown when Start is clicked on a ticket with missing fields */}
    {showAutoFillDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-indigo-500 shrink-0 mt-0.5" />
              <h3 className="text-sm font-bold text-foreground">Missing Required Fields</h3>
            </div>
            <button
              onClick={() => setShowAutoFillDialog(false)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            The following fields are required before an AI agent can run:
          </p>

          <ul className="space-y-1">
            {missingFields.map((f) => (
              <li key={f} className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <p className="text-xs text-muted-foreground leading-relaxed">
            Auto-fill will read the full ancestor context (Epic → Story → Task) and any attached documents, then use AI to generate appropriate values.
          </p>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setShowAutoFillDialog(false)}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAutoFill}
              disabled={isAutoFilling}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
            >
              {isAutoFilling ? (
                <>
                  <RefreshCcw size={12} className="animate-spin" />
                  Filling…
                </>
              ) : (
                <>
                  <Sparkles size={12} />
                  Auto-fill &amp; Start
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
