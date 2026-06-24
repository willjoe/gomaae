'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import HookChecksPanel from './HookChecksPanel';
import type { CheckDef, CheckResult } from './HookChecksPanel';

interface Props {
  icon: React.ReactNode;
  label: string;
  desc: string;
  isActive: boolean;
  onToggle: () => void;
  checks: CheckDef[];
  apiPath: string;
  settingsKey: string;
  onRunComplete?: (results: Record<string, CheckResult>) => void;
}

export default function HookTriggerCard({
  icon, label, desc, isActive, onToggle,
  checks, apiPath, settingsKey, onRunComplete,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={cn(
      'rounded-2xl border transition-all overflow-hidden',
      isActive ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-border bg-muted/10'
    )}>
      {/* Header row — left side toggles expand, right side has the enable switch */}
      <div className="flex items-center justify-between px-4 py-3">
        {/* Clickable expand area */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-3 flex-1 text-left min-w-0"
        >
          <div className={cn(
            'p-2 rounded-xl border shrink-0 transition-colors',
            isActive
              ? 'bg-indigo-500 text-white border-indigo-400'
              : 'bg-muted text-muted-foreground border-border'
          )}>
            {icon}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-foreground uppercase tracking-tight">{label}</div>
            <p className="text-[9px] text-muted-foreground italic leading-tight mt-0.5">{desc}</p>
          </div>
          <div className="shrink-0 ml-2 text-muted-foreground/40">
            {expanded
              ? <ChevronDown  size={14} />
              : <ChevronRight size={14} />
            }
          </div>
        </button>

        {/* Enable/disable toggle — isolated from expand click */}
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className={cn(
            'shrink-0 ml-4 w-10 h-5 rounded-full relative transition-colors duration-300',
            isActive ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-800'
          )}
        >
          <div className={cn(
            'absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-300',
            isActive ? 'translate-x-5' : 'translate-x-0'
          )} />
        </button>
      </div>

      {/* Collapsible checks panel */}
      {expanded && (
        <HookChecksPanel
          checks={checks}
          apiPath={apiPath}
          settingsKey={settingsKey}
          onRunComplete={onRunComplete}
        />
      )}
    </div>
  );
}
