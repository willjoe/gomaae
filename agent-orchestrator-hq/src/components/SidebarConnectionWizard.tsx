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
  ShieldAlert
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
  type: 'repo' | 'tracker' | 'docs' | 'ai' | 'cloud';
  onConnect: (platformId: string, data: any) => void;
}

export default function SidebarConnectionWizard({ type, onConnect }: SidebarConnectionWizardProps) {
  const { t } = useLifecycle();
  const [step, setStep] = useState<'intro' | 'options' | 'auth'>('intro');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformOption | null>(null);
  const [repoStorage, setRepoStorage] = useState(false);
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
      { id: 'github', name: 'GitHub', icon: <Globe size={16} />, color: 'text-white' },
      { id: 'gitlab', name: 'GitLab', icon: <Code2 size={16} />, color: 'text-orange-500' },
      { id: 'bitbucket', name: 'BitBucket', icon: <Database size={16} />, color: 'text-blue-500' }
    ],
    tracker: [
      { id: 'linear', name: 'Linear', icon: <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[10px] text-black font-bold">L</div>, color: 'text-white' },
      { id: 'jira', name: 'Jira', icon: <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[10px] text-white font-bold">J</div>, color: 'text-blue-400' },
      { id: 'asana', name: 'Asana', icon: <div className="w-4 h-4 bg-pink-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold">A</div>, color: 'text-pink-400' }
    ],
    docs: [
      { id: 'notion', name: 'Notion', icon: <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center text-[10px] text-black font-bold">N</div>, color: 'text-white' },
      { id: 'confluence', name: 'Confluence', icon: <div className="w-4 h-4 bg-blue-700 rounded flex items-center justify-center text-[10px] text-white font-bold">C</div>, color: 'text-blue-500' },
      { id: 's3', name: 'AWS S3 (Assets)', icon: <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center text-[8px] text-white font-bold">S3</div>, color: 'text-orange-400' },
      { id: 'gcs', name: 'GCP Storage (Assets)', icon: <div className="w-4 h-4 bg-white rounded flex items-center justify-center text-[8px] text-blue-600 font-bold border border-blue-100">GCS</div>, color: 'text-blue-500' },
      { id: 'blob', name: 'Azure Blob (Assets)', icon: <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[8px] text-white font-bold">AZ</div>, color: 'text-blue-400' }
    ],
    ai: [
      { id: 'anthropic', name: 'Claude (Anthropic)', icon: <Zap size={16} />, color: 'text-amber-500' },
      { id: 'google', name: 'Gemini (Google)', icon: <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold font-mono">G</div>, color: 'text-blue-400' },
      { id: 'openai', name: 'ChatGPT (OpenAI)', icon: <Cpu size={16} />, color: 'text-emerald-500' },
      { id: 'ollama', name: 'Ollama (Local)', icon: <Globe size={16} />, color: 'text-slate-200' }
    ],
    cloud: [
      { id: 'aws', name: 'Amazon Web Services', icon: <div className="w-4 h-4 bg-orange-500 rounded flex items-center justify-center text-[8px] text-white font-bold uppercase">AWS</div>, color: 'text-orange-400' },
      { id: 'azure', name: 'Microsoft Azure', icon: <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center text-[8px] text-white font-bold uppercase">AZ</div>, color: 'text-blue-400' },
      { id: 'gcp', name: 'Google Cloud Platform', icon: <div className="w-4 h-4 bg-white rounded flex items-center justify-center text-[8px] text-blue-600 font-bold border border-blue-100 uppercase">GCP</div>, color: 'text-blue-500' }
    ]
  };

  const currentOptions = platformData[type];

  if (step === 'intro') {
    return (
      <div className="space-y-4 animate-in fade-in duration-300 font-sans text-left">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
           <div className={cn(
             "p-2 rounded-xl border w-fit", 
             type === 'ai' ? "bg-amber-600/10 text-amber-500 border-amber-500/20" : 
             type === 'cloud' ? "bg-emerald-600/10 text-emerald-500 border-emerald-500/20" :
             "bg-blue-600/10 text-blue-400 border-blue-500/20"
           )}>
              {type === 'ai' ? <Zap size={20} /> : type === 'cloud' ? <CloudLightning size={20} /> : <Cloud size={20} />}
           </div>
           <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest">
                {type === 'ai' ? t('intel_engine') : type === 'cloud' ? t('cloud_infra') : t('online_connectivity')}
              </h3>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">
                 {type === 'ai' 
                   ? 'Choose the intelligence engine that powers your autonomous workers. Connect with industry leaders or run local LLMs.'
                   : type === 'cloud'
                   ? 'Link your cloud service accounts to enable autonomous deployment and synthetic environment scaling.'
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
                "bg-blue-600 hover:bg-blue-500 text-white"
             )}
           >
              <Plus size={14} />
              {type === 'ai' ? t('select_provider') : t('connect_platform')}
           </button>

           {type === 'docs' && (
             <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 transition-all hover:border-blue-500/30">
                  <div className="space-y-0.5 text-left">
                      <div className="text-[9px] font-bold text-slate-200 uppercase tracking-tight">{t('repo_sync')}</div>
                      <div className="text-[8px] text-slate-500 italic leading-none">{t('repo_sync_desc')}</div>
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
                      repoStorage ? "bg-blue-600" : "bg-slate-800"
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
           <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('select_provider')}</h3>
           <button onClick={() => setStep('intro')} className="text-slate-600 hover:text-white transition-colors"><X size={14} /></button>
        </div>
        <div className="space-y-2">
           {currentOptions.map(opt => (
             <button 
                key={opt.id}
                onClick={() => {
                   setSelectedPlatform(opt);
                   setStep('auth');
                }}
                className="w-full bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between group hover:border-blue-500/50 hover:bg-blue-600/5 transition-all text-left"
             >
                <div className="flex items-center gap-3">
                   <div className={cn("p-1.5 bg-slate-950 rounded-lg border border-slate-800", opt.color)}>
                      {opt.icon}
                   </div>
                   <span className="text-xs font-bold text-slate-300">{opt.name}</span>
                </div>
                <ChevronRight size={14} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
             </button>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in slide-in-from-right-2 duration-300 text-left">
       <div className="flex items-center justify-between px-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
             <div className={cn("p-1 bg-slate-950 rounded border border-slate-800", selectedPlatform?.color)}>
                {selectedPlatform?.icon}
             </div>
             <span className="text-[10px] font-bold text-slate-100 uppercase tracking-widest">{selectedPlatform?.name}</span>
          </div>
          <button onClick={() => setStep('options')} className="text-xs font-bold text-slate-600 hover:text-slate-400 font-sans">{t('back')}</button>
       </div>

       <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="space-y-2">
             <label className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-1 font-sans">
               {selectedPlatform?.id === 'ollama' ? 'Local Host Address' : t('credentials')}
             </label>
             <input 
               autoFocus
               type={selectedPlatform?.id === 'ollama' ? 'text' : 'password'} 
               placeholder={selectedPlatform?.id === 'ollama' ? 'http://localhost:11434' : '****************'}
               className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-[11px] text-slate-300 outline-none focus:border-blue-500/50"
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
       </div>
    </div>
  );
}
