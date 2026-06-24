'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Rocket, Globe, PackageCheck, Activity, TrendingUp, ArrowRight,
  Plus, Monitor, AppWindow, Cpu, ExternalLink, Trash2, X,
  MessageSquare, Send, RefreshCw, Upload, CheckCircle2, AlertCircle,
  Clock, Terminal, Webhook, ChevronDown, ChevronRight,
  ScrollText, Copy, Download, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import StatCard from '@/components/StatCard';
import LifecyclePageLayout from '@/components/LifecyclePageLayout';
import RoadmapGantt from '@/components/RoadmapGantt';
import TicketHandler from '@/components/TicketHandler';
import { useLifecycle } from '@/context/LifecycleContext';
import { GanttScale } from '@/components/gantt/types';

// ----- Service types -----
interface Service {
  id: string;
  name: string;
  type: 'web' | 'tauri' | 'api' | 'other';
  url?: string | null;
  command?: string | null;
  description?: string | null;
}

const TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  web:   { label: 'Web',   icon: <Globe size={14} />,      color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  tauri: { label: 'Tauri', icon: <AppWindow size={14} />,  color: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  api:   { label: 'API',   icon: <Cpu size={14} />,        color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  other: { label: 'Other', icon: <Monitor size={14} />,    color: 'text-muted-foreground bg-muted/50 border-border' },
};

const EMPTY_FORM = { name: '', type: 'web' as Service['type'], url: '', command: '', description: '' };

function ServiceForm({ onSave, onCancel }: { onSave: (s: Omit<Service, 'id'>) => void; onCancel: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0;
  return (
    <div className="border border-border rounded-2xl p-4 bg-card space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Pokédex" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Type *</label>
          <select value={form.type} onChange={e => set('type', e.target.value)} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="web">Web</option>
            <option value="tauri">Tauri App</option>
            <option value="api">API</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      {(form.type === 'web' || form.type === 'api') && (
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">URL</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="http://localhost:3000" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
      )}
      {form.type === 'tauri' && (
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Launch Command / Binary Path</label>
          <input value={form.command} onChange={e => set('command', e.target.value)} placeholder="cargo tauri dev  or  /path/to/app" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </div>
      )}
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Description</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this service do?" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-indigo-500" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button disabled={!valid} onClick={() => onSave({ name: form.name.trim(), type: form.type, url: form.url || null, command: form.command || null, description: form.description || null })} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors">Add Service</button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function ConnectedApplications() {
  const [services, setServices] = useState<Service[]>([]);
  const [adding, setAdding] = useState(false);

  const reload = useCallback(async () => {
    const r = await fetch('/api/operation/services');
    if (r.ok) setServices((await r.json()).services || []);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSave = async (data: Omit<Service, 'id'>) => {
    await fetch('/api/operation/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setAdding(false);
    reload();
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/operation/services', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _delete: true, id }) });
    reload();
  };

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl">
      <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
          <Monitor size={14} />
          Connected Applications
        </h2>
        <button onClick={() => setAdding(a => !a)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors">
          {adding ? <X size={12} /> : <Plus size={12} />}
          {adding ? 'Cancel' : 'Add Service'}
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {adding && (
          <div className="p-4">
            <ServiceForm onSave={handleSave} onCancel={() => setAdding(false)} />
          </div>
        )}

        {services.length === 0 && !adding ? (
          <div className="text-center py-12 text-muted-foreground italic font-sans text-sm">
            No services registered. Add a web app, Tauri app, or API to link here.
          </div>
        ) : services.map(svc => {
          const meta = TYPE_META[svc.type] || TYPE_META.other;
          const hasLink = svc.type !== 'tauri' && svc.url;
          const isTauri = svc.type === 'tauri';
          return (
            <div key={svc.id} className="p-5 flex items-center justify-between gap-4 group hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', meta.color)}>
                  {meta.icon}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-foreground truncate">{svc.name}</div>
                  {svc.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{svc.description}</div>}
                  {isTauri && svc.command && (
                    <div className="text-[10px] font-mono text-muted-foreground/70 mt-0.5 truncate">{svc.command}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn('text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded border', meta.color)}>{meta.label}</span>
                {hasLink && (
                  <a href={svc.url!} target="_blank" rel="noreferrer" className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-indigo-500">
                    <ExternalLink size={13} />
                  </a>
                )}
                {isTauri && (
                  <span className="text-[9px] text-violet-400 font-bold uppercase tracking-tighter bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">Desktop App</span>
                )}
                <button onClick={() => handleDelete(svc.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-500">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ----- Deployment Panel -----
type DeployEnv = 'production' | 'staging' | 'preview';

interface DeployTarget {
  id: string;
  name: string;
  env: DeployEnv;
  command?: string | null;
  webhookUrl?: string | null;
  description?: string | null;
  lastDeployedAt?: string | null;
  lastStatus?: 'success' | 'failure' | 'running' | null;
  lastLog?: string | null;
}

const ENV_META: Record<DeployEnv, { label: string; color: string }> = {
  production: { label: 'Production', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  staging:    { label: 'Staging',    color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  preview:    { label: 'Preview',    color: 'text-sky-600 bg-sky-500/10 border-sky-500/20' },
};

const EMPTY_DEP_FORM = { name: '', env: 'staging' as DeployEnv, command: '', webhookUrl: '', description: '' };

function DeployForm({ onSave, onCancel }: { onSave: (d: Omit<DeployTarget, 'id'>) => void; onCancel: () => void }) {
  const [form, setForm] = useState(EMPTY_DEP_FORM);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && (form.command.trim().length > 0 || form.webhookUrl.trim().length > 0);

  return (
    <div className="border border-border rounded-2xl p-4 bg-card space-y-3 text-sm">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Production Deploy" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Environment *</label>
          <select value={form.env} onChange={e => set('env', e.target.value)} className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500">
            <option value="staging">Staging</option>
            <option value="production">Production</option>
            <option value="preview">Preview</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Deploy Command</label>
        <input value={form.command} onChange={e => set('command', e.target.value)} placeholder="./scripts/deploy.sh  or  gh workflow run deploy.yml" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Webhook URL (alternative to command)</label>
        <input value={form.webhookUrl} onChange={e => set('webhookUrl', e.target.value)} placeholder="https://api.vercel.com/v1/integrations/deploy/..." className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500" />
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Description</label>
        <input value={form.description} onChange={e => set('description', e.target.value)} placeholder="What does this deploy?" className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button disabled={!valid} onClick={() => onSave({ name: form.name.trim(), env: form.env, command: form.command.trim() || null, webhookUrl: form.webhookUrl.trim() || null, description: form.description.trim() || null })} className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors">Add Target</button>
        <button onClick={onCancel} className="px-4 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
      </div>
    </div>
  );
}

function DeploymentPanel() {
  const [targets, setTargets] = useState<DeployTarget[]>([]);
  const [adding, setAdding] = useState(false);
  const [deploying, setDeploying] = useState<Record<string, boolean>>({});
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const r = await fetch('/api/operation/deployments');
    if (r.ok) setTargets((await r.json()).targets || []);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSave = async (data: Omit<DeployTarget, 'id'>) => {
    await fetch('/api/operation/deployments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setAdding(false);
    reload();
  };

  const handleDelete = async (id: string) => {
    await fetch('/api/operation/deployments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _delete: true, id }) });
    reload();
  };

  const handleDeploy = async (id: string) => {
    setDeploying(d => ({ ...d, [id]: true }));
    try {
      const r = await fetch('/api/operation/deployments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ _trigger: true, id }) });
      const data = await r.json();
      if (data.target) {
        setTargets(prev => prev.map(t => t.id === id ? data.target : t));
        setExpandedLog(id);
      }
    } catch { /* ignore */ }
    setDeploying(d => ({ ...d, [id]: false }));
  };

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl">
      <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
          <Upload size={14} />
          Deployment Targets
        </h2>
        <button onClick={() => setAdding(a => !a)} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">
          {adding ? <X size={12} /> : <Plus size={12} />}
          {adding ? 'Cancel' : 'Add Target'}
        </button>
      </div>

      <div className="divide-y divide-border/50">
        {adding && (
          <div className="p-4">
            <DeployForm onSave={handleSave} onCancel={() => setAdding(false)} />
          </div>
        )}

        {targets.length === 0 && !adding ? (
          <div className="text-center py-12 text-muted-foreground italic font-sans text-sm">
            No deployment targets configured. Add a deploy command or webhook.
          </div>
        ) : targets.map(target => {
          const envMeta = ENV_META[target.env] || ENV_META.staging;
          const isRunning = deploying[target.id];
          const logOpen = expandedLog === target.id;

          return (
            <div key={target.id} className="group">
              <div className="p-5 flex items-center justify-between gap-4 group-hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', envMeta.color)}>
                    <Rocket size={14} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{target.name}</div>
                    {target.description && <div className="text-xs text-muted-foreground truncate mt-0.5">{target.description}</div>}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {target.command && (
                        <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground/70 truncate max-w-[220px]">
                          <Terminal size={9} /> {target.command}
                        </span>
                      )}
                      {target.webhookUrl && !target.command && (
                        <span className="flex items-center gap-1 text-[9px] font-mono text-muted-foreground/70 truncate max-w-[220px]">
                          <Webhook size={9} /> webhook
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Last deploy status */}
                  {target.lastStatus === 'success' && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-green-600 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded">
                      <CheckCircle2 size={9} /> Success
                    </span>
                  )}
                  {target.lastStatus === 'failure' && (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
                      <AlertCircle size={9} /> Failed
                    </span>
                  )}
                  {target.lastDeployedAt && (
                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
                      <Clock size={9} /> {new Date(target.lastDeployedAt).toLocaleString()}
                    </span>
                  )}

                  <span className={cn('text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded border', envMeta.color)}>{envMeta.label}</span>

                  {/* Expand log */}
                  {target.lastLog && (
                    <button onClick={() => setExpandedLog(logOpen ? null : target.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                      {logOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    </button>
                  )}

                  {/* Deploy button */}
                  <button
                    onClick={() => handleDeploy(target.id)}
                    disabled={isRunning}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                      target.env === 'production'
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                        : "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/30 disabled:opacity-50"
                    )}
                  >
                    {isRunning ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
                    {isRunning ? 'Deploying…' : 'Deploy'}
                  </button>

                  <button onClick={() => handleDelete(target.id)} className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all text-muted-foreground hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Inline log */}
              {logOpen && target.lastLog && (
                <div className="px-5 pb-4">
                  <pre className="text-[10px] font-mono bg-muted/40 border border-border rounded-xl px-4 py-3 overflow-x-auto whitespace-pre-wrap text-muted-foreground leading-relaxed max-h-40 overflow-y-auto">
                    {target.lastLog}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FeedbackPost {
  id: string;
  type: 'bug' | 'feature';
  content: string;
  author: string | null;
  ticket_identifier: string | null;
  ticket_tier: string | null;
  created_at: string;
}

const TYPE_CONFIG = {
  bug:     { label: 'Bug Report',          color: 'bg-red-500/10 text-red-400 border-red-500/20',    dot: 'bg-red-500' },
  feature: { label: 'Feature Improvement', color: 'bg-violet-500/10 text-violet-400 border-violet-500/20', dot: 'bg-violet-500' },
} as const;

function FeedbackWall() {
  const [posts, setPosts] = useState<FeedbackPost[]>([]);
  const [type, setType] = useState<'bug' | 'feature'>('bug');
  const [content, setContent] = useState('');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/release/feedback');
      const d = await r.json();
      if (d.success) setPosts(d.posts || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const r = await fetch('/api/release/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: content.trim(), author: author.trim() || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        setContent('');
        await load();
      } else {
        setError(d.error || 'Failed to submit.');
      }
    } catch { setError('Request failed.'); }
    finally { setSubmitting(false); }
  };

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      const diff = Date.now() - d.getTime();
      if (diff < 60_000) return 'just now';
      if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
      if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
      return d.toLocaleDateString();
    } catch { return ts; }
  };

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl text-left">
      <div className="px-6 py-4 bg-muted/50 border-b border-border flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
          <MessageSquare size={14} />
          Feedback &amp; Bug Reports
        </h2>
        <button onClick={load} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
          <RefreshCw size={11} />
          Refresh
        </button>
      </div>

      {/* Submission form */}
      <div className="p-6 border-b border-border space-y-3">
        {/* Type toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1 w-fit border border-border">
          {(['bug', 'feature'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                type === t
                  ? 'bg-background text-foreground shadow border border-border'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn('w-1.5 h-1.5 rounded-full', TYPE_CONFIG[t].dot)} />
              {TYPE_CONFIG[t].label}
            </button>
          ))}
        </div>

        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={3}
          placeholder={type === 'bug'
            ? 'Describe the bug — what happened, what did you expect?'
            : 'Describe the improvement or feature you\'d like to see…'}
          className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center gap-3">
          <input
            value={author}
            onChange={e => setAuthor(e.target.value)}
            placeholder="Your name (optional)"
            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            disabled={!content.trim() || submitting}
            onClick={submit}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors shrink-0"
          >
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 font-mono">{error}</p>}
      </div>

      {/* Post feed */}
      <div className="divide-y divide-border/40 max-h-[480px] overflow-y-auto">
        {posts.length === 0 ? (
          <div className="text-center py-12 text-[10px] text-muted-foreground/50 uppercase tracking-widest font-mono italic">
            No feedback yet — be the first to submit.
          </div>
        ) : posts.map(post => {
          const cfg = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.bug;
          return (
            <div key={post.id} className="p-5 space-y-2 hover:bg-muted/20 transition-colors">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border', cfg.color)}>
                  {cfg.label}
                </span>
                {post.ticket_identifier && (
                  <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    → {post.ticket_identifier}
                  </span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground font-mono">{formatTime(post.created_at)}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
              {post.author && (
                <p className="text-[10px] text-muted-foreground font-mono">— {post.author}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReleaseNotesPanel() {
  const [version, setVersion] = useState('');
  const [since, setSince] = useState('');
  const [generating, setGenerating] = useState(false);
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setGenerating(true);
    setError('');
    setNotes('');
    try {
      const res = await fetch('/api/release/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: version || undefined, since: since || undefined }),
      });
      const data = await res.json();
      if (data.success) setNotes(data.notes);
      else setError(data.error || 'Generation failed.');
    } catch {
      setError('Request failed.');
    } finally {
      setGenerating(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([notes], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = version ? `release-notes-${version.replace(/^v/, '')}.md` : 'release-notes.md';
    a.click();
  };

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl text-left">
      <div className="px-6 py-4 bg-muted/50 border-b border-border flex items-center gap-2">
        <ScrollText size={14} className="text-green-500" />
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground font-mono">Release Notes</h2>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Version</label>
            <input
              value={version}
              onChange={e => setVersion(e.target.value)}
              placeholder="0.1.12"
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-green-500 w-28"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1 block">Since (optional)</label>
            <input
              type="date"
              value={since}
              onChange={e => setSince(e.target.value)}
              className="border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-green-500 w-40"
            />
          </div>
          <button
            onClick={generate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Sparkles size={12} className={generating ? 'animate-spin' : ''} />
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 font-mono">{error}</p>
        )}

        {notes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 justify-end">
              <button onClick={copy} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground transition-colors">
                <Copy size={11} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button onClick={download} className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground border border-border hover:border-muted-foreground transition-colors">
                <Download size={11} />
                Download .md
              </button>
            </div>
            <pre className="bg-muted/50 border border-border rounded-xl p-4 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {notes}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReleasePage() {
  const { tickets, loading, setPhaseSelectedTicket, t } = useLifecycle();
  const [scale, setScale] = useState<GanttScale>('days');

  const shippedTickets = useMemo(() => tickets.filter((tk: any) => tk.tier === 'Triage' && tk.status === 'Done'), [tickets]);
  const productionDone = shippedTickets.length;

  return (
    <TicketHandler phaseId="release" tier="Triage">
      {({
        filteredTickets: triageTickets,
        searchQuery,
        setSearchQuery,
        activeFilters,
        toggleAssigneeFilter,
        resetFilters,
        temporalBoundaries
      }) => {
        const triagePending = triageTickets.filter(tk => tk.status !== 'Done').length;

        return (
          <LifecyclePageLayout
            phaseId="release"
            tier="Triage"
            title={t('operation')}
            description={t('operation_desc')}
            buttonLabel={t('new_triage')}

            sidebarProps={{
              tickets: triageTickets,
              searchQuery,
              onSearchChange: setSearchQuery,
              activeAssigneeFilters: activeFilters.assignees,
              onToggleAssignee: toggleAssigneeFilter,
              onResetFilters: resetFilters
            }}

            dashboardContent={
              <div className="space-y-12 font-sans">
                {/* Maintenance Gantt (Decoupled from Sidebar via TicketHandler) */}
                <RoadmapGantt
                  tickets={triageTickets}
                  onSelectTicket={(tk: any) => setPhaseSelectedTicket('release', tk.id)}
                  scale={scale}
                  onScaleChange={setScale}
                  temporalBoundaries={temporalBoundaries}
                  phaseId="release"
                />

                {/* Operation Status Dashboard */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-left-4 duration-300">
                  <StatCard
                    icon={<TrendingUp size={20} />}
                    label={t('production')}
                    value={`${productionDone} Artifacts`}
                    desc="Live Systems Healthy"
                    color="green"
                  />
                  <StatCard
                    icon={<Activity size={20} />}
                    label={t('feedback')}
                    value={`${triagePending} Triage`}
                    desc="Intake Review Pending"
                    color="orange"
                  />
                  <StatCard
                    icon={<Globe size={20} />}
                    label="Global"
                    value="99.98%"
                    desc={t('global_uptime')}
                    color="blue"
                  />
                </section>

                {/* Deployment Targets */}
                <DeploymentPanel />

                {/* Feedback & Bug Reports wall */}
                <FeedbackWall />

                {/* Release Notes Generator */}
                <ReleaseNotesPanel />

                {/* Connected Applications */}
                <ConnectedApplications />

                {/* Production History */}
                <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl transition-colors duration-300 text-left">
                  <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
                      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
                        <PackageCheck size={14} />
                        {t('live_artifacts')}
                      </h2>
                      <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded tracking-tighter uppercase font-mono italic">Production Release Active</span>
                  </div>
                  <div className="divide-y divide-border/50 text-sm">
                      {loading ? (
                        <div className="text-center py-12 text-muted-foreground italic text-xs font-mono animate-pulse tracking-widest uppercase">Monitoring production signals...</div>
                      ) : shippedTickets.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground italic font-sans">No production history found.</div>
                      ) : shippedTickets.map(tk => (
                        <div
                          key={tk.id}
                          onClick={() => setPhaseSelectedTicket('release', tk.id)}
                          className="p-6 flex items-center justify-between hover:bg-green-500/5 transition-colors group cursor-pointer"
                        >
                            <div className="flex items-center space-x-5 text-left">
                              <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 border border-green-500/20 group-hover:scale-110 transition-transform shadow-lg">
                                <Rocket size={24} />
                              </div>
                              <div>
                                <div className="font-bold text-lg text-foreground tracking-tight">{tk.title}</div>
                                <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-tighter font-bold opacity-80">{tk.identifier} • Released to Public</div>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-8">
                              <div className="hidden sm:block">
                                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest text-right mb-1">{t('stability')}</div>
                                  <div className="flex items-center gap-1.5 justify-end">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    <span className="text-[10px] text-green-500 font-mono font-bold tracking-tighter uppercase">Live</span>
                                  </div>
                              </div>
                              <ArrowRight size={20} className="text-muted-foreground/30 group-hover:text-green-500 transition-all group-hover:translate-x-1" />
                            </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            }
          />
        );
      }}
    </TicketHandler>
  );
}
