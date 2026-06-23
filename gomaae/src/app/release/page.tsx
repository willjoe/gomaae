'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Rocket, Globe, PackageCheck, Activity, TrendingUp, ArrowRight,
  Plus, Monitor, AppWindow, Cpu, ExternalLink, Trash2, X,
  MessageSquare, Send, RefreshCw,
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

// ----- Customer Feedback Panel -----
const FEEDBACK_SOURCES = ['User Report', 'App Store Review', 'Support Ticket', 'Crash Report'] as const;

interface OpsTicket {
  id: string;
  identifier: string;
  title: string;
  status: string;
}

function CustomerFeedbackPanel() {
  const [feedback, setFeedback] = useState('');
  const [source, setSource] = useState<string>('User Report');
  const [product, setProduct] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [opsTickets, setOpsTickets] = useState<OpsTicket[]>([]);
  const [loadingOps, setLoadingOps] = useState(false);

  // Pre-fill product from connected applications named Pokédex
  useEffect(() => {
    fetch('/api/operation/services')
      .then(r => r.json())
      .then(d => {
        const svcs: Service[] = d.services || [];
        const pokedex = svcs.find(s => /pok[eé]dex/i.test(s.name));
        if (pokedex) setProduct(pokedex.name);
      })
      .catch(() => {});
  }, []);

  const loadOpsTickets = useCallback(async () => {
    setLoadingOps(true);
    try {
      const r = await fetch('/api/tickets');
      const d = await r.json();
      const ops: OpsTicket[] = (d.tickets || [])
        .filter((t: any) => t.tier === 'Operation')
        .slice(0, 10)
        .map((t: any) => ({ id: t.id, identifier: t.identifier, title: t.title, status: t.status }));
      setOpsTickets(ops);
    } catch { /* ignore */ }
    setLoadingOps(false);
  }, []);

  useEffect(() => { loadOpsTickets(); }, [loadOpsTickets]);

  const handleSubmit = async () => {
    if (!feedback.trim()) return;
    setSubmitting(true);
    setLastResult(null);
    try {
      const r = await fetch('/api/operation/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback: feedback.trim(), source, product: product.trim() || undefined }),
      });
      const d = await r.json();
      if (d.success) {
        setLastResult(`Created ${d.operation?.identifier} → ${d.story?.identifier} + ${d.tasks?.length ?? 0} tasks`);
        setFeedback('');
        await loadOpsTickets();
      } else {
        setLastResult(`Error: ${d.error || 'Unknown error'}`);
      }
    } catch (e: any) {
      setLastResult(`Error: ${e.message}`);
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-xl">
      <div className="px-6 py-4 bg-muted/50 border-b border-border flex justify-between items-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 font-mono">
          <MessageSquare size={14} />
          Customer Feedback
        </h2>
        <button onClick={loadOpsTickets} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={11} className={loadingOps ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="p-6 space-y-4">
        {/* Feedback textarea */}
        <div>
          <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">Feedback *</label>
          <textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={4}
            placeholder="Paste user feedback, app store review, or support ticket content here..."
            className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Source + Product row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">Source</label>
            <select
              value={source}
              onChange={e => setSource(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {FEEDBACK_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5 block">Product</label>
            <input
              value={product}
              onChange={e => setProduct(e.target.value)}
              placeholder="Pokédex"
              className="w-full border border-border rounded-lg px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center gap-3">
          <button
            disabled={!feedback.trim() || submitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-bold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {submitting ? 'Creating...' : 'Create Operation Ticket'}
          </button>
          {lastResult && (
            <span className={cn(
              'text-xs font-mono px-3 py-1.5 rounded-lg border',
              lastResult.startsWith('Error')
                ? 'bg-red-500/10 text-red-600 border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            )}>
              {lastResult}
            </span>
          )}
        </div>
      </div>

      {/* Recent OPS tickets */}
      {opsTickets.length > 0 && (
        <div className="border-t border-border">
          <div className="px-6 py-3 bg-muted/30">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recent Operations</span>
          </div>
          <div className="divide-y divide-border/40">
            {opsTickets.map(op => (
              <div key={op.id} className="px-6 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[9px] font-mono font-bold text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded shrink-0">
                    {op.identifier}
                  </span>
                  <span className="text-xs text-foreground truncate">{op.title}</span>
                </div>
                <span className={cn(
                  'text-[9px] font-bold uppercase tracking-tighter px-2 py-0.5 rounded border shrink-0',
                  op.status === 'Done' ? 'bg-green-500/10 text-green-600 border-green-500/20'
                  : op.status === 'In Progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  : 'bg-muted text-muted-foreground border-border'
                )}>
                  {op.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
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

                {/* Customer Feedback Panel — above Connected Applications */}
                <CustomerFeedbackPanel />

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
