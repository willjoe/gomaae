'use client';

import React from 'react';
import { cn } from '@/lib/cn';


interface TriggerToggleProps {
  icon: React.ReactNode;
  label: string;
  desc: string;
  isActive: boolean;
  onToggle: () => void;
}

export default function TriggerToggle({ icon, label, desc, isActive, onToggle }: TriggerToggleProps) {
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
