'use client';

import React, { cloneElement } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';


interface PillarCardProps {
  id?: string;
  title: string;
  icon: React.ReactNode;
  isComplete: boolean;
  onClick: () => void;
  bg: string;
  border: string;
  solidifiedText: string;
  draftText: string;
  summary?: string;
  placeholderSummary: string;
}

export default function PillarCard({ 
  title, 
  icon, 
  isComplete, 
  onClick, 
  bg, 
  border, 
  solidifiedText, 
  draftText,
  summary,
  placeholderSummary
}: PillarCardProps) {
  // Force the icon to match the height of the title text (~14px)
  const sizedIcon = React.isValidElement(icon) ? cloneElement(icon as React.ReactElement<any>, { size: 14 }) : icon;
  const largeIcon = React.isValidElement(icon) ? cloneElement(icon as React.ReactElement<any>, { size: 32 }) : icon;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "relative p-5 rounded-3xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col text-left aspect-square shadow-lg w-full sm:w-[240px]",
        isComplete ? "bg-card border-border shadow-inner" : "bg-muted/30 border-dashed border-border hover:border-foreground/30",
        isComplete && `border-b-4 ${border}`
      )}
    >
      {/* Top Row: Icon + Title */}
      <div className="flex items-center gap-2 mb-2 shrink-0">
        <div className={cn(
          "p-1.5 rounded-lg flex items-center justify-center border", 
          isComplete ? bg : "bg-muted", 
          isComplete ? border : "border-border opacity-60 grayscale"
        )}>
          {sizedIcon}
        </div>
        <h3 className={cn("text-[10px] font-bold uppercase tracking-widest truncate flex-1", isComplete ? "text-foreground" : "text-muted-foreground")}>
          {title}
        </h3>
      </div>
      
      {/* Middle: Focused Summary */}
      <div className="flex-1 flex flex-col justify-center overflow-hidden py-2">
         {isComplete && summary ? (
            <p className="text-sm md:text-base text-foreground font-bold leading-relaxed line-clamp-4">
                {summary}
            </p>
         ) : (
            <div className="text-center w-full space-y-3">
                <div className="mx-auto flex justify-center opacity-20 grayscale">
                    {largeIcon}
                </div>
                <p className="text-[11px] text-muted-foreground/60 italic leading-relaxed line-clamp-3 px-2">
                    "{placeholderSummary}"
                </p>
            </div>
         )}
      </div>

      {/* Bottom: Status */}
      <div className="mt-2 pt-3 border-t border-border/50 shrink-0">
         <p className="text-[9px] font-bold uppercase tracking-tighter flex items-center justify-between w-full">
            {isComplete ? (
              <span className="flex items-center gap-1.5 text-foreground"><CheckCircle2 size={12} className="text-green-500" /> {solidifiedText}</span>
            ) : (
              <span className="text-muted-foreground/50">{draftText}</span>
            )}
         </p>
      </div>
    </div>
  );
}
