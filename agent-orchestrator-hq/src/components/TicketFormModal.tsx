'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Loader2, Ticket as TicketIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { lifecycleTheme } from '@/lib/theme';
import { useLifecycle } from '@/context/LifecycleContext';
import { getAgentRoles } from '@/lib/agentRoles';
import { getPhaseForTier } from '@/lib/phaseConfig';

const ADD_ROLE_VALUE = '__add_role__';

// Each lifecycle tier optionally hangs off a parent tier (deny-by-default: null = top-level).
const PARENT_TIER: Record<string, string | null> = {
  Epic: null,
  Story: 'Epic',
  Task: 'Story',
  QA: 'Story',
  Triage: null,
};

const STATUS_OPTIONS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

interface TicketFormModalProps {
  phaseId: string;
  tier: string;
  /** Heading, e.g. "New Story". */
  title: string;
  onClose: () => void;
  /** Called after a successful create (e.g. to refresh + select). */
  onCreated?: (id: string) => void;
  /** Pre-selects the parent (e.g. adding a Story from an Epic's detail view). */
  defaultParentId?: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 text-left">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function TicketFormModal({ phaseId, tier, title, onClose, onCreated, defaultParentId }: TicketFormModalProps) {
  const router = useRouter();
  const { tickets, refreshTickets } = useLifecycle();
  const theme = lifecycleTheme[phaseId] || lifecycleTheme.initiative;
  const parentTier = PARENT_TIER[tier] ?? null;

  // Active roles for THIS ticket's level, grouped by department. The lifecycle is
  // derived from the tier (not the caller's phaseId) so the role list always matches
  // the ticket's level — only roles defined for that level in Agent Roles are offered.
  const roleLifecycle = getPhaseForTier(tier);
  const rolesByDept = useMemo(() => {
    const groups = new Map<string, { id: string; name: string }[]>();
    for (const r of getAgentRoles({ activeOnly: true, lifecycle: roleLifecycle })) {
      if (!groups.has(r.department)) groups.set(r.department, []);
      groups.get(r.department)!.push({ id: r.id, name: r.name });
    }
    return groups;
  }, [roleLifecycle]);

  const [ticketTitle, setTicketTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Backlog');
  const [role, setRole] = useState('');
  const [parentId, setParentId] = useState(defaultParentId || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = useMemo(
    () => (parentTier ? tickets.filter((t: any) => t.tier === parentTier) : []),
    [tickets, parentTier],
  );

  const inputCls =
    'w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all';

  const submit = async () => {
    if (!ticketTitle.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: ticketTitle.trim(),
          description: description.trim(),
          tier,
          status,
          llm_role: role.trim() || null,
          parent_id: parentId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || 'Failed to create ticket');
      await refreshTickets();
      onCreated?.(data.id);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 font-sans text-left">
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-border bg-muted/30 dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-xl text-white shadow-lg', theme.button)}>
              <TicketIcon size={18} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Ad-hoc · {tier} tier</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <Field label="Title">
            <input
              autoFocus
              value={ticketTitle}
              onChange={(e) => setTicketTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder="e.g. Add list-users endpoint"
              className={cn(inputCls, 'py-3 font-bold italic placeholder:text-muted-foreground/40')}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Scope, acceptance criteria, context…"
              className={cn(inputCls, 'resize-none placeholder:text-muted-foreground/40')}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Status">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Assigned Role">
              <select
                value={role}
                onChange={(e) => {
                  if (e.target.value === ADD_ROLE_VALUE) {
                    onClose();
                    router.push('/agent-roles');
                    return;
                  }
                  setRole(e.target.value);
                }}
                className={inputCls}
              >
                <option value="">— Unassigned —</option>
                {[...rolesByDept.entries()].map(([dept, list]) => (
                  <optgroup key={dept} label={dept}>
                    {list.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                  </optgroup>
                ))}
                <option value={ADD_ROLE_VALUE}>＋ Add role…</option>
              </select>
            </Field>
          </div>

          {parentTier && (
            <Field label={`Parent ${parentTier} (optional)`}>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputCls}>
                <option value="">— None (top-level) —</option>
                {parentOptions.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.identifier} · {p.title}</option>
                ))}
              </select>
              {parentOptions.length === 0 && (
                <p className="text-[10px] text-muted-foreground italic px-1">No {parentTier} tickets yet — this will be created top-level.</p>
              )}
            </Field>
          )}

          {error && <p className="text-xs text-red-500 font-medium px-1">{error}</p>}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!ticketTitle.trim() || saving}
            className={cn(
              'px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
              theme.button,
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Create {tier}
          </button>
        </div>
      </div>
    </div>
  );
}
