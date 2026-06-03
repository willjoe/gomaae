'use client';

import React, { useState, useMemo, useEffect } from 'react';
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
  Zap,
  Users,
  X,
  UserPlus,
  Trash2,
  Square,
  Pause
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
  
  // Automation settings
  const [autoTriggerEnabled, setAutoTriggerEnabled] = useState(false);
  const [branchingStrategy, setBranchingStrategy] = useState('ticket-id-slug');

  // Governance settings
  const [maxParallelAgents, setMaxParallelAgents] = useState(5);
  const [dailyTokenBudget, setDailyTokenBudget] = useState(1000000);

  // Role Management State
  const [roles, setRoles] = useState<any[]>([]);
  const [isAddingRole, setIsAddingRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');

  // UI State: Collapsible Sections
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  const toggleSection = (status: string) => {
    setCollapsedSections(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles');
      const data = await res.json();
      if (data.success) setRoles(data.roles);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

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

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    try {
        const res = await fetch('/api/roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newRoleName, description: newRoleDesc })
        });
        const data = await res.json();
        if (data.success) {
            setRoles([data.role, ...roles]);
            setNewRoleName('');
            setNewRoleDesc('');
            setIsAddingRole(false);
        }
    } catch (err) {
        console.error('Failed to add role:', err);
    }
  };

  const handlePauseAll = async (status: string, tickets: any[]) => {
    try {
        const promises = tickets.map(t => 
            fetch('/api/tickets', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticketId: t.id, status: 'In Review' })
            })
        );
        await Promise.all(promises);
        window.location.reload();
    } catch (err) {
        console.error('Failed to pause all:', err);
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
           <TicketHandler phaseId="automation" tier="">
              {({ filteredTickets, searchQuery, setSearchQuery }) => {
                // Filter and Sort according to requirements
                const displayTickets = filteredTickets
                  .filter(task => {
                    // Include Stories and QA tickets
                    if (task.tier !== 'Story' && task.tier !== 'Task' && task.tier !== 'QA') return false;
                    
                    if (task.status === 'Done' && task.updated_at) {
                        const updatedDate = new Date(task.updated_at);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        return updatedDate > sevenDaysAgo;
                    }
                    return true;
                  })
                  .sort((a, b) => {
                    const getOrder = (status: string) => {
                      const s = status.toLowerCase();
                      if (s === 'todo') return 1;
                      if (s === 'in progress') return 2;
                      if (s === 'in review') return 3;
                      if (s === 'done') return 4;
                      return 5;
                    };
                    return getOrder(a.status) - getOrder(b.status);
                  });

                return (
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
                     {['Todo', 'In Progress', 'In Review', 'Done'].map(status => {
                       const sectionTickets = displayTickets.filter(t => t.status === status);
                       if (sectionTickets.length === 0 && status === 'Done') return null; // Hide empty done section
                       
                       const isCollapsed = collapsedSections.includes(status);
                       
                       return (
                         <div key={status} className="flex flex-col">
                            <div className="px-6 py-3 bg-muted/20 hover:bg-muted/40 flex items-center justify-between transition-colors group">
                               <div className="flex items-center gap-3 cursor-pointer" onClick={() => toggleSection(status)}>
                                  <div className={cn(
                                    "w-2 h-2 rounded-full",
                                    status === 'Todo' ? "bg-amber-500" :
                                    status === 'In Progress' ? "bg-blue-500" :
                                    status === 'In Review' ? "bg-pink-500" : "bg-green-500"
                                  )} />
                                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground opacity-80">{status}</span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-card border border-border text-[9px] font-mono text-muted-foreground">{sectionTickets.length}</span>
                               </div>
                               
                               <div className="flex items-center gap-4">
                                  {status === 'Todo' && (
                                     <div className="flex items-center gap-2 pr-4 border-r border-border/50">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Start ToDo tickets automatically</span>
                                        <button 
                                          onClick={handleToggleAutoTrigger}
                                          className={cn(
                                            "w-8 h-4 rounded-full relative transition-colors duration-300",
                                            autoTriggerEnabled ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-800"
                                          )}
                                        >
                                          <div className={cn(
                                            "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-300",
                                            autoTriggerEnabled ? "translate-x-4" : "translate-x-0"
                                          )} />
                                        </button>
                                     </div>
                                  )}

                                  {(status === 'In Progress' || status === 'In Review') && sectionTickets.length > 0 && (
                                     <button 
                                       onClick={(e) => {
                                          e.stopPropagation();
                                          handlePauseAll(status, sectionTickets);
                                       }}
                                       className="px-2 py-1 rounded bg-muted border border-border hover:bg-foreground/5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground transition-all flex items-center gap-2 mr-2"
                                     >
                                        <Pause size={10} />
                                        Pause All
                                     </button>
                                  )}

                                  <ChevronRight 
                                    size={14} 
                                    className={cn("text-muted-foreground transition-transform duration-200 cursor-pointer", !isCollapsed && "rotate-90")} 
                                    onClick={() => toggleSection(status)}
                                  />
                               </div>
                            </div>
                            
                            {!isCollapsed && (
                              <div className="divide-y divide-border/30 animate-in slide-in-from-top-1 duration-200">
                                 {sectionTickets.map((task, idx) => (
                                   <AgentAssignmentRow 
                                     key={task.id} 
                                     task={task} 
                                     onSelect={() => setPhaseSelectedTicket('automation', task.id)}
                                     availableRoles={roles}
                                     forceQueue={status === 'Todo' && idx % 2 === 0}
                                   />
                                 ))}
                                 {sectionTickets.length === 0 && (
                                    <div className="p-10 text-center text-muted-foreground italic text-[10px] uppercase tracking-widest opacity-40">
                                       No active signals in {status}
                                    </div>
                                 )}
                              </div>
                            )}
                         </div>
                       );
                     })}
                     {displayTickets.length === 0 && (
                        <div className="p-20 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-50">
                           No tickets available for agentic attachment.
                        </div>
                     )}
                  </div>
                  </div>
                );
              }}
           </TicketHandler>
        </div>

        {/* Sidebar: Roles & Sandbox */}
        <div className="space-y-8">
           {/* Agent Role Management */}
           <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-xl border-t-4 border-t-blue-500">
              <div className="flex items-center justify-between border-b border-border pb-4">
                 <div className="flex items-center gap-3">
                    <Users size={20} className="text-blue-500" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Agent Role List</h2>
                 </div>
                 <button 
                    onClick={() => setIsAddingRole(!isAddingRole)}
                    className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                 >
                    {isAddingRole ? <X size={14} /> : <Plus size={14} />}
                 </button>
              </div>

              {isAddingRole && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Role Name</label>
                      <input 
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500/30 outline-none font-bold"
                        placeholder="e.g. Infrastructure Engineer"
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest px-1">Description</label>
                      <textarea 
                        value={newRoleDesc}
                        onChange={(e) => setNewRoleDesc(e.target.value)}
                        className="w-full bg-muted/50 border border-border rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-blue-500/30 outline-none italic h-20 resize-none"
                        placeholder="Define agent's technical scope..."
                      />
                   </div>
                   <button 
                     onClick={handleAddRole}
                     disabled={!newRoleName.trim()}
                     className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                   >
                      <UserPlus size={14} />
                      Add New Agent Role
                   </button>
                </div>
              )}

              <div className="space-y-3">
                 {roles.map(role => (
                    <div key={role.id} className="p-3 bg-muted/30 rounded-xl border border-border flex items-center justify-between group">
                       <div className="overflow-hidden">
                          <div className="text-[11px] font-bold text-foreground truncate">{role.name}</div>
                          <p className="text-[9px] text-muted-foreground italic truncate">{role.description}</p>
                       </div>
                       <button className="p-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                          <Trash2 size={12} />
                       </button>
                    </div>
                 ))}
              </div>
           </section>

           <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-xl border-t-4 border-t-indigo-500">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                 <Terminal size={20} className="text-indigo-500" />
                 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Sandbox Orchestration</h2>
              </div>
              
              <div className="space-y-4">
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
                       Repo cloning disabled. project-level repository will be volume-mounted to the sandbox for real-time atomic edits.
                    </p>
                    <div className="text-[8px] font-mono text-indigo-600/60 dark:text-indigo-400/40 truncate">
                       mount --bind /app/repos /sandbox/workspace
                    </div>
                 </div>
              </div>
           </section>

           {/* Resource Governance Card */}
           <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-xl border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                 <ShieldCheck size={20} className="text-emerald-500" />
                 <h2 className="text-xs font-bold uppercase tracking-widest text-foreground">Resource Governance</h2>
              </div>
              
              <div className="space-y-6">
                 <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Max Parallel Agents</label>
                       <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{maxParallelAgents}</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={maxParallelAgents}
                      onChange={(e) => setMaxParallelAgents(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[8px] text-muted-foreground font-medium px-1 italic">
                       <span>Efficiency</span>
                       <span>Intensity</span>
                    </div>
                 </div>

                 <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Daily Token Budget</label>
                       <span className="text-[10px] font-mono font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{(dailyTokenBudget / 1000000).toFixed(1)}M</span>
                    </div>
                    <input 
                      type="range" 
                      min="100000" 
                      max="5000000" 
                      step="100000"
                      value={dailyTokenBudget}
                      onChange={(e) => setDailyTokenBudget(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                    <div className="flex justify-between text-[8px] text-muted-foreground font-medium px-1 italic">
                       <span>100k</span>
                       <span>5M Tokens</span>
                    </div>
                 </div>

                 <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-start gap-3">
                    <AlertCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-muted-foreground leading-relaxed italic">
                       Exceeding governance limits will pause automated triggers until the next 24h cycle or manual override.
                    </p>
                 </div>
              </div>
           </section>
        </div>

      </div>
    </div>
  );
}

function AgentAssignmentRow({ task, onSelect, availableRoles, forceQueue }: { task: Ticket, onSelect: () => void, availableRoles: any[], forceQueue?: boolean }) {
  const { setPhaseSelectedTicket } = useLifecycle();
  const [assignedRole, setAssignedRole] = useState(task.llm_role || (availableRoles[0]?.name || 'Technical Architect'));
  const [authorizedModel, setAuthorizedModel] = useState(task.authorized_model || 'claude-3-5-sonnet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [isWaiting, setIsWaiting] = useState(forceQueue || false);
  
  const handleAction = async () => {
    setIsProcessing(true);
    const statusLower = currentStatus.toLowerCase();
    
    try {
      if (statusLower === 'todo') {
        if (!isWaiting) {
          // Start -> Move to In Queue (visual only for now, or assign API)
          const res = await fetch('/api/tickets/assign', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              ticketId: task.id, 
              agentRole: assignedRole, 
              llmProvider: authorizedModel 
            })
          });
          const data = await res.json();
          if (data.success) {
            setIsWaiting(true);
          }
        } else {
          // Stop -> Revert to normal Todo
          const res = await fetch('/api/tickets', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: task.id, status: 'Todo' })
          });
          if (res.ok) {
            setIsWaiting(false);
          }
        }
      } else if (statusLower === 'in progress') {
        const res = await fetch('/api/tickets', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId: task.id, status: 'In Review' }) 
        });
        if (res.ok) {
          setCurrentStatus('In Review');
        }
      }
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const statusLower = currentStatus.toLowerCase();
  const isDone = statusLower === 'done';
  const isTodo = statusLower === 'todo';
  const isInQueue = isTodo && isWaiting;
  const isInProgress = statusLower === 'in progress';
  const isQA = task.tier === 'QA';
  const isAnimated = isInProgress || statusLower === 'in review' || isInQueue;

  const models = [
    { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
    { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
    { id: 'ollama-local', label: 'Local Ollama' }
  ];

  const renderButton = () => {
    if (isDone) return null;

    let Icon = Play;
    let title = 'Start Agent';
    let btnClass = "bg-blue-600 text-white hover:bg-blue-500";

    if (isInQueue) {
      Icon = Square;
      title = 'Stop Agent (Revert)';
      btnClass = "bg-amber-500 text-white hover:bg-amber-400";
    } else if (isInProgress) {
      Icon = Pause;
      title = 'Pause Agent';
      btnClass = "bg-indigo-600 text-white hover:bg-indigo-500";
    } else if (statusLower === 'in review') {
      Icon = RefreshCcw;
      title = 'Re-run Agent';
      btnClass = "bg-pink-600 text-white hover:bg-pink-500";
    }

    return (
      <button 
        onClick={handleAction}
        disabled={isProcessing}
        title={title}
        className={cn(
          "p-1.5 rounded-lg transition-all shadow-md active:scale-95 disabled:opacity-50",
          btnClass
        )}
      >
        {isProcessing ? <RefreshCcw size={14} className="animate-spin" /> : <Icon size={14} />}
      </button>
    );
  };

  return (
    <div className="py-3 px-6 flex items-center justify-between group hover:bg-muted/20 transition-colors">
       <div className="flex items-center gap-4 max-w-[50%]">
          
          <div className="relative w-8 h-8 flex items-center justify-center rounded-lg overflow-hidden shadow-inner group-hover:scale-105 transition-transform bg-card shrink-0">
              {isAnimated && (
                  <div 
                     className="absolute inset-[-100%] animate-spin"
                     style={{ 
                         background: isInProgress 
                            ? 'conic-gradient(from 0deg, transparent 0%, #3b82f6 25%, #60a5fa 50%, #93c5fd 75%, transparent 100%)'
                            : isInQueue
                            ? 'conic-gradient(from 0deg, transparent 0%, #f59e0b 25%, #fbbf24 50%, #fcd34d 75%, transparent 100%)'
                            : 'conic-gradient(from 0deg, transparent 0%, #ec4899 25%, #f472b6 50%, #f9a8d4 75%, transparent 100%)'
                     }} 
                  />
              )}
              {!isAnimated && (
                  <div className={cn(
                      "absolute inset-0 border",
                      isDone ? "bg-green-500/10 border-green-500/20" : "bg-muted border-border"
                  )} />
              )}
              <div className={cn(
                  "relative z-10 flex items-center justify-center rounded-[6px]",
                  isInProgress ? "w-[28px] h-[28px] bg-blue-50 dark:bg-slate-900" : 
                  isInQueue ? "w-[28px] h-[28px] bg-amber-50 dark:bg-slate-900" :
                  statusLower === 'in review' ? "w-[28px] h-[28px] bg-pink-50 dark:bg-slate-900" :
                  "w-full h-full bg-transparent"
              )}>
                  <Bot size={16} className={cn(
                      isDone ? "text-green-500" : 
                      isInProgress ? "text-blue-500" : 
                      isInQueue ? "text-amber-500" :
                      statusLower === 'in review' ? "text-pink-500" : "text-muted-foreground"
                  )} />
              </div>
          </div>

          <div className="space-y-0.5 overflow-hidden">
             <div className="flex items-center gap-2">
                <span className={cn(
                    "text-[8px] font-bold px-1 py-0.5 rounded border font-mono",
                    isQA ? "bg-pink-500/10 text-pink-500 border-pink-500/20" : "bg-muted text-muted-foreground border-border"
                )}>
                    {task.identifier}
                </span>
                <span className={cn(
                  "text-[7px] font-bold uppercase tracking-tighter px-1 rounded-sm",
                  statusLower === 'todo' && !isWaiting ? "text-slate-500 bg-slate-500/10" : 
                  isInQueue ? "text-amber-500 bg-amber-500/10" :
                  statusLower === 'in progress' ? "text-blue-500 bg-blue-500/10" : 
                  statusLower === 'in review' ? "text-pink-500 bg-pink-500/10" : "text-muted-foreground"
                )}>{isInQueue ? 'In Queue' : currentStatus}</span>
             </div>
             <div 
                onClick={onSelect} 
                className={cn(
                    "text-xs font-bold tracking-tight truncate cursor-pointer transition-colors",
                    isQA ? "text-pink-600 dark:text-pink-400 hover:text-pink-500" : "text-foreground hover:text-indigo-500"
                )}
             >
                {task.title}
             </div>
          </div>
       </div>

       <div className="flex items-center gap-4">
          {!isDone && (
            <div className="flex flex-col gap-1 items-end">
               <div className="text-[7px] font-bold text-muted-foreground uppercase tracking-widest opacity-60 leading-none">Agent Architecture</div>
               <div className="flex items-center gap-2">
                  <select 
                    value={assignedRole}
                    disabled={!isTodo || isWaiting}
                    onChange={(e) => setAssignedRole(e.target.value)}
                    className={cn(
                        "bg-card border border-border rounded-lg px-2 py-1 text-[10px] font-bold outline-none transition-all h-7 italic",
                        isTodo && !isWaiting ? "text-indigo-500 hover:border-indigo-500/30 cursor-pointer" : "text-muted-foreground opacity-50 cursor-not-allowed"
                    )}
                  >
                      {availableRoles.map(r => <option key={roleKey(r.name)} value={r.name}>{r.name}</option>)}
                  </select>

                  <select 
                    value={authorizedModel}
                    disabled={!isTodo || isWaiting}
                    onChange={(e) => setAuthorizedModel(e.target.value)}
                    className={cn(
                        "bg-card border border-border rounded-lg px-2 py-1 text-[10px] font-bold outline-none transition-all h-7 italic",
                        isTodo && !isWaiting ? "text-amber-500 hover:border-amber-500/30 cursor-pointer" : "text-muted-foreground opacity-50 cursor-not-allowed"
                    )}
                  >
                      {models.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>

                  {renderButton()}
               </div>
            </div>
          )}
          <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-indigo-500 transition-all" />
       </div>
    </div>
  );
}

function roleKey(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-');
}
