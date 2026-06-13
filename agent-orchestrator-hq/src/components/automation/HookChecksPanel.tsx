'use client';

import React, { useEffect, useState } from 'react';
import {
  Play, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Types (exported so callers can reference them)
// ---------------------------------------------------------------------------

export interface CheckDef {
  id: string;
  label: string;
  desc: string;
  group: string;
  defaultOn: boolean;
  groupIcon?: React.ReactNode;
}

export interface CheckResult {
  passed: boolean;
  output: string;
  durationMs: number;
}

interface Props {
  checks: CheckDef[];
  apiPath: string;
  settingsKey: string;
  onRunComplete?: (results: Record<string, CheckResult>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HookChecksPanel({ checks, apiPath, settingsKey, onRunComplete }: Props) {
  const groups = [...new Set(checks.map(c => c.group))];

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(checks.map(c => [c.id, c.defaultOn]))
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [langs, setLangs] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load persisted settings
  useEffect(() => {
    fetch(apiPath)
      .then(r => r.json())
      .then(({ checks: saved }) => {
        if (saved && typeof saved === 'object') setEnabled(prev => ({ ...prev, ...saved }));
      })
      .catch(() => {});
  }, [apiPath]);

  const save = async (next: Record<string, boolean>) => {
    setSaveStatus('saving');
    await fetch(apiPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', checks: next, settingsKey }),
    });
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 1500);
  };

  const toggle = (id: string) => {
    const next = { ...enabled, [id]: !enabled[id] };
    setEnabled(next);
    save(next);
  };

  const runAll = async () => {
    const toRun = checks.filter(c => enabled[c.id]).map(c => c.id);
    if (toRun.length === 0) return;
    setRunning(true);
    setResults({});
    const accumulated: Record<string, CheckResult> = {};

    for (const id of toRun) {
      setRunningId(id);
      try {
        const res = await fetch(apiPath, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'run', checks: [id], settingsKey }),
        }).then(r => r.json());

        if (res.results?.[id]) {
          accumulated[id] = res.results[id];
        } else {
          accumulated[id] = { passed: false, output: res.error || 'Check failed', durationMs: 0 };
        }
        if (res.langs?.length) setLangs(res.langs);
      } catch (e: any) {
        accumulated[id] = { passed: false, output: e.message || 'Network error', durationMs: 0 };
      }
      setResults({ ...accumulated });
    }

    setRunningId(null);
    setRunning(false);
    onRunComplete?.(accumulated);
  };

  const enabledCount = checks.filter(c => enabled[c.id]).length;
  const passCount = Object.values(results).filter(r => r.passed).length;
  const failCount = Object.values(results).filter(r => !r.passed).length;
  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="border-t border-border/50 bg-muted/5">
      {/* Sub-header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-muted/15 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Checks</span>
          <span className="text-[9px] font-bold bg-indigo-500/15 text-indigo-500 px-1.5 py-0.5 rounded-full">
            {enabledCount} active
          </span>
          {langs.length > 0 && (
            <span className="text-[9px] text-muted-foreground/60 italic">
              {langs.join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-[9px] text-muted-foreground italic">Saving…</span>}
          {saveStatus === 'saved'  && <span className="text-[9px] text-green-500 font-bold">Saved</span>}
          {hasResults && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold">
              {passCount > 0 && <span className="text-green-500">{passCount} passed</span>}
              {failCount > 0 && <span className="text-red-500">{failCount} failed</span>}
            </div>
          )}
          <button
            onClick={runAll}
            disabled={running || enabledCount === 0}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all',
              running || enabledCount === 0
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'
            )}
          >
            {running ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />}
            {running ? 'Running…' : 'Run'}
          </button>
        </div>
      </div>

      {/* Grouped checks */}
      <div className="divide-y divide-border/30">
        {groups.map(group => {
          const groupChecks = checks.filter(c => c.group === group);
          const groupIcon = groupChecks[0]?.groupIcon;
          const isCollapsed = collapsed[group];

          return (
            <div key={group}>
              <button
                onClick={() => setCollapsed(p => ({ ...p, [group]: !p[group] }))}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors text-left"
              >
                {groupIcon && <span className="text-muted-foreground/60">{groupIcon}</span>}
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
                  {group}
                </span>
                <span className="text-[8px] text-muted-foreground/40 mr-1">
                  {groupChecks.filter(c => enabled[c.id]).length}/{groupChecks.length}
                </span>
                {isCollapsed
                  ? <ChevronRight size={11} className="text-muted-foreground/30" />
                  : <ChevronDown  size={11} className="text-muted-foreground/30" />
                }
              </button>

              {!isCollapsed && (
                <div className="divide-y divide-border/20">
                  {groupChecks.map(check => {
                    const isEnabled = enabled[check.id];
                    const result = results[check.id];
                    const isThisRunning = runningId === check.id;

                    return (
                      <div
                        key={check.id}
                        className={cn(
                          'flex items-start gap-3 px-4 py-3 transition-colors',
                          !isEnabled && 'opacity-45'
                        )}
                      >
                        {/* Status dot / spinner / result icon */}
                        <div className="mt-0.5 shrink-0 w-5 flex justify-center">
                          {isThisRunning ? (
                            <Loader2 size={14} className="animate-spin text-indigo-400" />
                          ) : result ? (
                            result.passed
                              ? <CheckCircle2 size={14} className="text-green-500" />
                              : <XCircle      size={14} className="text-red-500" />
                          ) : (
                            <div className={cn(
                              'w-1.5 h-1.5 rounded-full mt-[5px]',
                              isEnabled ? 'bg-indigo-400' : 'bg-muted-foreground/25'
                            )} />
                          )}
                        </div>

                        {/* Label + desc + result */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-foreground leading-none">{check.label}</div>
                          <p className="text-[9px] text-muted-foreground italic mt-0.5 leading-tight">{check.desc}</p>
                          {result && (
                            <pre className={cn(
                              'mt-1.5 text-[9px] font-mono leading-tight px-2 py-1.5 rounded-lg border',
                              'whitespace-pre-wrap break-words max-h-24 overflow-y-auto custom-scrollbar',
                              result.passed
                                ? 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400'
                                : 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400'
                            )}>
                              {result.output}
                              {result.durationMs > 0 && <span className="opacity-40"> ({result.durationMs}ms)</span>}
                            </pre>
                          )}
                        </div>

                        {/* Toggle */}
                        <button
                          onClick={() => toggle(check.id)}
                          className={cn(
                            'shrink-0 mt-0.5 w-8 h-4 rounded-full relative transition-colors duration-200',
                            isEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                          )}
                        >
                          <div className={cn(
                            'absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform duration-200',
                            isEnabled ? 'translate-x-4' : 'translate-x-0'
                          )} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
