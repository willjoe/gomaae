'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bot, 
  Cpu, 
  Zap, 
  MessageSquare, 
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  History as HistoryIcon,
  BrainCircuit,
  Activity,
  ZapOff,
  Monitor,
  Trash2,
  Plus,
  Globe,
  Settings,
  ShieldAlert,
  Loader2,
  Terminal
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import SystemViewerLayout from '@/components/SystemViewerLayout';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AIEngineViewer() {
  const { t } = useLifecycle();
  const [config, setConfig] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [fetchingModels, setFetchingModels] = useState(true);
  const [models, setModels] = useState<any[]>([]);
  const [defaultModelId, setDefaultModelId] = useState('ollama-llama-3');
  const [expandedProviders, setExpandedProviders] = useState<string[]>(['anthropic', 'google', 'ollama']);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
          setConfig(data.config);
          if (data.config.default_ai_engine) setDefaultModelId(data.config.default_ai_engine);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchModels = async () => {
    setFetchingModels(true);
    try {
        const res = await fetch('/api/ai/models');
        const data = await res.json();
        if (data.success) {
            setModels(data.models);
        }
    } catch (err) {
        console.error('Failed to fetch live models:', err);
    } finally {
        setFetchingModels(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchModels();
  }, []);

  const handleSetDefault = async (modelId: string) => {
    setDefaultModelId(modelId);
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ default_ai_engine: modelId })
        });
    } catch (err) {
        console.error('Failed to set default engine:', err);
    }
  };

  const handleRemoveProvider = async (providerId: string) => {
    try {
        const updates: any = {
            [`${providerId}_api_key`]: '',
            [`${providerId}_oauth_active`]: 'false',
            [`${providerId}_cli_active`]: 'false'
        };
        const relatedModels = models.filter(m => m.providerId === providerId);
        if (relatedModels.some(m => m.id === defaultModelId)) {
            updates.default_ai_engine = 'ollama-llama-3';
            setDefaultModelId('ollama-llama-3');
        }

        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        fetchConfig();
        fetchModels();
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
  const hasGoogle = !!config.google_api_key || config.google_oauth_active === 'true' || config.google_cli_active === 'true';
  const hasOpenAI = !!config.openai_api_key;
  const hasLocal = true;

  const providers = [
    { id: 'anthropic', name: 'Anthropic', icon: <Zap size={18} />, color: 'text-amber-500', active: hasAnthropic },
    { id: 'google', name: 'Google Cloud', icon: <Cpu size={18} />, color: 'text-blue-500', active: hasGoogle },
    { id: 'openai', name: 'OpenAI', icon: <BrainCircuit size={18} />, color: 'text-emerald-500', active: hasOpenAI },
    { id: 'ollama', name: 'Meta / Ollama', icon: <Globe size={18} />, color: 'text-indigo-500', active: hasLocal }
  ];

  const sidebarContent = (
    <div className="space-y-4 text-left">
       <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">{t('orchestration_health')}</h3>
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
                 {fetchingModels && <Loader2 size={14} className="animate-spin text-indigo-500" />}
                 <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 italic font-mono tracking-tighter">Verified Cluster</span>
              </div>

              <div className="space-y-4">
                 {providers.map(provider => {
                    const providerModels = models.filter(m => m.providerId === provider.id);
                    const isExpanded = expandedProviders.includes(provider.id);
                    
                    return (
                       <div key={provider.id} className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl transition-all">
                          {/* Header Row */}
                          <div 
                             onClick={() => toggleProvider(provider.id)}
                             className={cn(
                               "px-6 py-4 flex items-center justify-between cursor-pointer transition-colors group",
                               provider.active ? "bg-muted/30" : "bg-muted/10 grayscale opacity-60"
                             )}
                          >
                             <div className="flex items-center gap-4">
                                <div className={cn("p-2 rounded-xl border border-border bg-card shadow-sm transition-transform group-hover:scale-110", provider.color)}>
                                   {provider.icon}
                                </div>
                                <div className="space-y-0.5">
                                   <div className="text-xs font-bold text-foreground uppercase tracking-widest">{provider.name}</div>
                                   <div className="flex items-center gap-2">
                                      <span className={cn(
                                         "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full border",
                                         provider.active ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                                      )}>
                                         {provider.active ? 'Authenticated' : 'Offline'}
                                      </span>
                                      {provider.active && config[`${provider.id}_oauth_active`] === 'true' && (
                                         <span className="text-[8px] font-bold text-blue-500 uppercase tracking-tighter">OAuth 2.0</span>
                                      )}
                                      {provider.active && config[`${provider.id}_cli_active`] === 'true' && (
                                         <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tighter">Local CLI</span>
                                      )}
                                   </div>
                                </div>
                             </div>

                             <div className="flex items-center gap-3">
                                {provider.active && provider.id !== 'ollama' && (
                                   <button 
                                     onClick={(e) => { e.stopPropagation(); handleRemoveProvider(provider.id); }}
                                     className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                     title="Remove Authentication"
                                   >
                                      <Trash2 size={14} />
                                   </button>
                                )}
                                <div className={cn("p-1.5 rounded-lg hover:bg-muted transition-all", isExpanded && "rotate-180")}>
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
                                         <th className="px-6 py-3 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Default AI Engine</th>
                                      </tr>
                                   </thead>
                                   <tbody className="divide-y divide-border/30">
                                      {providerModels.length > 0 ? (
                                         providerModels.map(model => (
                                             <tr key={model.id} className="group hover:bg-muted/20 transition-colors">
                                                <td className="px-8 py-4">
                                                   <div className="flex items-center gap-3">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                                      <span className="text-xs font-bold text-foreground italic">{model.name}</span>
                                                   </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                   <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter bg-muted px-2 py-0.5 rounded border border-border">{model.type}</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                   <button 
                                                     onClick={() => handleSetDefault(model.id)}
                                                     className={cn(
                                                       "w-5 h-5 rounded-full border-2 mx-auto flex items-center justify-center transition-all",
                                                       defaultModelId === model.id ? "border-indigo-500 bg-indigo-500 shadow-lg shadow-indigo-900/20" : "border-border hover:border-indigo-500/50"
                                                     )}
                                                   >
                                                      {defaultModelId === model.id && <CheckCircle2 size={12} className="text-white" />}
                                                   </button>
                                                </td>
                                             </tr>
                                          ))
                                      ) : (
                                         <tr>
                                             <td colSpan={3} className="px-8 py-10 text-center text-[10px] text-muted-foreground italic uppercase tracking-widest opacity-40">
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
                    Prompt Ledger Empty<br/>
                    <span className="text-[8px] opacity-70 font-bold uppercase tracking-tighter italic">Live logs will appear here during task execution</span>
                 </p>
              </div>
           </section>
        </div>
    </SystemViewerLayout>
  );
}
