'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bot,
  MessageSquare,
  ChevronDown,
  CheckCircle2,
  History as HistoryIcon,
  Activity,
  Loader2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import BrandIcon from '@/components/BrandIcon';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEFAULT_DAILY_TOKEN_BUDGET = 1_000_000;
const PROVIDER_IDS = ['anthropic', 'google', 'openai', 'ollama'] as const;

function formatLastSynced(ts: number | null): string {
  if (!ts) return 'Never synced';
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

export default function AIEngineViewer() {
  const { t } = useLifecycle();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [models, setModels] = useState<any[]>([]);
  const [providerHealth, setProviderHealth] = useState<Record<string, any>>({});
  const [defaultModelId, setDefaultModelId] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<string[]>(['anthropic', 'google', 'ollama']);
  const [fetchingModels, setFetchingModels] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  // Discovery often completes in ~1s, so the spinner alone is easy to miss — hold a
  // visible "Synced" confirmation for a few seconds after a successful refresh.
  const [justSynced, setJustSynced] = useState(false);
  const justSyncedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dailyBudgets, setDailyBudgets] = useState<Record<string, number>>({});
  // In-progress text edits of the numeric budget field, keyed by provider —
  // committed (parsed + saved) on blur/Enter, so typing doesn't fight formatting.
  const [budgetDrafts, setBudgetDrafts] = useState<Record<string, string>>({});
  const budgetSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
        setConfig(data.config);
        setDefaultModelId(data.config.default_ai_engine || null);
        const budgets: Record<string, number> = {};
        for (const id of PROVIDER_IDS) {
          const saved = parseInt(data.config[`${id}_daily_token_budget`], 10);
          if (!isNaN(saved)) budgets[id] = saved;
        }
        setDailyBudgets(budgets);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Full discovery — runs CLI / external API calls server-side.
  // Only called when cache is stale or user manually requests it.
  const refreshModels = useCallback(async () => {
    setFetchingModels(true);
    try {
      const res = await fetch('/api/ai/models?refresh=true');
      const data = await res.json();
      if (data.success) {
        setModels(data.models);
        if (data.providerHealth) setProviderHealth(data.providerHealth);
        setLastFetchedAt(data.lastFetchedAt ?? null);
        setJustSynced(true);
        if (justSyncedTimer.current) clearTimeout(justSyncedTimer.current);
        justSyncedTimer.current = setTimeout(() => setJustSynced(false), 4000);
      }
    } catch (err) {
      console.error('Failed to refresh models:', err);
    } finally {
      setFetchingModels(false);
    }
  }, []);

  // Fast load — reads the DB cache instantly, then decides whether to background-refresh.
  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/models');
      const data = await res.json();
      if (data.success) {
        // Hydrate immediately from cached data — no empty flash
        if (data.models.length > 0) {
          setModels(data.models);
          if (data.providerHealth) setProviderHealth(data.providerHealth);
        }
        setLastFetchedAt(data.lastFetchedAt ?? null);

        // Background-refresh if cache is stale or has never been populated
        const isStale = !data.lastFetchedAt || (Date.now() - data.lastFetchedAt > CACHE_TTL_MS);
        if (isStale) {
          refreshModels();
        }
      }
    } catch (err) {
      console.error('Failed to load cached models:', err);
      refreshModels(); // fall back to full fetch if even the fast read fails
    }
  }, [refreshModels]);

  useEffect(() => {
    fetchConfig();
    loadModels();
  }, []);

  // The default-engine selector now lives on the Agent Assignments page; this page
  // is read-only provider/model status. (defaultModelId is still tracked so removing
  // a provider can clear a default that pointed at it.)

  // Slider moves update locally right away; the write to project_settings is
  // debounced per provider so dragging doesn't spam the config API.
  const handleBudgetChange = (providerId: string, value: number) => {
    setDailyBudgets(prev => ({ ...prev, [providerId]: value }));
    clearTimeout(budgetSaveTimers.current[providerId]);
    budgetSaveTimers.current[providerId] = setTimeout(() => {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [`${providerId}_daily_token_budget`]: String(value) }),
      }).catch(err => console.error('Failed to save daily token budget:', err));
    }, 400);
  };

  // Budget shown/edited in millions of tokens; trailing zeros trimmed (1.0 → "1").
  const formatBudgetM = (tokens: number) => (tokens / 1_000_000).toFixed(2).replace(/\.?0+$/, '');

  const commitBudgetDraft = (providerId: string) => {
    const draft = budgetDrafts[providerId];
    if (draft === undefined) return;
    const v = parseFloat(draft);
    if (!isNaN(v) && v > 0) handleBudgetChange(providerId, Math.round(v * 1_000_000));
    setBudgetDrafts(prev => { const next = { ...prev }; delete next[providerId]; return next; });
  };

  const handleRemoveProvider = async (providerId: string) => {
    try {
      const updates: any = {
        [`${providerId}_api_key`]: '',
        [`${providerId}_oauth_active`]: 'false',
        [`${providerId}_cli_active`]: 'false',
      };
      if (providerId === 'ollama') updates.ollama_host = '';

      const relatedModels = models.filter(m => m.providerId === providerId);
      if (relatedModels.some(m => m.id === defaultModelId)) {
        updates.default_ai_engine = '';
        setDefaultModelId(null);
      }

      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      fetchConfig();
      refreshModels(); // force re-discovery after credential change
    } catch (err) {
      console.error('Failed to remove provider:', err);
    }
  };

  const toggleProvider = (id: string) => {
    setExpandedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const hasAnthropic = !!config.anthropic_api_key || config.anthropic_oauth_active === 'true' || config.anthropic_cli_active === 'true';
  const hasGoogle    = !!config.google_api_key    || config.google_oauth_active === 'true'    || config.google_cli_active === 'true';
  const hasOpenAI    = !!config.openai_api_key;
  const hasLocal     = !!config.ollama_host       || config.ollama_cli_active === 'true';

  const providers = [
    { id: 'anthropic', name: 'Anthropic',     icon: <BrandIcon brand="anthropic" size={18} />, color: 'text-amber-500',  active: hasAnthropic },
    { id: 'google',    name: 'Gemini',        icon: <BrandIcon brand="gemini" size={18} />,    color: 'text-blue-500',   active: hasGoogle    },
    { id: 'openai',    name: 'OpenAI',        icon: <BrandIcon brand="openai" size={18} />,    color: 'text-emerald-500',active: hasOpenAI    },
    { id: 'ollama',    name: 'Meta / Ollama', icon: <BrandIcon brand="ollama" size={18} />,    color: 'text-indigo-500', active: hasLocal     },
  ];

  const sidebarContent = (
    <div className="space-y-4 text-left">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
        {t('orchestration_health')}
      </h3>
      <div className="bg-card p-3 rounded-xl border border-border shadow-inner flex justify-between items-center">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('active_nodes')}</span>
        <span className="text-[10px] font-mono font-bold text-amber-500 uppercase text-right">
          {providers.filter(p => p.active).length} Online
        </span>
      </div>
    </div>
  );

  return (
    <SystemViewerLayout
      id="ai-engine"
      title={t('ai_engine')}
      description={t('ai_engine_subtitle')}
      wizardType="ai"
      sidebarContent={sidebarContent}
    >
      <div className="space-y-12 pb-20">

        {/* Unified Model Registry */}
        <section className="space-y-6 text-left">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Activity size={16} className="text-amber-500" />
              Intelligence Node Registry
            </h2>

            <div className="flex items-center gap-3">
              {fetchingModels ? (
                <div className="flex items-center gap-2 animate-in fade-in duration-300">
                  <Loader2 size={12} className="animate-spin text-indigo-500" />
                  <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-tighter">Synchronizing...</span>
                </div>
              ) : justSynced ? (
                <span className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-500 uppercase tracking-tighter animate-in fade-in zoom-in-95 duration-300">
                  <CheckCircle2 size={12} /> Synced · {models.length} models
                </span>
              ) : (
                <span className="text-[9px] text-muted-foreground font-mono opacity-50 italic">
                  {formatLastSynced(lastFetchedAt)}
                </span>
              )}
              <button
                onClick={refreshModels}
                disabled={fetchingModels}
                title="Force sync now"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all disabled:opacity-30"
              >
                <RefreshCw size={13} className={cn(fetchingModels && 'animate-spin')} />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {providers.map(provider => {
              const providerModels = models.filter(m => m.providerId === provider.id);
              const isExpanded = expandedProviders.includes(provider.id);
              const health = providerHealth[provider.id] || { status: 'ok' };
              const isUnauthorized = health.status === 'unauthorized';
              const isError = health.status === 'error';

              return (
                <div
                  key={provider.id}
                  className={cn(
                    'bg-card border border-border rounded-3xl overflow-hidden shadow-xl transition-all',
                    (isUnauthorized || isError) && 'opacity-75 border-red-500/20'
                  )}
                >
                  {/* Header Row */}
                  <div
                    onClick={() => toggleProvider(provider.id)}
                    className={cn(
                      'px-6 py-4 flex items-center justify-between cursor-pointer transition-colors group',
                      provider.active ? 'bg-muted/30' : 'bg-muted/10 grayscale opacity-60',
                      (isUnauthorized || isError) && 'bg-red-500/5'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'p-2 rounded-xl border border-border bg-card shadow-sm transition-transform group-hover:scale-110',
                        provider.color,
                        (isUnauthorized || isError) && 'grayscale opacity-50'
                      )}>
                        {provider.icon}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-foreground uppercase tracking-widest">{provider.name}</div>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border',
                            isUnauthorized ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                            isError        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                            provider.active ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                             'bg-slate-500/10 text-slate-500 border-slate-500/20'
                          )}>
                            {isUnauthorized ? 'Logged Out' : isError ? 'Offline' : provider.active ? 'Authenticated' : 'Offline'}
                          </span>
                          {provider.active && config[`${provider.id}_oauth_active`] === 'true' && (
                            <span className="text-[8px] font-bold text-blue-500 uppercase tracking-tighter">OAuth 2.0</span>
                          )}
                          {provider.active && config[`${provider.id}_cli_active`] === 'true' && (
                            <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Local CLI</span>
                          )}
                          {(isUnauthorized || isError) && (
                            <span className="text-[8px] font-bold text-red-500 italic flex items-center gap-1">
                              <AlertCircle size={10} /> {health.message}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Daily Token budget — per-provider resource governance */}
                      {provider.active && (
                        <div onClick={e => e.stopPropagation()} className="w-1/5 min-w-[140px] cursor-default space-y-1">
                          <div className="flex justify-between items-center">
                            <label className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                              <ShieldCheck size={10} className="text-emerald-500" />
                              Daily Token
                            </label>
                            <span className="flex items-center gap-0.5 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={budgetDrafts[provider.id] ?? formatBudgetM(dailyBudgets[provider.id] ?? DEFAULT_DAILY_TOKEN_BUDGET)}
                                onChange={(e) => setBudgetDrafts(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                onFocus={(e) => e.target.select()}
                                onBlur={() => commitBudgetDraft(provider.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                className="w-10 bg-transparent text-right text-[9px] font-mono font-bold text-emerald-500 outline-none"
                              />
                              <span className="text-[9px] font-mono font-bold text-emerald-500">M</span>
                            </span>
                          </div>
                          <input
                            type="range"
                            min="100000"
                            max="5000000"
                            step="100000"
                            value={Math.min(5_000_000, Math.max(100_000, dailyBudgets[provider.id] ?? DEFAULT_DAILY_TOKEN_BUDGET))}
                            onChange={(e) => handleBudgetChange(provider.id, parseInt(e.target.value, 10))}
                            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                          />
                        </div>
                      )}
                      {provider.active && (
                        <button
                          onClick={e => { e.stopPropagation(); handleRemoveProvider(provider.id); }}
                          className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                          title="Remove Authentication"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      <div className={cn('p-1.5 rounded-lg hover:bg-muted transition-all', isExpanded && 'rotate-180')}>
                        <ChevronDown size={16} className="text-muted-foreground" />
                      </div>
                    </div>
                  </div>

                  {/* Collapsible Models List */}
                  {isExpanded && provider.active && (
                    <div className="animate-in slide-in-from-top-2 duration-300 border-t border-border/50">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-muted/10 border-b border-border/30">
                              <th className="px-8 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Model Identifier</th>
                              <th className="px-6 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Capabilities</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {providerModels.length > 0 ? (
                              providerModels.map(model => (
                                <tr
                                  key={model.id}
                                  className={cn(
                                    'group hover:bg-muted/20 transition-colors',
                                    (isUnauthorized || isError) && 'opacity-40 pointer-events-none'
                                  )}
                                >
                                  <td className="px-8 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className={cn(
                                        'w-1.5 h-1.5 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]',
                                        isUnauthorized || isError ? 'bg-slate-400 shadow-none' : 'bg-blue-500'
                                      )} />
                                      <span className="text-xs font-bold text-foreground italic">{model.name}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter bg-muted px-2 py-0.5 rounded border border-border">
                                      {model.type}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={2} className="px-8 py-10 text-center text-[10px] text-muted-foreground italic uppercase tracking-widest opacity-40">
                                  {fetchingModels ? 'Synchronizing Model Registry...' : 'No compatible models found for this node.'}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Immutable Prompt History */}
        <section className="space-y-6 text-left">
          <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
            <HistoryIcon size={16} className="text-muted-foreground" />
            {t('prompt_history')}
          </h2>
          <div className="bg-muted/20 border border-border border-dashed rounded-3xl p-20 text-center space-y-4 opacity-40">
            <MessageSquare size={32} className="mx-auto text-muted-foreground" />
            <p className="text-[10px] text-muted-foreground italic font-mono uppercase tracking-widest leading-loose text-center">
              Prompt Ledger Empty<br />
              <span className="text-[8px] opacity-70 font-bold uppercase tracking-tighter italic">
                Live logs will appear here during task execution
              </span>
            </p>
          </div>
        </section>

      </div>
    </SystemViewerLayout>
  );
}
