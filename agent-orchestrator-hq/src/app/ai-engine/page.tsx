'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Search, 
  Terminal, 
  Cpu, 
  Zap, 
  MessageSquare, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Code2,
  Clock,
  ExternalLink,
  History as HistoryIcon,
  Lock,
  Save,
  Key as KeyIcon,
  BrainCircuit,
  Activity,
  ZapOff,
  Monitor,
  Trash2,
  Plus,
  Globe
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
  const [defaultEngine, setDefaultEngine] = useState('ollama');

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success) {
          setConfig(data.config);
          if (data.config.default_ai_engine) setDefaultEngine(data.config.default_ai_engine);
      }
      setLoading(false);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSetDefault = async (engine: string) => {
    setDefaultEngine(engine);
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ default_ai_engine: engine })
        });
    } catch (err) {
        console.error('Failed to set default engine:', err);
    }
  };

  const handleRemoveProvider = async (providerId: string) => {
    try {
        // Disconnect by clearing relevant keys and settings
        const updates: any = {
            [`${providerId}_api_key`]: '',
            [`${providerId}_oauth_active`]: 'false'
        };
        if (defaultEngine === providerId) {
            updates.default_ai_engine = 'ollama';
            setDefaultEngine('ollama');
        }

        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        fetchConfig();
    } catch (err) {
        console.error('Failed to remove provider:', err);
    }
  };

  const hasAnthropic = !!config.anthropic_api_key || config.anthropic_oauth_active === 'true';
  const hasGoogle = !!config.google_api_key || config.google_oauth_active === 'true';
  const hasOpenAI = !!config.openai_api_key;
  const hasLocal = true;

  const availableModels = [
    { id: 'anthropic', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', icon: <Zap size={18} />, color: 'text-amber-500', active: hasAnthropic },
    { id: 'google', name: 'Gemini 1.5 Pro', provider: 'Google', icon: <Cpu size={18} />, color: 'text-blue-500', active: hasGoogle },
    { id: 'openai', name: 'GPT-4o (Omni)', provider: 'OpenAI', icon: <BrainCircuit size={18} />, color: 'text-emerald-500', active: hasOpenAI },
    { id: 'ollama', name: 'Llama 3 (Local)', provider: 'Meta/Ollama', icon: <Globe size={18} />, color: 'text-indigo-500', active: hasLocal }
  ];

  const sidebarContent = (
    <div className="space-y-4">
       <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">{t('orchestration_health')}</h3>
       <div className="space-y-4 text-left">
          <div className="bg-card p-3 rounded-xl border border-border shadow-inner flex justify-between items-center">
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('active_nodes')}</span>
             <span className="text-[10px] font-mono font-bold text-amber-500 uppercase text-right">
               {[hasAnthropic, hasGoogle, hasOpenAI, hasLocal].filter(Boolean).length} Online
             </span>
          </div>
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
           {/* Active Intelligence Stack */}
           <section className="space-y-6 text-left">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                 <Activity size={16} className="text-amber-500" />
                 Active Intelligence Stack
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
                {/* Dynamically render active cards */}
                {availableModels.filter(m => m.active).map(model => (
                    <div 
                      key={model.id}
                      onClick={() => handleSetDefault(model.id)}
                      className={cn(
                        "bg-card border rounded-3xl p-6 flex flex-col justify-between shadow-xl border-l-4 transition-all cursor-pointer group relative overflow-hidden",
                        defaultEngine === model.id ? "border-amber-500 ring-2 ring-amber-500/10 scale-[1.02]" : "border-border border-l-muted-foreground/30 hover:border-amber-500/50"
                      )}
                    >
                       <div className="flex justify-between items-start mb-4">
                          <div className={cn("p-3 rounded-2xl border transition-colors", model.color, "bg-muted/50 border-border")}>
                             {model.icon}
                          </div>
                          <div className="flex items-center gap-2">
                             {model.id !== 'ollama' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleRemoveProvider(model.id); }}
                                  className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors bg-muted/50 rounded-lg opacity-0 group-hover:opacity-100"
                                >
                                   <Trash2 size={12} />
                                </button>
                             )}
                             <div className={cn(
                               "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                               defaultEngine === model.id ? "border-amber-500 bg-amber-500" : "border-border"
                             )}>
                                {defaultEngine === model.id && <CheckCircle2 size={12} className="text-white" />}
                             </div>
                          </div>
                       </div>
                       <div>
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{model.provider}</div>
                          <div className="text-xl font-bold text-foreground italic uppercase">{model.name}</div>
                          <div className="mt-4 flex items-center justify-between">
                             <span className="text-[9px] font-bold text-green-600 dark:text-green-500 uppercase tracking-tighter bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{t('authenticated')}</span>
                             {config[`${model.id}_oauth_active`] === 'true' && <span className="text-[7px] font-bold text-blue-500 uppercase">via OAuth 2.0</span>}
                          </div>
                       </div>
                    </div>
                ))}
              </div>
           </section>

           {/* All Available Models Registry */}
           <section className="space-y-6 text-left">
              <div className="flex items-center justify-between px-1">
                 <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <BrainCircuit size={16} className="text-indigo-500" />
                    Available Intelligence Registry
                 </h2>
                 <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-40 italic">System Marketplace</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {availableModels.map(model => (
                    <div key={`registry-${model.id}`} className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-md">
                       <div className="flex items-center gap-4">
                          <div className={cn("p-2 bg-muted rounded-xl border border-border transition-transform group-hover:scale-110", model.color)}>
                             {model.icon}
                          </div>
                          <div className="space-y-0.5 text-left">
                             <div className="text-xs font-bold text-foreground">{model.name}</div>
                             <div className="text-[9px] text-muted-foreground uppercase tracking-tighter font-medium">{model.provider}</div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-3">
                          {model.active ? (
                             <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 text-green-600 dark:text-green-500 rounded-lg border border-green-500/20 text-[9px] font-bold uppercase tracking-widest">
                                <CheckCircle2 size={10} />
                                Active
                             </div>
                          ) : (
                             <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all shadow-md active:scale-95">
                                <Plus size={10} />
                                Connect
                             </button>
                          )}
                       </div>
                    </div>
                 ))}
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
