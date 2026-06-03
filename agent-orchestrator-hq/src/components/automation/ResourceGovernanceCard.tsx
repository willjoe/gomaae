'use client';

import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

interface ResourceGovernanceCardProps {
  maxParallelAgents: number;
  setMaxParallelAgents: (val: number) => void;
  dailyTokenBudget: number;
  setDailyTokenBudget: (val: number) => void;
}

export default function ResourceGovernanceCard({ 
  maxParallelAgents, 
  setMaxParallelAgents, 
  dailyTokenBudget, 
  setDailyTokenBudget 
}: ResourceGovernanceCardProps) {
  return (
    <section className="bg-card border border-border rounded-3xl p-6 space-y-6 shadow-xl border-t-4 border-t-emerald-500 text-left transition-colors duration-300">
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
            <p className="text-[9px] text-muted-foreground leading-relaxed italic text-left">
               Exceeding governance limits will pause automated triggers until the next 24h cycle or manual override.
            </p>
         </div>
      </div>
    </section>
  );
}
