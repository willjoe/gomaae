'use client';

import React, { useState, useMemo } from 'react';
import { 
  Bot, 
  Cpu, 
  Unplug, 
  Play, 
  Settings, 
  Database, 
  GitBranch, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plus,
  RefreshCcw,
  ShieldCheck,
  ChevronRight,
  Terminal,
  Zap
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLifecycle } from '@/context/LifecycleContext';
import TicketHandler from '@/components/TicketHandler';
import { Ticket } from '@/components/gantt/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AgentConfigPage() {
  const { tickets, loading, t, setPhaseSelectedTicket } = useLifecycle();
  
  // Simulation of automation settings
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState(true);
  const [branchingStrategy, setBranchingStrategy] = useState('ticket-id-slug');

  const handleToggleAutoTrigger = async () => {
    const nextValue = !autoTriggerEnabled;
    setAutoTriggerEnabled(nextValue);
    try {
        await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto_trigger_enabled: nextValue ? 'true' : 'false' })
        });
    } catch (err) {
        console.error('Failed to persist trigger setting:', err);
    }
  };

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar font-sans text-left">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold italic tracking-tight text-indigo-500 underline decoration-indigo-500/20 underline-offset-8 decoration-4">
             {t('agent_config')}
          </h1>
          <p className="text-muted-foreground mt-2 italic">Map autonomous workers to high-integrity ticket nodes and configure sandbox triggers.</p>
        </div>
        <div className="flex items-center gap-3">
           <div className={cn(
             "px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all",
             autoTriggerEnabled ? "bg-green-500/10 border-green-500/30 text-green-600" : "bg-muted border-border text-muted-foreground opacity-50"
           )}>
              <Zap size={14} className={cn(autoTriggerEnabled && "animate-pulse")} />
              <span className="text-[10px] font-bold uppercase tracking-widest">{autoTriggerEnabled ? 'Auto-Trigger Active' : 'Triggers Paused'}</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Agent Assignment View */}
        <div className="lg:col-span-2 space-y-8">
           <TicketHandler phaseId="automation" tier="Story">
              {({ filteredTickets, searchQuery, setSearchQuery }) => (
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl transition-colors duration-300">
                  <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
                     <div className="flex items-center gap-3">
                        <Cpu size={18} className="text-indigo-500" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Worker Assignment Registry</h2>
                     </div>
                     <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Filter registry..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="bg-card border border-border rounded-xl px-4 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 font-medium italic"
                        />
                     </div>
                  </div>
                  <div className="divide-y divide-border/50">
                     {filteredTickets.map(task => (
                       <AgentAssignmentRow 
                         key={task.id} 
                         task={task} 
                         onSelect={() => setPhaseSelectedTicket('automation', task.id)}
                       />
                     ))}
                     {filteredTickets.length === 0 && (
                        <div className="p-20 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-50">
                           No tickets available for agentic attachment in this tier.
                        </div>
                     )}
                  </div>
                </div>
              )}
           </TicketHandler>
        </div>

        {/* Sandbox & Orchestration Controls */}
        <div className="space-y-8">
           <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-xl border-t-4 border-t-indigo-500">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                 <Terminal size={20} className="text-indigo-500" />
                 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Sandbox Orchestration</h2>
              </div>
              
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border">
                    <div className="space-y-1">
                       <div className="text-[10px] font-bold text-foreground uppercase tracking-tight">ToDo Status Trigger</div>
                       <p className="text-[9px] text-muted-foreground italic leading-tight">Instantly spawn workers when tickets enter ToDo.</p>
                    </div>
                    <button 
                      onClick={handleToggleAutoTrigger}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors duration-300",
                        autoTriggerEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"
                      )}
                    >
                       <div className={cn(
                         "absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300",
                         autoTriggerEnabled ? "translate-x-5" : "translate-x-0"
                       )} />
                    </button>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Branching Strategy</label>
                    <select 
                      value={branchingStrategy}
                      onChange={(e) => setBranchingStrategy(e.target.value)}
                      className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold italic appearance-none"
                    >
                       <option value="ticket-id-slug">ticket/[id]-[slug]</option>
                       <option value="agent-id">agent/[agent-id]/[id]</option>
                       <option value="flat">flat-queue-branch</option>
                    </select>
                 </div>

                 <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-indigo-500">
                       <Database size={14} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">Isolated Mount</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                       Repo cloning disabled. project-level repository will be strictly volume-mounted to the sandbox for real-time atomic edits.
                    </p>
                    <div className="text-[8px] font-mono text-indigo-600/60 dark:text-indigo-400/40 truncate">
                       mount --bind /app/repos /sandbox/workspace
                    </div>
                 </div>
              </div>
           </section>

           <section className="bg-card border border-border rounded-3xl p-6 space-y-4 shadow-lg opacity-60">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                 <ShieldCheck size={16} className="text-green-500" />
                 <h2 className="text-[10px] font-bold uppercase tracking-widest">Integrity Guard</h2>
              </div>
              <p className="text-[9px] text-muted-foreground italic leading-relaxed">
                 Branch isolation enforced. Multiple agents working on the same project are restricted to their unique ticket-specific branches to prevent state collisions.
              </p>
           </section>
        </div>

      </div>
    </div>
  );
}

function AgentAssignmentRow({ task, onSelect }: { task: Ticket, onSelect: () => void }) {
  const [assignedRole, setAssignedRole] = useState(task.llm_role || 'Generalist');
  
  const roles = [
    'Technical Architect',
    'API Engineer',
    'Frontend Web Eng',
    'Functional QA Eng',
    'Security Engineer',
    'Generalist'
  ];

  return (
    <div className="p-5 flex items-center justify-between group hover:bg-muted/20 transition-colors">
       <div className="flex items-center gap-5 max-w-[60%]">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner transition-transform group-hover:scale-105",
            task.status === 'Done' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-muted text-muted-foreground border-border"
          )}>
             <Bot size={24} />
          </div>
          <div className="space-y-1">
             <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold bg-muted px-1.5 py-0.5 rounded border border-border font-mono">{task.identifier}</span>
                <span className={cn(
                  "text-[8px] font-bold uppercase tracking-tighter px-1 rounded-sm",
                  task.status === 'Todo' ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground"
                )}>{task.status}</span>
             </div>
             <div onClick={onSelect} className="text-sm font-bold text-foreground hover:text-indigo-500 transition-colors cursor-pointer tracking-tight truncate">{task.title}</div>
          </div>
       </div>

       <div className="flex items-center gap-4">
          <div className="space-y-1 text-right">
             <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">Active Role Vector</div>
             <select 
               value={assignedRole}
               onChange={(e) => setAssignedRole(e.target.value)}
               className="bg-card border border-border rounded-lg px-3 py-1.5 text-[11px] font-bold text-indigo-500 outline-none hover:border-indigo-500/30 transition-all cursor-pointer italic"
             >
                {roles.map(r => <option key={r} value={r}>{r}</option>)}
             </select>
          </div>
          <ChevronRight size={16} className="text-muted-foreground/30 group-hover:text-indigo-500 transition-all" />
       </div>
    </div>
  );
}
