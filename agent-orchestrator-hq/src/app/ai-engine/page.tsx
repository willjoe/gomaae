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
  ZapOff
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

  useEffect(() => {
    fetch('/api/config').then(res => res.json()).then(data => {
      if (data.success) setConfig(data.config);
      setLoading(false);
    });
  }, []);

  const hasAnthropic = !!config.anthropic_api_key || config.anthropic_oauth_active === 'true';
  const hasGoogle = !!config.google_api_key || config.google_oauth_active === 'true';
  const hasLocal = !!config.ollama_host;

  const sidebarContent = (
    <div className="space-y-4">
       <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border pb-2">{t('orchestration_health')}</h3>
       <div className="space-y-4 text-left">
          <div className="bg-card p-3 rounded-xl border border-border shadow-inner flex justify-between items-center">
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('active_nodes')}</span>
             <span className="text-[10px] font-mono font-bold text-amber-500 uppercase text-right">
               {[hasAnthropic, hasGoogle, hasLocal].filter(Boolean).length} Online
             </span>
          </div>
          <div className="bg-card p-3 rounded-xl border border-border shadow-inner flex justify-between items-center">
             <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Auth Status</span>
             <span className="text-[10px] font-mono font-bold text-green-500 uppercase">Verified</span>
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
      <div className="space-y-12">
           {/* Active Intelligence Stack */}
           <section className="space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                 <BrainCircuit size={16} className="text-amber-500" />
                 {t('intel_stack')}
              </h2>
              
              {!hasAnthropic && !hasGoogle && !hasLocal ? (
                <div className="bg-muted/30 border-2 border-dashed border-border rounded-3xl p-12 text-center space-y-4 opacity-50">
                   <ZapOff size={32} className="mx-auto text-muted-foreground" />
                   <p className="text-[10px] text-muted-foreground italic font-mono uppercase tracking-widest leading-loose text-center">
                      No Active Intelligence Nodes<br/>
                      <span className="text-[8px] opacity-70 font-bold uppercase tracking-tighter">Initialize a provider in the sidebar to wake autonomous workers</span>
                   </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
                  {hasAnthropic && (
                    <div className="bg-card border border-border rounded-3xl p-6 flex items-center justify-between shadow-xl border-l-4 border-l-amber-500/50">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-600/10 rounded-2xl text-amber-600 dark:text-amber-500 border border-amber-500/20">
                             <Zap size={24} />
                          </div>
                          <div>
                             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('primary_node')}</div>
                             <div className="text-xl font-bold text-foreground italic uppercase">Anthropic Claude</div>
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-bold text-green-600 dark:text-green-500 uppercase tracking-tighter bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{t('authenticated')}</span>
                          {config.anthropic_oauth_active === 'true' && <span className="text-[7px] font-bold text-blue-500 uppercase">via OAuth 2.0</span>}
                       </div>
                    </div>
                  )}
                  {hasGoogle && (
                    <div className="bg-card border border-border rounded-3xl p-6 flex items-center justify-between shadow-xl border-l-4 border-l-blue-500/50">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-blue-600/10 rounded-2xl text-blue-600 dark:text-blue-400 border border-blue-500/20">
                             <Cpu size={24} />
                          </div>
                          <div>
                             <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('secondary_node')}</div>
                             <div className="text-xl font-bold text-foreground italic uppercase">Google Gemini</div>
                          </div>
                       </div>
                       <div className="flex flex-col items-end gap-1">
                          <span className="text-[9px] font-bold text-green-600 dark:text-green-500 uppercase tracking-tighter bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">{t('authenticated')}</span>
                          {config.google_oauth_active === 'true' && <span className="text-[7px] font-bold text-blue-500 uppercase">via OAuth 2.0</span>}
                       </div>
                    </div>
                  )}
                </div>
              )}
           </section>

           {/* Immutable Prompt History */}
           <section className="space-y-6">
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
