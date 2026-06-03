'use client';

import React, { useState } from 'react';
import { 
  Activity, 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  Zap, 
  ShieldCheck, 
  Terminal,
  Database,
  ArrowRight,
  Server,
  CloudLightning,
  X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TriggersPage() {
  const { t } = useLifecycle();
  
  const [activeTriggers, setActiveTriggers] = useState({
    commit: true,
    merge: false,
    statusChange: true
  });

  const triggerHistory = [
    { id: 1, event: 'Commit (master)', ticket: 'STR-1003', agent: 'API Engineer', time: '10 mins ago', status: 'Success' },
    { id: 2, event: 'Merge (feature/auth)', ticket: 'TKT-1004', agent: 'Security Engineer', time: '1 hr ago', status: 'Failed' },
    { id: 3, event: 'Status Change (ToDo)', ticket: 'EPC-1002', agent: 'Orchestrator', time: '2 hrs ago', status: 'Success' },
  ];

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar font-sans text-left transition-colors duration-300">
      <header>
        <h1 className="text-3xl font-bold italic tracking-tight text-indigo-500 underline decoration-indigo-500/20 underline-offset-8 decoration-4">
           {t('triggers')}
        </h1>
        <p className="text-muted-foreground mt-2 italic">Configure system-level orchestration events and repository hooks.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Repository Event Logic */}
        <section className="space-y-6">
           <div className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                 <GitBranch size={20} className="text-indigo-500" />
                 <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Repository Event Hooks</h2>
              </div>

              <div className="space-y-4">
                 <TriggerToggle 
                    icon={<GitCommit size={18} />}
                    label="On Commit Trigger"
                    desc="Spawn validation workers for every push to protected branches."
                    isActive={activeTriggers.commit}
                    onToggle={() => setActiveTriggers(prev => ({ ...prev, commit: !prev.commit }))}
                 />
                 <TriggerToggle 
                    icon={<GitMerge size={18} />}
                    label="On Merge Trigger"
                    desc="Execute automated cleanup and promotion tasks after merge."
                    isActive={activeTriggers.merge}
                    onToggle={() => setActiveTriggers(prev => ({ ...prev, merge: !prev.merge }))}
                 />
                 <TriggerToggle 
                    icon={<Activity size={18} />}
                    label="Status Change Sync"
                    desc="Sync repository state when tickets transition in registry."
                    isActive={activeTriggers.statusChange}
                    onToggle={() => setActiveTriggers(prev => ({ ...prev, statusChange: !prev.statusChange }))}
                 />
              </div>
           </div>

           <div className="bg-muted/20 border border-border border-dashed rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 opacity-60">
              <Server size={32} className="text-muted-foreground" />
              <div className="text-center space-y-1">
                 <div className="text-[10px] font-bold uppercase tracking-widest text-foreground">Webhook Endpoint Active</div>
                 <code className="text-[9px] bg-card px-2 py-1 rounded border border-border text-indigo-500">https://hq.internal/api/webhooks/vcs</code>
              </div>
           </div>
        </section>

        {/* Live Trigger Stream */}
        <section className="space-y-6">
           <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col h-full">
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <CloudLightning size={18} className="text-amber-500" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Orchestration History</h2>
                 </div>
                 <button className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors">Clear Logs</button>
              </div>
              <div className="divide-y divide-border/30 overflow-y-auto max-h-[400px] custom-scrollbar">
                 {triggerHistory.map(log => (
                   <div key={log.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors group">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "p-2 rounded-lg border",
                           log.status === 'Success' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                         )}>
                            {log.status === 'Success' ? <ShieldCheck size={16} /> : <X size={16} />}
                         </div>
                         <div className="space-y-0.5">
                            <div className="text-xs font-bold text-foreground opacity-90">{log.event}</div>
                            <div className="text-[10px] text-muted-foreground italic">{log.ticket} • {log.agent}</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-[9px] font-mono text-muted-foreground uppercase">{log.time}</div>
                         <div className={cn(
                           "text-[8px] font-bold uppercase tracking-tighter px-1.5 rounded-full mt-1 border inline-block",
                           log.status === 'Success' ? "border-green-500/30 text-green-600" : "border-red-500/30 text-red-600"
                         )}>{log.status}</div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           <div className="p-6 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-900/20 flex items-center justify-between group cursor-pointer hover:bg-indigo-500 transition-all">
              <div className="flex items-center gap-4 text-white">
                 <div className="p-2 bg-white/20 rounded-xl">
                    <Terminal size={20} />
                 </div>
                 <div>
                    <div className="text-xs font-bold uppercase tracking-widest leading-none">Manual Override</div>
                    <p className="text-[10px] opacity-80 italic mt-1 leading-none">Force immediate repository sync</p>
                 </div>
              </div>
              <ArrowRight size={20} className="text-white/50 group-hover:translate-x-1 transition-transform" />
           </div>
        </section>

      </div>
    </div>
  );
}

function TriggerToggle({ icon, label, desc, isActive, onToggle }: { icon: any, label: string, desc: string, isActive: boolean, onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border border-border hover:bg-muted/40 transition-colors">
       <div className="flex items-center gap-4 max-w-[80%]">
          <div className={cn(
            "p-2 rounded-xl border transition-colors",
            isActive ? "bg-indigo-500 text-white border-indigo-400" : "bg-muted text-muted-foreground border-border"
          )}>
             {icon}
          </div>
          <div className="space-y-0.5 text-left">
             <div className="text-[11px] font-bold text-foreground uppercase tracking-tight">{label}</div>
             <p className="text-[9px] text-muted-foreground italic leading-tight">{desc}</p>
          </div>
       </div>
       <button 
         onClick={onToggle}
         className={cn(
           "w-10 h-5 rounded-full relative transition-colors duration-300",
           isActive ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"
         )}
       >
          <div className={cn(
            "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300",
            isActive ? "translate-x-5" : "translate-x-0"
          )} />
       </button>
    </div>
  );
}
