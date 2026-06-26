'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Plus, Loader2, Ticket as TicketIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/cn';
import { lifecycleTheme } from '@/lib/theme';
import { useLifecycle } from '@/context/LifecycleContext';
import { getAgentRoles } from '@/lib/agentRoles';
import { getPhaseForTier } from '@/lib/phaseConfig';

const ADD_ROLE_VALUE = '__add_role__';

const PARENT_TIER: Record<string, string | null> = {
  Epic: null,
  Story: 'Epic',
  Task: 'Story',
  QA: 'Task',
  Triage: null,
};

// These tiers require a role (authorized_model is resolved server-side from the role's Agent Assignment).
const ROLE_REQUIRED_TIERS = new Set(['Operation', 'Story', 'Task', 'QA', 'UnitTest', 'Triage']);

const STATUS_OPTIONS = ['Backlog', 'To Do', 'In Progress', 'In Review', 'Done'];

const AI_HINT: Record<string, string> = {
  Epic:   'e.g. "We need an Epic covering user authentication — OAuth, MFA, and session management"',
  Story:  'e.g. "Add a dark mode toggle to the settings page with preference persisted per user"',
  Task:   'e.g. "Fix the race condition in the sync daemon that causes duplicate ticket creation on reconnect"',
  QA:     'e.g. "Verify the login flow works end-to-end including error states and redirect logic"',
  Triage: 'e.g. "Users are reporting that the export button freezes on large datasets — it starts loading but never finishes"',
};

interface TicketFormModalProps {
  phaseId: string;
  tier: string;
  title: string;
  onClose: () => void;
  onCreated?: (id: string) => void;
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
  const [aiPrompt, setAiPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parentOptions = useMemo(
    () => (parentTier ? tickets.filter((t: any) => t.tier === parentTier) : []),
    [tickets, parentTier],
  );

  const inputCls =
    'w-full bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-blue-500/20 transition-all';

  const parentRequired = parentTier !== null;
  const roleRequired = ROLE_REQUIRED_TIERS.has(tier);
  const usingAI = !!aiPrompt.trim();
  const canSubmit =
    !saving &&
    (!parentRequired || !!parentId) &&
    (usingAI ? true : !!ticketTitle.trim()) &&
    (!roleRequired || usingAI || !!role);

  const submit = async () => {
    if (!canSubmit) {
      if (parentRequired && !parentId) setError(`A parent ${parentTier} ticket is required.`);
      else if (roleRequired && !role) setError('An assigned role is required for this ticket type.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      let finalTitle = ticketTitle.trim();
      let finalDesc = description.trim();
      let finalStatus = status;
      let finalRole = role.trim() || null;

      // Triage + AI → generate the full Operation → Story → Task + QA tree.
      if (usingAI && tier === 'Triage') {
        const triageRes = await fetch('/api/tickets/triage-expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: aiPrompt.trim() }),
        });
        const triageData = await triageRes.json();
        if (!triageRes.ok || !triageData.success) throw new Error(triageData.error || 'Triage expansion failed');
        await refreshTickets();
        onCreated?.(triageData.operation.id);
        onClose();
        return;
      }

      let startDate: string | null = null;
      let dueDate: string | null = null;
      let authorizedModel: string | null = null;

      if (usingAI) {
        const genRes = await fetch('/api/tickets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: aiPrompt.trim(), tier }),
        });
        const genData = await genRes.json();
        if (!genRes.ok || !genData.success) throw new Error(genData.error || 'AI generation failed');
        finalTitle = genData.title;
        finalDesc = genData.description;
        finalStatus = genData.status || 'Backlog';
        finalRole = genData.llm_role || null;
        startDate = genData.start_datetime || null;
        dueDate = genData.due_datetime || null;
        authorizedModel = genData.authorized_model || null;
      }

      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: finalTitle,
          description: finalDesc,
          tier,
          status: finalStatus,
          llm_role: finalRole,
          parent_id: parentId || null,
          start_datetime: startDate,
          due_datetime: dueDate,
          authorized_model: authorizedModel,
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

      <div className="relative w-full max-w-4xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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

        {/* Two-column body */}
        <div className="flex max-h-[70vh]">
          {/* Left — manual form */}
          <div className="flex-1 p-8 space-y-5 overflow-y-auto custom-scrollbar min-w-0">
            <Field label="Title">
              <input
                autoFocus={!usingAI}
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
              <Field label={roleRequired ? 'Assigned Role *' : 'Assigned Role'}>
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
                  className={cn(inputCls, roleRequired && !role && !usingAI ? 'ring-2 ring-red-500/30 border-red-500/40' : '')}
                >
                  <option value="">— {roleRequired ? 'Select a role (required)' : 'Unassigned'} —</option>
                  {[...rolesByDept.entries()].map(([dept, list]) => (
                    <optgroup key={dept} label={dept}>
                      {list.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
                    </optgroup>
                  ))}
                  <option value={ADD_ROLE_VALUE}>＋ Add role…</option>
                </select>
                {roleRequired && !role && !usingAI && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 italic px-1">
                    Required — model is resolved from the role's Agent Assignment.
                  </p>
                )}
              </Field>
            </div>

            {parentTier && (
              <Field label={`Parent ${parentTier} *`}>
                <select
                  value={parentId}
                  onChange={(e) => { setParentId(e.target.value); setError(null); }}
                  className={cn(inputCls, !parentId && parentRequired ? 'ring-2 ring-red-500/30 border-red-500/40' : '')}
                >
                  <option value="">— Select a {parentTier} —</option>
                  {parentOptions.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.identifier} · {p.title}</option>
                  ))}
                </select>
                {parentOptions.length === 0 ? (
                  <p className="text-[10px] text-red-500 font-medium px-1">No {parentTier} tickets exist yet — create one first.</p>
                ) : !parentId ? (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 italic px-1">Required: choose a parent {parentTier}.</p>
                ) : null}
              </Field>
            )}
          </div>

          {/* Divider with "or" */}
          <div className="relative flex-shrink-0 w-px bg-border my-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-full px-2.5 py-1 z-10">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">or</span>
            </div>
          </div>

          {/* Right — AI instruction */}
          <div className="flex-1 p-8 flex flex-col gap-3 min-w-0">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles size={13} className="text-violet-400 shrink-0" />
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  Instruct or provide feedback to the AI Agent to create a ticket
                </label>
              </div>
              <p className="text-[10px] text-muted-foreground/60 pl-[21px] leading-relaxed">
                Describe what you need in plain language. The agent will determine the title, description, and scope.
              </p>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder={AI_HINT[tier] || 'Describe the ticket you need…'}
              className={cn(
                inputCls,
                'flex-1 resize-none placeholder:text-muted-foreground/30 min-h-[220px]',
                usingAI && 'ring-2 ring-violet-500/20 border-violet-500/30',
              )}
            />

            <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
              {tier === 'Story' && 'A new feature or capability will be created under the selected Epic.'}
              {tier === 'Task' && 'Can be a bug fix, technical improvement, or implementation step under the selected Story.'}
              {tier === 'Epic' && 'Describes a high-level strategic goal that groups multiple Stories.'}
              {tier === 'QA' && 'Generates a test or quality-assurance ticket tied to the parent Task.'}
              {tier === 'Triage' && usingAI && 'AI will generate a full Operation → Story → Task + QA hierarchy from your description.'}
              {tier === 'Triage' && !usingAI && 'An ad-hoc ticket for incoming requests, bugs, or unplanned work.'}
              {!['Story', 'Task', 'Epic', 'QA', 'Triage'].includes(tier) && `Creates a ${tier} ticket from your description.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
          {error && <p className="text-xs text-red-500 font-medium flex-1">{error}</p>}
          <div className="flex items-center gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className={cn(
                'px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                usingAI ? 'bg-violet-600 hover:bg-violet-500 shadow-violet-900/30' : theme.button,
              )}
            >
              {saving
                ? <Loader2 size={16} className="animate-spin" />
                : usingAI
                ? <Sparkles size={16} />
                : <Plus size={16} />
              }
              {saving
                ? usingAI ? 'Generating…' : 'Creating…'
                : usingAI && tier === 'Triage' ? 'Expand Triage → Hierarchy'
                : usingAI ? `Generate & Create ${tier}` : `Create ${tier}`
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
