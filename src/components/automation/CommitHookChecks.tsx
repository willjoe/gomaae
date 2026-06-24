'use client';

import React, { useEffect, useState } from 'react';
import {
  Play, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronRight,
  Code2, ShieldAlert, Bot, BookMarked,
} from 'lucide-react';
import { cn } from '@/lib/cn';

// ---------------------------------------------------------------------------
// Check catalogue
// ---------------------------------------------------------------------------

interface CheckDef {
  id: string;
  label: string;
  desc: string;
  group: string;
  defaultOn: boolean;
}

const CHECKS: CheckDef[] = [
  // Code Quality
  { id: 'syntax',    label: 'Syntax',            group: 'Code Quality', defaultOn: true,
    desc: 'Parse & compile check across all detected languages (TypeScript, JavaScript, Python, Go…)' },
  { id: 'lint',      label: 'Lint',              group: 'Code Quality', defaultOn: true,
    desc: 'Style and correctness rules via ESLint, Flake8, golint — auto-detected from repo config' },
  { id: 'typecheck', label: 'Type Check',        group: 'Code Quality', defaultOn: true,
    desc: 'Static type verification via tsc --noEmit (TypeScript projects only)' },
  { id: 'tests',     label: 'Test Runner',       group: 'Code Quality', defaultOn: false,
    desc: 'Execute the project\'s test suite; passes if all tests pass or none are defined' },

  // Security
  { id: 'secrets',   label: 'Secret Scan',       group: 'Security', defaultOn: true,
    desc: 'Detect API keys, tokens, and credentials accidentally included in the diff' },
  { id: 'audit',     label: 'Dependency Audit',  group: 'Security', defaultOn: false,
    desc: 'Scan package manifests (npm, pip) for known high/critical vulnerabilities' },

  // Agent Safety
  { id: 'scope',     label: 'Agent Scope Guard', group: 'Agent Safety', defaultOn: true,
    desc: 'Verify the agent only modified files within its ticket\'s assigned directory path' },
  { id: 'nobinary',  label: 'No Binary Assets',  group: 'Agent Safety', defaultOn: true,
    desc: 'Reject commits that include compiled binaries, executables, or .pyc files' },

  // Standards
  { id: 'commitfmt', label: 'Commit Message',    group: 'Standards', defaultOn: true,
    desc: 'Enforce Conventional Commits format: feat/fix/chore(scope): description' },
  { id: 'filesize',  label: 'File Size Limit',   group: 'Standards', defaultOn: true,
    desc: 'Block individual files exceeding 500 KB from being committed' },
];

const GROUPS = ['Code Quality', 'Security', 'Agent Safety', 'Standards'] as const;

const GROUP_ICONS: Record<string, React.ReactNode> = {
  'Code Quality': <Code2 size={13} />,
  'Security':     <ShieldAlert size={13} />,
  'Agent Safety': <Bot size={13} />,
  'Standards':    <BookMarked size={13} />,
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CheckResult {
  passed: boolean;
  output: string;
  durationMs: number;
}

interface Props {
  onRunComplete?: (results: Record<string, CheckResult>) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CommitHookChecks({ onRunComplete }: Props) {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CHECKS.map(c => [c.id, c.defaultOn]))
  );
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [runningId, setRunningId] = useState<string | null>(null);
  const [langs, setLangs] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load saved settings on mount
  useEffect(() => {
    fetch('/api/hooks/commit')
      .then(r => r.json())
      .then(({ checks }) => {
        if (checks && typeof checks === 'object') setEnabled(prev => ({ ...prev, ...checks }));
      })
      .catch(() => {});
  }, []);

  const save = async (next: Record<string, boolean>) => {
    setSaveStatus('saving');
    await fetch('/api/hooks/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save', checks: next }),
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
    const toRun = CHECKS.filter(c => enabled[c.id]).map(c => c.id);
    if (toRun.length === 0) return;
    setRunning(true);
    setResults({});
    const accumulated: Record<string, CheckResult> = {};

    for (const id of toRun) {
      setRunningId(id);
      const res = await fetch('/api/hooks/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', checks: [id] }),
      }).then(r => r.json());

      if (res.results?.[id]) {
        accumulated[id] = res.results[id];
        setResults({ ...accumulated });
        if (res.langs?.length) setLangs(res.langs);
      } else if (!res.success) {
        accumulated[id] = { passed: false, output: res.error || 'Check failed', durationMs: 0 };
        setResults({ ...accumulated });
      }
    }

    setRunningId(null);
    setRunning(false);
    onRunComplete?.(accumulated);
  };

  const enabledCount = CHECKS.filter(c => enabled[c.id]).length;
  const passCount = Object.values(results).filter(r => r.passed).length;
  const failCount = Object.values(results).filter(r => !r.passed).length;
  const hasResults = Object.keys(results).length > 0;

  return (
    <div className="mt-3 rounded-2xl border border-border bg-muted/10 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
            On Commit Checks
          </span>
          <span className="text-[9px] font-bold bg-indigo-500/15 text-indigo-500 px-1.5 py-0.5 rounded-full">
            {enabledCount} active
          </span>
          {langs.length > 0 && (
            <span className="text-[9px] text-muted-foreground italic">
              Detected: {langs.join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-[9px] text-muted-foreground italic">Saving…</span>}
          {saveStatus === 'saved' && <span className="text-[9px] text-green-500 font-bold">Saved</span>}
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
            {running ? 'Running…' : 'Run Checks'}
          </button>
        </div>
      </div>

      {/* Grouped checks */}
      <div className="divide-y divide-border/30">
        {GROUPS.map(group => {
          const groupChecks = CHECKS.filter(c => c.group === group);
          const isCollapsed = collapsed[group];
          return (
            <div key={group}>
              {/* Group header */}
              <button
                onClick={() => setCollapsed(p => ({ ...p, [group]: !p[group] }))}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-muted/20 transition-colors text-left"
              >
                <span className="text-muted-foreground">{GROUP_ICONS[group]}</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
                  {group}
                </span>
                <span className="text-[8px] text-muted-foreground/50">
                  {groupChecks.filter(c => enabled[c.id]).length}/{groupChecks.length} on
                </span>
                {isCollapsed ? <ChevronRight size={11} className="text-muted-foreground/40" /> : <ChevronDown size={11} className="text-muted-foreground/40" />}
              </button>

              {/* Checks list */}
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
                          isEnabled ? 'bg-transparent' : 'opacity-50',
                        )}
                      >
                        {/* Status indicator / spinner */}
                        <div className="mt-0.5 shrink-0 w-5 flex justify-center">
                          {isThisRunning ? (
                            <Loader2 size={14} className="animate-spin text-indigo-400" />
                          ) : result ? (
                            result.passed
                              ? <CheckCircle2 size={14} className="text-green-500" />
                              : <XCircle size={14} className="text-red-500" />
                          ) : (
                            <div className={cn('w-1.5 h-1.5 rounded-full mt-1', isEnabled ? 'bg-indigo-400' : 'bg-muted-foreground/30')} />
                          )}
                        </div>

                        {/* Label + desc + result output */}
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold text-foreground leading-none">{check.label}</div>
                          <p className="text-[9px] text-muted-foreground italic mt-0.5 leading-tight">{check.desc}</p>
                          {result && (
                            <pre className={cn(
                              'mt-1.5 text-[9px] font-mono leading-tight px-2 py-1.5 rounded-lg border whitespace-pre-wrap break-words max-h-24 overflow-y-auto',
                              result.passed
                                ? 'bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400'
                                : 'bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400'
                            )}>
                              {result.output}
                              {result.durationMs > 0 && (
                                <span className="opacity-40"> ({result.durationMs}ms)</span>
                              )}
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
