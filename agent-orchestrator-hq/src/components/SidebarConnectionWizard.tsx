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
  Trophy,
  Terminal,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';


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
  const [authMethod, setAuthMethod] = useState<'apikey' | 'oauth' | 'cli'>('apikey');
  const [credentials, setCredentials] = useState('');
  const [saving, setSaving] = useState(false);
  const [cliStatus, setCliStatus] = useState<{ installed: boolean, toolName?: string, version?: string, authStatus?: string } | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<{ id: string; name: string; key?: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [detectingTeams, setDetectingTeams] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [webhookSaved, setWebhookSaved] = useState(false);

  useEffect(() => {
    if (authMethod === 'cli' && selectedPlatform) {
        validateCLI();
    }
  }, [authMethod, selectedPlatform]);

  // Load per-workstation settings so we can show which platforms are already connected.
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(d => { if (d?.success && d.config) setConfig(d.config); })
      .catch(() => { /* offline / no active workstation — show nothing */ });
  }, []);

  const validateCLI = async () => {
    setIsValidating(true);
    setCliStatus(null);
    try {
        const res = await fetch('/api/ai/cli-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: selectedPlatform?.id })
        });
        const data = await res.json();
        if (data.success) {
            setCliStatus(data);
        }
    } catch (err) {
        console.error('CLI Validation failed:', err);
    } finally {
        setIsValidating(false);
    }
  };

  const handleCLI = async () => {
    setSaving(true);
    try {
        const updates: any = {
            [`${selectedPlatform?.id}_cli_active`]: 'true',
            [`${selectedPlatform?.id}_api_key`]: 'cli_managed_proxy' 
        };
        if (selectedPlatform?.id === 'ollama') {
            updates.ollama_host = '';
        }
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        window.location.reload();
    } catch (err) {
        console.error(err);
    } finally {
        setSaving(false);
    }
  };

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

  const detectTeams = async () => {
    const hasStoredKey = !!config[`${selectedPlatform?.id}_api_key`];
    if (!credentials && !hasStoredKey) { setTeamError('Enter your API key first.'); return; }
    setDetectingTeams(true);
    setTeamError(null);
    try {
      const res = await fetch('/api/linear/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: credentials }),
      });
      const data = await res.json();
      if (data.success) {
        setTeams(data.teams);
        if (data.teams.length === 0) setTeamError('No teams found for this key.');
        // Auto-select when there's only one team.
        if (data.teams.length === 1) setSelectedTeamId(data.teams[0].id);
      } else {
        setTeams([]);
        setTeamError(data.error || 'Could not detect teams.');
      }
    } catch {
      setTeams([]);
      setTeamError('Failed to reach Linear.');
    } finally {
      setDetectingTeams(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch('/api/linear/sync', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        if (data.skipped === 'no-team') setSyncMsg('No team selected — edit the connection.');
        else setSyncMsg(`Pulled ${data.synced ?? 0}${data.pushed ? `, pushed ${data.pushed}` : ''}.`);
      } else {
        setSyncMsg(data.error || 'Sync failed.');
      }
    } catch {
      setSyncMsg('Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const saveWebhookSecret = async () => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linear_webhook_secret: webhookSecret }),
      });
      setWebhookSaved(true);
      setWebhookSecret('');
      setTimeout(() => setWebhookSaved(false), 2000);
    } catch { /* ignore */ }
  };

  const disconnect = async () => {
    if (!confirm('Disconnect Linear for this workspace? Saved key and team are cleared. Local tickets are kept.')) return;
    try {
      await fetch('/api/linear/connection', { method: 'DELETE' });
    } catch { /* ignore */ }
    window.location.reload();
  };

  // Re-open the wizard at the credential/team step to change the key or team.
  const editConnection = (platform: PlatformOption) => {
    setSelectedPlatform(platform);
    setSelectedTeamId(config[`${platform.id}_team_id`] || '');
    setTeams([]);
    setCredentials('');
    setAuthMethod('apikey');
    setStep('auth');
  };

  const handleInitialize = async () => {
    setSaving(true);
    try {
      const updates: any = {};
      
      if (type === 'ai' && selectedPlatform) {
         if (selectedPlatform.id === 'ollama') {
            updates.ollama_host = credentials || 'http://localhost:11434';
         } else {
            updates[`${selectedPlatform.id}_api_key`] = credentials;
            updates[`${selectedPlatform.id}_oauth_active`] = 'false';
            updates[`${selectedPlatform.id}_cli_active`] = 'false';
         }
      }

      if (type === 'tracker' && selectedPlatform) {
         // e.g. linear_api_key / linear_team_id — read per-workstation by the sync daemon.
         // On edit with a blank field, keep the stored key instead of wiping it.
         if (credentials) updates[`${selectedPlatform.id}_api_key`] = credentials;
         if (selectedTeamId) {
           updates[`${selectedPlatform.id}_team_id`] = selectedTeamId;
           const tm = teams.find(t => t.id === selectedTeamId);
           if (tm) updates[`${selectedPlatform.id}_team_name`] = tm.key ? `${tm.name} (${tm.key})` : tm.name;
         }
      }

      if (type === 'cloud') {
         updates.cloud_active = 'true';
      }

      if (Object.keys(updates).length > 0) {
        await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates)
        });
      }
      
      setStep('intro');
      setCredentials('');
      onConnect(selectedPlatform?.id || 'unknown', {});
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

  // A platform counts as connected once a real credential is stored (ignoring auth-flow sentinels).
  const isPlatformConnected = (id: string) => {
    const v = config[`${id}_api_key`];
    return !!v && v !== 'oauth_managed_token' && v !== 'cli_managed_proxy';
  };
  const connectedOptions = (currentOptions || []).filter(o => isPlatformConnected(o.id));

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
           {connectedOptions.length > 0 && (
             <div className="space-y-2">
                {connectedOptions.map(opt => {
                  const teamName = config[`${opt.id}_team_name`];
                  return (
                    <div key={opt.id} className="rounded-xl bg-emerald-600/10 border border-emerald-500/20 p-3 space-y-2">
                       <div className="flex items-center gap-2 min-w-0">
                          <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-500 shrink-0" />
                          <div className="min-w-0">
                             <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 truncate">{opt.name} Connected</p>
                             {type === 'tracker' && (
                               <p className="text-[9px] text-muted-foreground truncate">
                                 {teamName ? `Team: ${teamName}` : 'No team selected — Edit to choose'}
                               </p>
                             )}
                          </div>
                       </div>
                       {type === 'tracker' && (
                         <>
                           <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={syncNow}
                                disabled={syncing}
                                className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                {syncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                {syncing ? 'Syncing' : 'Sync Tickets'}
                              </button>
                              <button
                                type="button"
                                onClick={() => editConnection(opt)}
                                title="Edit connection"
                                className="px-2.5 py-1.5 rounded-lg bg-muted hover:bg-foreground/10 text-muted-foreground hover:text-foreground text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1"
                              >
                                <Pencil size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={disconnect}
                                title="Disconnect"
                                className="px-2.5 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1"
                              >
                                <Trash2 size={10} />
                              </button>
                           </div>
                           {syncMsg && <p className="text-[9px] text-muted-foreground px-0.5">{syncMsg}</p>}

                           {/* Real-time updates via Linear webhook (needs a publicly reachable URL). */}
                           <div className="pt-2 mt-1 space-y-1 border-t border-emerald-500/10">
                              <p className="text-[9px] text-muted-foreground">
                                 Webhook (real-time): <code className="text-foreground/70">POST /api/linear/webhook</code>
                              </p>
                              <div className="flex items-center gap-1.5">
                                 <input
                                    type="password"
                                    value={webhookSecret}
                                    onChange={(e) => setWebhookSecret(e.target.value)}
                                    placeholder={config.linear_webhook_secret ? 'Signing secret set — replace' : 'Linear signing secret'}
                                    className="flex-1 bg-muted/30 border border-border rounded-lg px-2 py-1 text-[10px] text-foreground outline-none focus:border-blue-500/50 placeholder:text-muted-foreground/40"
                                 />
                                 <button
                                    type="button"
                                    onClick={saveWebhookSecret}
                                    disabled={!webhookSecret}
                                    className="px-2 py-1 rounded-lg bg-muted hover:bg-foreground/10 text-muted-foreground hover:text-foreground text-[9px] font-bold uppercase tracking-widest disabled:opacity-40 transition-colors"
                                 >
                                    {webhookSaved ? 'Saved' : 'Save'}
                                 </button>
                              </div>
                           </div>
                         </>
                       )}
                    </div>
                  );
                })}
             </div>
           )}
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
          {(selectedPlatform?.id === 'google' || selectedPlatform?.id === 'anthropic' || selectedPlatform?.id === 'ollama') && (
            <div className="flex bg-muted rounded-xl p-1 mb-4">
              <button 
                onClick={() => setAuthMethod('apikey')}
                className={cn(
                  "flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  authMethod === 'apikey' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {selectedPlatform?.id === 'ollama' ? 'Host Address' : 'API Key'}
              </button>
              {selectedPlatform?.id !== 'ollama' && (
                <button 
                  onClick={() => setAuthMethod('oauth')}
                  className={cn(
                    "flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all",
                    authMethod === 'oauth' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  OAuth
                </button>
              )}
              <button 
                onClick={() => setAuthMethod('cli')}
                className={cn(
                  "flex-1 py-1.5 text-[8px] font-bold uppercase tracking-widest rounded-lg transition-all",
                  authMethod === 'cli' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Local CLI
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
                  placeholder={selectedPlatform?.id === 'ollama' ? 'http://localhost:11434' : (config[`${selectedPlatform?.id}_api_key`] ? 'Stored — leave blank to keep' : '****************')}
                  value={credentials}
                  onChange={(e) => setCredentials(e.target.value)}
                  className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-[11px] text-foreground outline-none focus:border-blue-500/50 transition-all placeholder:text-muted-foreground/40"
                />
              </div>

              {selectedPlatform?.id === 'linear' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest font-sans">Team</label>
                    <button
                      type="button"
                      onClick={detectTeams}
                      disabled={detectingTeams || (!credentials && !config[`${selectedPlatform?.id}_api_key`])}
                      className="text-[9px] font-bold uppercase tracking-widest text-blue-500 hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      {detectingTeams ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                      {detectingTeams ? 'Detecting...' : 'Detect Teams'}
                    </button>
                  </div>
                  {teams.length > 0 ? (
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-[11px] text-foreground outline-none focus:border-blue-500/50 transition-all"
                    >
                      <option value="">Select a team…</option>
                      {teams.map(tm => (
                        <option key={tm.id} value={tm.id}>{tm.name}{tm.key ? ` (${tm.key})` : ''}</option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-[9px] text-muted-foreground italic px-1">
                      Detect teams to choose which team's tickets sync to this workspace.
                    </p>
                  )}
                  {teamError && <p className="text-[9px] text-red-500 px-1">{teamError}</p>}
                </div>
              )}

              <button
                onClick={handleInitialize}
                disabled={saving}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={12} />
                {saving ? '...' : `${t('initialize')} ${type === 'ai' ? 'Engine' : type === 'cloud' ? 'Provider' : 'Connection'}`}
              </button>
            </>
          ) : authMethod === 'oauth' ? (
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
          ) : (
            <div className="space-y-6 text-center py-4 animate-in fade-in zoom-in-95 duration-200">
               <div className="p-4 bg-indigo-600/5 border border-indigo-500/10 rounded-2xl space-y-3">
                  <div className="flex justify-center">
                     <Terminal size={32} className="text-indigo-500" />
                  </div>
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed">
                    Local Orchestration. Uses your system's installed CLI tool for direct inference and lower latency.
                  </p>
               </div>
               
               {isValidating ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                     <Loader2 size={24} className="animate-spin text-indigo-500" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Validating CLI Environment...</span>
                  </div>
               ) : cliStatus && (
                  <div className={cn(
                    "p-4 rounded-xl border text-left space-y-2",
                    cliStatus.installed ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"
                  )}>
                     <div className="flex items-center gap-2 text-left">
                        {cliStatus.installed ? <CheckCircle2 size={14} className="text-green-500" /> : <ShieldAlert size={14} className="text-red-500" />}
                        <div className="flex flex-col">
                           <span className="text-[11px] font-bold text-foreground">
                              {cliStatus.installed ? `${cliStatus.toolName} ${cliStatus.version}` : 'CLI Tool Not Found'}
                           </span>
                           {cliStatus.installed && (
                             <div className={cn(
                               "text-[10px] font-bold uppercase tracking-tighter",
                               cliStatus.authStatus?.includes('Authenticated') || cliStatus.authStatus?.includes('Operational') ? "text-green-500" : "text-amber-500"
                             )}>
                               {cliStatus.authStatus}
                             </div>
                           )}
                        </div>
                     </div>
                     {!cliStatus.installed && (
                        <p className="text-[9px] text-red-500 italic pl-6 text-left">Please ensure '{selectedPlatform?.id === 'google' ? 'gemini' : selectedPlatform?.id}' is installed and in your PATH.</p>
                     )}
                  </div>
               )}

               <button 
                 onClick={handleCLI}
                 disabled={!!(saving || (cliStatus && !cliStatus.installed))}
                 className="w-full py-4 bg-indigo-600 text-white hover:bg-indigo-500 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
               >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  ) : (
                    <>
                      <Zap size={16} />
                      {cliStatus?.installed ? 'Activate CLI Node' : 'Refresh Environment'}
                    </>
                  )}
               </button>

               <p className="text-[8px] text-muted-foreground uppercase font-bold tracking-tighter opacity-50">
                  {selectedPlatform?.id === 'google' ? 'Requires gemini CLI' : `Requires '${selectedPlatform?.id}' binary`}
               </p>
            </div>
          )}
       </div>
    </div>
  );
}
