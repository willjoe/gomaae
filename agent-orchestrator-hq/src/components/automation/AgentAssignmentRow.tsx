'use client';

import React, { useState, useMemo } from 'react';
import { 
  Bot, 
  Play, 
  RefreshCcw,
  ChevronRight,
  Square,
  Pause
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Ticket } from '@/components/gantt/types';


function roleKey(name: string) {
    return name.toLowerCase().replace(/\s+/g, '-');
}

interface AgentAssignmentRowProps {
  task: Ticket;
  onSelect: () => void;
  availableRoles: any[];
  forceQueue?: boolean;
}

export default function AgentAssignmentRow({ task, onSelect, availableRoles, forceQueue }: AgentAssignmentRowProps) {
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
                  isInProgress ? "w-[28px] h-[28px] bg-blue-100 dark:bg-blue-900/40" : 
                  isInQueue ? "w-[28px] h-[28px] bg-amber-100 dark:bg-amber-900/40" :
                  statusLower === 'in review' ? "w-[28px] h-[28px] bg-red-100 dark:bg-red-900/40" :
                  "w-full h-full bg-transparent"
              )}>
                  <Bot size={16} className={cn(
                      isDone ? "text-green-500" : 
                      isInProgress ? "text-blue-600 dark:text-blue-400" : 
                      isInQueue ? "text-amber-600 dark:text-amber-400" :
                      statusLower === 'in review' ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
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
