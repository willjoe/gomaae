'use client';

import React, { useState } from 'react';
import { X, Bug, Lightbulb, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'feature';

function buildBody(type: FeedbackType, fields: Record<string, string>): string {
  if (type === 'bug') {
    return [
      '## What happened?',
      fields.what || '(not provided)',
      '',
      '## Expected behaviour',
      fields.expected || '(not provided)',
      '',
      '## Steps to reproduce',
      fields.steps || '(not provided)',
      '',
      '## Console errors',
      fields.errors ? `\`\`\`\n${fields.errors}\n\`\`\`` : '(none)',
      '',
      '---',
      '**Type:** Bug Report',
      '**Source:** gomaae user',
    ].join('\n');
  }
  return [
    '## Problem being solved',
    fields.problem || '(not provided)',
    '',
    '## Proposed solution',
    fields.solution || '(not provided)',
    '',
    '## Additional context',
    fields.context || '(none)',
    '',
    '---',
    '**Type:** Feature Request',
    '**Source:** gomaae user',
  ].join('\n');
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType]       = useState<FeedbackType>('bug');
  const [title, setTitle]     = useState('');
  const [fields, setFields]   = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<number | null>(null);
  const [error, setError]     = useState('');

  if (!isOpen) return null;

  const set = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));

  const reset = () => {
    setType('bug');
    setTitle('');
    setFields({});
    setSuccess(null);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const canSubmit = type === 'bug' ? !!fields.what?.trim() : !!fields.problem?.trim();

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const description = buildBody(type, fields);
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: title.trim() || undefined, description }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.issueNumber);
      } else {
        setError(data.error || 'Submission failed.');
      }
    } catch {
      setError('Request failed — check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose} />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground">Report / Suggest</h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">Submitted directly to the gomaae creator</p>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {success !== null ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
              <div>
                <p className="font-bold text-foreground">Thank you!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Issue <span className="font-mono font-bold text-foreground">#{success}</span> submitted to gomaae.
                </p>
              </div>
              <button onClick={handleClose} className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-muted hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors">
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Type toggle */}
              <div className="flex gap-2">
                {([['bug', 'Bug Report', <Bug size={13} />], ['feature', 'Feature Request', <Lightbulb size={13} />]] as const).map(([key, label, icon]) => (
                  <button
                    key={key}
                    onClick={() => { setType(key as FeedbackType); setFields({}); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                      type === key
                        ? key === 'bug'
                          ? 'bg-red-600 text-white border-transparent shadow'
                          : 'bg-violet-600 text-white border-transparent shadow'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border',
                    )}
                  >
                    {icon}{label}
                  </button>
                ))}
              </div>

              {/* Title */}
              <Field label="Title" hint="optional">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Short summary…"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-muted-foreground/40"
                />
              </Field>

              {type === 'bug' ? (
                <>
                  <Field label="What happened?" required>
                    <textarea rows={3} value={fields.what || ''} onChange={e => set('what', e.target.value)}
                      placeholder="Describe the actual behaviour you observed."
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none placeholder:text-muted-foreground/40" />
                  </Field>
                  <Field label="Expected behaviour">
                    <textarea rows={2} value={fields.expected || ''} onChange={e => set('expected', e.target.value)}
                      placeholder="What did you expect to happen instead?"
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none placeholder:text-muted-foreground/40" />
                  </Field>
                  <Field label="Steps to reproduce">
                    <textarea rows={3} value={fields.steps || ''} onChange={e => set('steps', e.target.value)}
                      placeholder={"1. Go to…\n2. Click on…\n3. See error"}
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none placeholder:text-muted-foreground/40 font-mono text-xs" />
                  </Field>
                  <Field label="Console errors" hint="optional">
                    <textarea rows={2} value={fields.errors || ''} onChange={e => set('errors', e.target.value)}
                      placeholder="Paste any error messages from the browser console."
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-red-500/50 resize-none placeholder:text-muted-foreground/40 font-mono text-xs" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="Problem being solved" required>
                    <textarea rows={3} value={fields.problem || ''} onChange={e => set('problem', e.target.value)}
                      placeholder="What pain point or gap does this address?"
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none placeholder:text-muted-foreground/40" />
                  </Field>
                  <Field label="Proposed solution">
                    <textarea rows={3} value={fields.solution || ''} onChange={e => set('solution', e.target.value)}
                      placeholder="How would you like it to work?"
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none placeholder:text-muted-foreground/40" />
                  </Field>
                  <Field label="Additional context" hint="optional">
                    <textarea rows={2} value={fields.context || ''} onChange={e => set('context', e.target.value)}
                      placeholder="Screenshots, links, examples…"
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none placeholder:text-muted-foreground/40" />
                  </Field>
                </>
              )}

              {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

              <button
                onClick={submit}
                disabled={!canSubmit || submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-all shadow-lg active:scale-95"
              >
                {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {submitting ? 'Submitting…' : 'Submit to gomaae'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-red-400">*</span>}
        {hint && <span className="normal-case opacity-60 font-normal">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
