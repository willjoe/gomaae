'use client';

import React, { useState } from 'react';
import { X, Bug, Lightbulb, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackType = 'bug' | 'feature';

const TYPE_CONFIG: Record<FeedbackType, { label: string; icon: React.ReactNode; color: string; placeholder: string }> = {
  bug: {
    label: 'Bug Report',
    icon: <Bug size={14} />,
    color: 'bg-red-600 text-white',
    placeholder: 'What happened? What did you expect instead? Include any steps to reproduce.',
  },
  feature: {
    label: 'Feature Request',
    icon: <Lightbulb size={14} />,
    color: 'bg-violet-600 text-white',
    placeholder: 'Describe the improvement or feature you\'d like to see.',
  },
};

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [type, setType]               = useState<FeedbackType>('bug');
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting]   = useState(false);
  const [success, setSuccess]         = useState<number | null>(null);
  const [error, setError]             = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setType('bug');
    setTitle('');
    setDescription('');
    setSuccess(null);
    setError('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, title: title.trim() || undefined, description: description.trim() }),
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      <div className="relative w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
        <div className="p-6 space-y-4">
          {success !== null ? (
            <div className="text-center py-6 space-y-3">
              <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
              <div>
                <p className="font-bold text-foreground">Thank you!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Issue <span className="font-mono font-bold text-foreground">#{success}</span> submitted to gomaae.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-muted hover:bg-foreground/10 text-muted-foreground hover:text-foreground transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Type toggle */}
              <div className="flex gap-2">
                {(Object.entries(TYPE_CONFIG) as [FeedbackType, typeof TYPE_CONFIG[FeedbackType]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border',
                      type === key
                        ? cfg.color + ' border-transparent shadow'
                        : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border',
                    )}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </button>
                ))}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Title <span className="normal-case opacity-60">(optional)</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Short summary…"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-blue-500/50 placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                  Details <span className="text-red-400">*</span>
                </label>
                <textarea
                  autoFocus
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder={TYPE_CONFIG[type].placeholder}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none placeholder:text-muted-foreground/40"
                />
              </div>

              {error && <p className="text-xs text-red-400 font-mono">{error}</p>}

              <button
                onClick={submit}
                disabled={!description.trim() || submitting}
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
