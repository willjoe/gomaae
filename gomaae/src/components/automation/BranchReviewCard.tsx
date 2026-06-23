'use client';

import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  GitMerge,
  Loader2,
  CheckCircle2,
  Clock,
  FlaskConical,
  Code2,
  GitCommit,
  GitPullRequest,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getTierBadgeClasses, getStatusBadgeClasses } from '@/lib/phaseConfig';
import type { ReviewGroup } from '@/lib/reviewGroups';
import { useLifecycle } from '@/context/LifecycleContext';

const TEST_TIERS = ['UnitTest', 'QA'];

interface BranchReviewCardProps {
  group: ReviewGroup<any>;
  onSelectTicket: (id: string) => void;
}

/**
 * One review card per repository branch. Test tickets share their Task's branch,
 * so they are combined here with the Task into a single review. The branch is
 * merged once — and every member moves to Done — only when it is "fulfilled"
 * (all members In Review).
 */
export default function BranchReviewCard({ group, onSelectTicket }: BranchReviewCardProps) {
  const { refreshTickets } = useLifecycle();
  const [commits, setCommits] = useState<{ short: string; message: string; author: string; date: string }[]>([]);
  const [prs, setPrs] = useState<{ repo: string; number: number | null; url: string; state: string; message?: string }[]>([]);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCommits, setShowCommits] = useState(false);

  const ownerId = group.owner?.id ?? group.tickets[0]?.id;
  const statusKey = group.tickets.map((t) => `${t.identifier}:${t.status}`).join(',');

  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    fetch(`/api/tickets/commits?ticketId=${ownerId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setCommits(d.commits || []); })
      .catch(() => {});
    fetch(`/api/tickets/prs?ticketId=${ownerId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d.success) setPrs(d.prs || []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ownerId, statusKey]);

  const prStateBadge = (state: string) => {
    switch (state) {
      case 'MERGED': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'CLOSED': return 'bg-red-500/10 text-red-600 border-red-500/20';
      case 'APPROVED_LOCAL': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'ERROR': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-600 border-blue-500/20'; // OPEN
    }
  };
  const prStateLabel = (state: string) => (state === 'APPROVED_LOCAL' ? 'Approved · merge on GitHub' : state);

  // A branch is "online" once it has at least one synced PR; then the platform owns
  // the merge and the local Approve button becomes a link to the PR.
  const isOnline = prs.some((p) => p.url);
  const primaryPrUrl = prs.find((p) => p.url)?.url || '';
  const allMerged = isOnline && prs.every((p) => p.state === 'MERGED');

  // While online and not yet merged, poll the platform; the refresh reconciles
  // merged PRs to Done server-side, so we refresh the board when that happens.
  useEffect(() => {
    if (!ownerId || !isOnline || allMerged) return;
    const id = setInterval(() => {
      fetch(`/api/tickets/prs?ticketId=${ownerId}&refresh=true`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.success) return;
          setPrs(d.prs || []);
          if (d.completed && d.completed.length) refreshTickets();
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(id);
  }, [ownerId, isOnline, allMerged, refreshTickets]);

  const handleMerge = async () => {
    if (merging || !group.fulfilled || !ownerId) return;
    setMerging(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ownerId }),
      });
      const d = await res.json();
      if (!d.success) setError(d.error || 'Merge failed');
      else if (d.mergeError) setError(d.mergeError);
      if (d.prs) setPrs(d.prs);
      await refreshTickets();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
      {/* Branch header */}
      <div className="px-5 py-3 bg-muted/40 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <GitBranch size={15} className="text-indigo-500 shrink-0" />
          <span className="font-mono text-xs font-bold text-foreground truncate">{group.branch}</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {group.total} {group.total === 1 ? 'ticket' : 'tickets'}
          </span>
        </div>
        {group.fulfilled ? (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">
            <CheckCircle2 size={11} /> Ready
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
            <Clock size={11} /> {group.inReviewCount}/{group.total} reviewed
          </span>
        )}
      </div>

      {/* Involved tickets */}
      <div className="divide-y divide-border/40">
        {group.tickets.map((tk) => {
          const isTest = TEST_TIERS.includes(tk.tier);
          return (
            <button
              key={tk.id}
              onClick={() => onSelectTicket(tk.id)}
              className="w-full px-5 py-3 flex items-center justify-between gap-3 hover:bg-muted/40 transition-colors text-left group/row"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                  isTest ? "bg-fuchsia-500/10 text-fuchsia-500" : "bg-indigo-500/10 text-indigo-500"
                )}>
                  {isTest ? <FlaskConical size={14} /> : <Code2 size={14} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[8px] font-bold px-1 py-0.5 rounded border font-mono", getTierBadgeClasses(tk.tier))}>
                      {tk.identifier}
                    </span>
                    <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-tighter", getStatusBadgeClasses(tk.status))}>
                      {tk.status}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-foreground truncate mt-0.5 group-hover/row:text-indigo-500 transition-colors">{tk.title}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Commits (collapsible) */}
      {commits.length > 0 && (
        <div className="border-t border-border/60">
          <button
            onClick={() => setShowCommits((s) => !s)}
            className="w-full px-5 py-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:bg-muted/30 transition-colors"
          >
            <ChevronDown size={12} className={cn("transition-transform", !showCommits && "-rotate-90")} />
            <GitCommit size={12} />
            {commits.length} {commits.length === 1 ? 'commit' : 'commits'} on branch
          </button>
          {showCommits && (
            <div className="px-5 pb-3 space-y-1.5">
              {commits.map((c) => (
                <div key={c.short} className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-indigo-500 font-bold">{c.short}</span>
                  <span className="text-foreground truncate flex-1">{c.message}</span>
                  <span className="text-muted-foreground/60 shrink-0">{c.author}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Synced GitHub PRs (one per connected repo) */}
      {prs.length > 0 && (
        <div className="border-t border-border/60 px-5 py-3 space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <GitPullRequest size={12} /> GitHub Pull Requests
          </div>
          {prs.map((p) => (
            <div key={p.repo} className="flex items-center justify-between gap-3 text-[11px]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-bold text-foreground truncate">{p.repo}</span>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-500 hover:underline truncate">
                    {p.number ? `#${p.number}` : 'PR'} <ExternalLink size={10} />
                  </a>
                ) : (
                  <span className="text-muted-foreground italic truncate">{p.message || 'not synced'}</span>
                )}
              </div>
              <span className={cn('text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0', prStateBadge(p.state))}>
                {prStateLabel(p.state)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Approve & Merge — online branches defer to the platform's merge policy. */}
      <div className="px-5 py-3 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
        <div className="text-[10px] text-muted-foreground italic min-w-0 truncate">
          {error ? (
            <span className="text-red-500 font-bold not-italic">{error}</span>
          ) : isOnline ? (
            'Connected to GitHub — approve & merge on the platform. Completes automatically when the PR is merged.'
          ) : group.fulfilled ? (
            'Merges the branch into the repository and marks every ticket Done.'
          ) : (
            `Waiting on ${group.pending.map((t) => t.identifier).join(', ')} to reach In Review.`
          )}
        </div>
        {isOnline ? (
          <a
            href={primaryPrUrl || '#'}
            target="_blank"
            rel="noreferrer"
            title="Open the pull request to approve & merge on GitHub"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 text-white bg-foreground/90 hover:bg-foreground"
          >
            <GitPullRequest size={14} /> Approve &amp; Merge on GitHub <ExternalLink size={12} />
          </a>
        ) : (
          <button
            onClick={handleMerge}
            disabled={!group.fulfilled || merging}
            title={group.fulfilled ? `Merge ${group.branch} and complete ${group.total} ticket(s)` : 'Branch not fully reviewed yet'}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 shrink-0 text-white",
              group.fulfilled && !merging ? "bg-green-600 hover:bg-green-500" : "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
            )}
          >
            {merging ? <Loader2 size={14} className="animate-spin" /> : <GitMerge size={14} />}
            {merging ? 'Merging…' : 'Approve & Merge'}
          </button>
        )}
      </div>
    </div>
  );
}
