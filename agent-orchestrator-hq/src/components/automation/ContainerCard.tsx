'use client';

import React, { useEffect } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';

// The container work lifecycle. Each step maps to a REAL agent_phase reported by
// the run endpoint — nothing here is timed/simulated.
const STEPS = ['Building Container', 'Now Coding', 'Finalizing', 'Committing', 'In Review · Stopped'];

function phaseStep(phase: string | null | undefined): number {
  if (!phase) return 0;
  if (phase === 'Provisioning') return 0;
  if (phase === 'Coding' || phase.startsWith('Refining')) return 1;
  if (phase.startsWith('Verifying')) return 2;
  if (phase === 'Finalizing') return 2;
  if (phase === 'Committing') return 3;
  return 0;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

interface ContainerCardProps {
  container: any;            // ticket holding the container (agent_state set)
  activeBlockers: string[];
  onSelect: () => void;
}

export default function ContainerCard({ container: c, activeBlockers, onSelect }: ContainerCardProps) {
  const { refreshTickets } = useLifecycle();

  const blocked = c.agent_state === 'Queued' && activeBlockers.length > 0;
  const queued = c.agent_state === 'Queued' && !blocked;
  const running = c.agent_state === 'Running';
  const stopped = c.agent_state === 'Stopped';

  // Current step reflects the real agent_phase (0-4); -1 = no active step.
  const stepIdx = blocked ? -1
    : stopped ? 4
    : running ? phaseStep(c.agent_phase)
    : queued ? 0
    : -1;

  // A stopped container lingers briefly (showing the final step), then frees its
  // slot — the ticket remains In Review.
  useEffect(() => {
    if (!stopped) return;
    const t = setTimeout(async () => {
      try {
        await fetch('/api/tickets', { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify({ ticketId: c.id, agent_state: null }) });
        await refreshTickets();
      } catch { /* best effort */ }
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopped, c.id]);

  const tone = blocked
    ? { text: 'text-orange-600', dot: 'bg-orange-500', badge: 'text-orange-600 bg-orange-500/10 border-orange-500/20', step: 'bg-orange-500' }
    : stopped
    ? { text: 'text-green-600 dark:text-green-500', dot: 'bg-green-500', badge: 'text-green-600 bg-green-500/10 border-green-500/20', step: 'bg-green-500' }
    : running
    ? { text: 'text-blue-600 dark:text-blue-400', dot: 'bg-blue-500 animate-pulse', badge: 'text-blue-500 bg-blue-500/10 border-blue-500/20', step: 'bg-blue-500' }
    : { text: 'text-amber-600 dark:text-amber-500', dot: 'bg-amber-500 animate-pulse', badge: 'text-amber-500 bg-amber-500/10 border-amber-500/20', step: 'bg-amber-500' };

  const stateLabel = blocked ? 'Blocked' : stopped ? 'Stopped' : running ? 'Running' : 'Queued';
  const isLoopPhase = running && c.agent_phase && (c.agent_phase.startsWith('Verifying') || c.agent_phase.startsWith('Refining'));
  const stepLabel = blocked ? 'Queued — Blocked'
    : isLoopPhase ? c.agent_phase
    : stepIdx >= 0 ? STEPS[stepIdx]
    : 'Queued';

  return (
    <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tone.dot)} />
          <span className="text-[10px] font-mono font-bold text-foreground truncate">worker-{c.identifier.toLowerCase()}</span>
        </div>
        <span className={cn('text-[7px] font-bold uppercase tracking-tighter px-1.5 py-0.5 rounded-sm border shrink-0', tone.badge)}>{stateLabel}</span>
      </div>

      <div onClick={onSelect} className="flex items-center gap-2 text-[10px] cursor-pointer">
        <span className="font-mono bg-card border border-border rounded px-1 text-[8px] text-muted-foreground shrink-0">{c.identifier}</span>
        <span className="truncate text-foreground/80 font-medium hover:text-indigo-500 transition-colors">{c.title}</span>
      </div>

      <div className="flex items-center justify-between text-[8px] uppercase tracking-tighter gap-2">
        <span className="text-muted-foreground font-bold flex items-center gap-1 overflow-hidden">
          <Bot size={10} className="shrink-0" /> <span className="truncate">{c.llm_role || 'Unassigned'}</span>
        </span>
        <span className="text-muted-foreground/70 font-mono shrink-0">{c.status}</span>
      </div>

      {/* Step indicator (driven by the real agent_phase) */}
      <div className="pt-0.5 space-y-1.5">
        <div className="flex items-center">
          {STEPS.map((_, i) => (
            <React.Fragment key={i}>
              {i > 0 && <div className={cn('h-0.5 flex-1 rounded transition-colors', i <= stepIdx ? tone.step : 'bg-border')} />}
              <div className={cn(
                'w-2 h-2 rounded-full shrink-0 transition-all',
                i < stepIdx ? tone.step
                  : i === stepIdx ? cn(tone.step, 'scale-125', running && 'animate-pulse')
                  : 'bg-border',
              )} />
            </React.Fragment>
          ))}
        </div>
        <div className={cn('text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1', blocked ? 'text-orange-600/80' : tone.text)}>
          {running && <Loader2 size={9} className="animate-spin" />}
          {stepLabel}
          {blocked && activeBlockers.length > 0 && <span className="text-orange-600/70 normal-case font-medium"> · waiting on {activeBlockers.join(', ')}</span>}
        </div>
      </div>
    </div>
  );
}
