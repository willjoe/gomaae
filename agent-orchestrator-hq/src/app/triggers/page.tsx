'use client';

import React, { useState } from 'react';
import {
  Activity,
  GitBranch,
  GitCommit,
  GitMerge,
  ArrowRight,
  Server,
  Terminal
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLifecycle } from '@/context/LifecycleContext';
import TriggerToggle from '@/components/automation/TriggerToggle';
import OrchestrationHistory from '@/components/automation/OrchestrationHistory';
import CommitHookChecks from '@/components/automation/CommitHookChecks';
import type { CheckResult } from '@/components/automation/CommitHookChecks';


export default function TriggersPage() {
  const { t } = useLifecycle();
  
  const [activeTriggers, setActiveTriggers] = useState({
    commit: true,
    merge: false,
    statusChange: true
  });

  const [triggerHistory, setTriggerHistory] = useState<any[]>([]);

  const handleCommitChecksComplete = (results: Record<string, CheckResult>) => {
    const now = new Date().toLocaleTimeString();
    const entries = Object.entries(results).map(([id, r], i) => ({
      id: `${Date.now()}-${i}`,
      event: `Commit Check · ${id}`,
      ticket: r.passed ? 'Passed' : 'Failed',
      agent: `${r.durationMs}ms`,
      time: now,
      status: (r.passed ? 'Success' : 'Failed') as 'Success' | 'Failed',
    }));
    setTriggerHistory(prev => [...entries, ...prev]);
  };

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
                 <div>
                    <TriggerToggle
                       icon={<GitCommit size={18} />}
                       label="On Commit Trigger"
                       desc="Run validation checks on every push to protected branches."
                       isActive={activeTriggers.commit}
                       onToggle={() => setActiveTriggers(prev => ({ ...prev, commit: !prev.commit }))}
                    />
                    {activeTriggers.commit && (
                       <CommitHookChecks onRunComplete={handleCommitChecksComplete} />
                    )}
                 </div>
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
           <OrchestrationHistory 
             history={triggerHistory}
             onClear={() => setTriggerHistory([])}
           />

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
