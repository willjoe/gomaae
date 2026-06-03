'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowRight, 
  ExternalLink, 
  Database, 
  Cloud,
  FileText,
  X,
  CheckCircle2,
  ChevronRight,
  Globe,
  Code2,
  Library as LibraryIcon,
  Zap,
  Cpu,
  ShieldCheck,
  Save,
  CloudLightning,
  ShieldAlert,
  Trophy
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlatformOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
}

interface SidebarConnectionWizardProps {
  type: 'repo' | 'tracker' | 'docs' | 'ai' | 'cloud' | 'initiative';
  onConnect: (platformId: string, data: any) => void;
}

export default function SidebarConnectionWizard({ type, onConnect }: SidebarConnectionWizardProps) {
  const { t } = useLifecycle();
  const [step, setStep] = useState<'intro' | 'options' | 'auth'>('intro');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformOption | null>(null);
  const [repoStorage, setRepoStorage] = useState(false);
  const [authMethod, setAuthMethod] = useState<'apikey' | 'oauth'>('apikey');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (type === 'docs') {
      fetch('/api/config').then(res => res.json()).then(data => {
        if (data.success && data.config.repo_sync_active === 'true') {
          setRepoStorage(true);
        }
      });
    }
  }, [type]);

  const handleOAuth = async () => {
    setSaving(true);
    // Mock OAuth Redirect Flow
    console.log(`[OAuth] Redirecting to ${selectedPlatform?.name} authorization...`);
    setTimeout(async () => {
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    [`${selectedPlatform?.id}_oauth_active`]: 'true',
                    [`${selectedPlatform?.id}_api_key`]: 'oauth_managed_token' 
                })
            });
            window.location.reload();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    }, 1500);
  };

  const handleInitialize = async () => {
    setSaving(true);
    try {
      if (type === 'docs') {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_sync_active: repoStorage ? 'true' : 'false' })
        });
      }

      if (type === 'cloud') {
         await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cloud_active: 'true' })
          });
      }
      
      setStep('intro');
      onConnect(selectedPlatform?.id || 'unknown', { repoSync: repoStorage });
      window.location.reload(); 
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const platformData = {
    repo: [
      { id: 'github', name: 'GitHub', icon: <Globe size={16} />, color: 'text-foreground' },
      { id: 'gitlab', name: 'GitLab', icon: <Code2 size={16} />, color: 'text-orange-500' },
      { id: 'bitbucket', name: 'BitBucket', icon: <Database size={16} />, color: 'text-blue-500' }
    ],
    tracker: [
      { id: 'linear', name: 'Linear', icon: <div className="w-4 h-4 bg-foreground rounded-full flex items-center justify-center text-[10px] text-background font-bold">L</div>, color: 'text-foreground' },
      { id: 'jira', name: 'Jira', icon: <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] text-white font-bold">J</div>, color: 'text-blue-500' },
      { id: 'asana', name: 'Asana', icon: <div className="w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">A</div>, color: 'text-pink-500' }
    ],
    docs: [
      { id: 'notion', name: 'Notion', icon: <div className="w-4 h-4 bg-foreground rounded-full flex items-center justify-center text-[10px] text-background font-bold">N</div>, color: 'text-foreground' },
      { id: 'confluence', name: 'Confluence', icon: <div className="w-4 h-4 bg-blue-700 rounded flex items-center justify-center text-[10px] text-white font-bold">C</div>, color: 'text-blue-500' },
      { id: 's3', name: 'AWS S3 (Assets)', icon: <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center text-[8px] text-white font-bold">S3</div>, color: 'text-orange-500' },
      { id: 'gcs', name: 'GCP Storage (Assets)', icon: <div className="w-4 h-4 bg-card rounded flex items-center justify-center text-[8px] text-blue-600 font-bold border border-blue-100">GCS</div>, color: 'text-blue-500' },
      { id: 'blob', name: 'Azure Blob (Assets)', icon: <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[8px] text-white font-bold">AZ</div>, color: 'text-blue-500' }
    ],
    ai: [
      { id: 'anthropic', name: 'Claude (Anthropic)', icon: <Zap size={16} />, color: 'text-amber-500' },
      { id: 'google', name: 'Gemini (Google)', icon: <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold font-mono">G</div>, color: 'text-blue-500' },
      { id: 'openai', name: 'ChatGPT (OpenAI)', icon: <Cpu size={16} />, color: 'text-emerald-500' },
      { id: 'ollama', name: 'Ollama (Local)', icon: <Globe size={16} />, color: 'text-muted-foreground' }
    ],
    cloud: [
      { id: 'aws', name: 'Amazon Web Services', icon: <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center text-[8px] text-white font-bold uppercase">AWS</div>, color: 'text-orange-500' },
      { id: 'azure', name: 'Microsoft Azure', icon: <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[8px] text-white font-bold uppercase">AZ</div>, color: 'text-blue-500' },
      { id: 'gcp', name: 'Google Cloud Platform', icon: <div className="w-4 h-4 bg-card rounded flex items-center justify-center text-[8px] text-blue-600 font-bold border border-blue-100 uppercase">GCP</div>, color: 'text-blue-500' }
    ],
    initiative: [
      { id: 'internal', name: 'Internal Epic Issuance', icon: <Trophy size={16} />, color: 'text-indigo-500' }
    ]
  };

  const currentOptions = platformData[type];

  if (step === 'intro') {
    return (
      <div className="space-y-4 animate-in fade-in duration-300 font-sans text-left">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-xl transition-colors duration-300">
           <div className={cn(
             "p-2 rounded-xl border w-fit transition-colors", 
             type === 'ai' ? "bg-amber-600/10 text-amber-600 dark:text-amber-500 border-amber-500/20" : 
             type === 'cloud' ? "bg-emerald-600/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20" :
             type === 'initiative' ? "bg-indigo-600/10 text-indigo-600 dark:text-indigo-500 border-indigo-500/20" :
             "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
           )}>
              {type === 'ai' ? <Zap size={20} /> : type === 'cloud' ? <CloudLightning size={20} /> : type === 'initiative' ? <Trophy size={20} /> : <Cloud size={20} />}
           </div>
           <div className="space-y-2">
              <h3 className="text-xs font-bold text-foreground uppercase tracking-widest">
                {type === 'ai' ? t('intel_engine') : type === 'cloud' ? t('cloud_infra') : type === 'initiative' ? 'Epic Issuance' : t('online_connectivity')}
              </h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                 {type === 'ai' 
                   ? 'Choose the intelligence engine that powers your autonomous workers. Connect with industry leaders or run local LLMs.'
                   : type === 'cloud'
                   ? 'Link your cloud service accounts to enable autonomous deployment and synthetic environment scaling.'
                   : type === 'initiative'
                   ? 'Define the high-integrity issuance protocol for new epics and strategic pillars.'
                   : `Connect with popular platforms to collaborate with your team and keep an immutable backup of your ${type === 'repo' ? 'source code' : type === 'tracker' ? 'ticket manager' : 'knowledge base'} online.`
                 }
              </p>
           </div>
           <button 
             onClick={() => setStep('options')}
             className={cn(
                "w-full py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2",
                type === 'ai' ? "bg-amber-600 hover:bg-amber-500 text-white" : 
                type === 'cloud' ? "bg-emerald-600 hover:bg-emerald-500 text-white" :
                type === 'initiative' ? "bg-indigo-600 hover:bg-indigo-500 text-white" :
                "bg-blue-600 hover:bg-blue-500 text-white"
             )}
           >
              <Plus size={14} />
              {type === 'ai' ? t('select_provider') : (type === 'initiative' ? 'Select Protocol' : t('connect_platform'))}
           </button>

           {type === 'docs' && (
             <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border border-border transition-all hover:border-blue-500/30">
                  <div className="space-y-0.5 text-left">
                      <div className="text-[9px] font-bold text-foreground uppercase tracking-tight">{t('repo_sync')}</div>
                      <div className="text-[8px] text-muted-foreground italic leading-none">{t('repo_sync_desc')}</div>
                  </div>
                  <button 
                    onClick={() => {
                        const next = !repoStorage;
                        setRepoStorage(next);
                        fetch('/api/config', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ repo_sync_active: next ? 'true' : 'false' })
                        }).then(() => {
                            setTimeout(() => window.location.reload(), 100);
                        });
                    }}
                    className={cn(
                      "w-8 h-4 rounded-full relative transition-colors duration-200",
                      repoStorage ? "bg-blue-600" : "bg-border dark:bg-slate-800"
                    )}
                  >
                      <div className={cn(
                        "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200 shadow-sm",
                        repoStorage ? "translate-x-4" : "translate-x-0"
                      )} />
                  </button>
                </div>
             </div>
           )}
        </div>
      </div>
    );
  }

  if (step === 'options') {
    return (
      <div className="space-y-4 animate-in slide-in-from-right-2 duration-300 text-left">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('select_provider')}</h3>
           <button onClick={() => setStep('intro')} className="text-muted-foreground hover:text-foreground transition-colors"><X size={14} /></button>
        </div>
        <div className="space-y-2">
           {currentOptions.map(opt => (
             <button 
                key={opt.id}
                onClick={() => {
                   setSelectedPlatform(opt);
                   setStep('auth');
                }}
                className="w-full bg-card border border-border p-3 rounded-xl flex items-center justify-between group hover:border-blue-500/50 hover:bg-blue-600/5 transition-all text-left shadow-md"
             >
                <div className="flex items-center gap-3">
                   <div className={cn("p-1.5 bg-muted rounded-lg border border-border transition-colors", opt.color)}>
                      {opt.icon}
                   </div>
                   <span className="text-xs font-bold text-foreground/80 group-hover:text-foreground">{opt.name}</span>
                </div>
                <ChevronRight size={14} className="text-muted-foreground group-hover:text-blue-500 transition-colors" />
             </button>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300 text-left">
       <div className="flex items-center justify-between px-2 border-b border-border pb-2">
          <div className="flex items-center gap-2">
             <div className={cn("p-1 bg-muted rounded border border-border", selectedPlatform?.color)}>
                {selectedPlatform?.icon}
             </div>
             <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">{selectedPlatform?.name}</span>
          </div>
          <button onClick={() => setStep('options')} className="text-xs font-bold text-muted-foreground hover:text-foreground font-sans transition-colors">{t('back')}</button>
       </div>

       <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-xl transition-colors">
          {(selectedPlatform?.id === 'google' || selectedPlatform?.id === 'anthropic') && (
            <div className="flex bg-muted rounded-xl p-1 mb-4">
              <button 
                onClick={() => setAuthMethod('apikey')}
                className={cn(
                  "flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  authMethod === 'apikey' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                API Key
              </button>
              <button 
                onClick={() => setAuthMethod('oauth')}
                className={cn(
                  "flex-1 py-1.5 text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  authMethod === 'oauth' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                OAuth 2.0
              </button>
            </div>
          )}

          {authMethod === 'apikey' ? (
            <>
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1 font-sans">
                  {selectedPlatform?.id === 'ollama' ? 'Local Host Address' : (type === 'initiative' ? 'Verification Token' : t('credentials'))}
                </label>
                <input 
                  autoFocus
                  type={selectedPlatform?.id === 'ollama' ? 'text' : 'password'} 
                  placeholder={selectedPlatform?.id === 'ollama' ? 'http://localhost:11434' : '****************'}
                  className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-[11px] text-foreground outline-none focus:border-blue-500/50 transition-all placeholder:text-muted-foreground/40"
                />
              </div>

              <button 
                onClick={handleInitialize}
                disabled={saving}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={12} />
                {saving ? '...' : `${t('initialize')} ${type === 'ai' ? 'Engine' : type === 'cloud' ? 'Provider' : 'Connection'}`}
              </button>
            </>
          ) : (
            <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
               <div className="p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-3">
                  <div className="flex justify-center">
                     <ShieldCheck size={32} className="text-blue-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                    Enterprise-grade authentication. Direct integration without manually handling long-lived API secrets.
                  </p>
               </div>
               
               <button 
                 onClick={handleOAuth}
                 disabled={saving}
                 className="w-full py-4 bg-foreground text-background hover:bg-foreground/90 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3"
               >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <ExternalLink size={16} />
                      Connect via OAuth
                    </>
                  )}
               </button>

               <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter opacity-50">
                  Redirects to {selectedPlatform?.name} Central Auth
               </p>
            </div>
          )}
       </div>
    </div>
  );
}
