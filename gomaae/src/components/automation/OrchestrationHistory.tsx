'use client';

import React from 'react';
import { CloudLightning, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/cn';


interface HistoryLog {
  id: number | string;
  event: string;
  ticket: string;
  agent: string;
  time: string;
  status: 'Success' | 'Failed';
}

interface OrchestrationHistoryProps {
  history: HistoryLog[];
  onClear: () => void;
}

export default function OrchestrationHistory({ history, onClear }: OrchestrationHistoryProps) {
  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col h-full text-left transition-colors duration-300">
      <div className="px-6 py-4 border-b border-border bg-muted/30 flex justify-between items-center">
         <div className="flex items-center gap-3">
            <CloudLightning size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Orchestration History</h2>
         </div>
         <button 
           onClick={onClear}
           className="text-[9px] font-bold uppercase tracking-widest text-indigo-500 hover:text-indigo-400 transition-colors"
         >
           Clear Logs
         </button>
      </div>
      <div className="divide-y divide-border/30 overflow-y-auto max-h-[400px] custom-scrollbar">
         {history.map(log => (
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
         {history.length === 0 && (
            <div className="p-10 text-center text-muted-foreground italic text-[10px] uppercase tracking-widest opacity-40">
               No events recorded.
            </div>
         )}
      </div>
    </div>
  );
}
