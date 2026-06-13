'use client';

import React, { useState } from 'react';
import {
  Activity,
  GitBranch,
  GitCommit,
  GitMerge,
  ArrowRight,
  Server,
  Terminal,
  Code2,
  ShieldAlert,
  Bot,
  BookMarked,
  GitPullRequest,
  CheckSquare,
  RefreshCw,
  ClipboardList,
} from 'lucide-react';
import { useLifecycle } from '@/context/LifecycleContext';
import OrchestrationHistory from '@/components/automation/OrchestrationHistory';
import HookTriggerCard from '@/components/automation/HookTriggerCard';
import type { CheckDef, CheckResult } from '@/components/automation/HookChecksPanel';

// ---------------------------------------------------------------------------
// Check catalogues
// ---------------------------------------------------------------------------

const COMMIT_CHECKS: CheckDef[] = [
  { id: 'syntax',    label: 'Syntax',            group: 'Code Quality', defaultOn: true,  groupIcon: <Code2 size={12} />,
    desc: 'Parse & compile across all detected languages (TypeScript, JavaScript, Python, Go…)' },
  { id: 'lint',      label: 'Lint',              group: 'Code Quality', defaultOn: true,  groupIcon: <Code2 size={12} />,
    desc: 'Style and correctness via ESLint, Flake8, golint — auto-detected from repo config' },
  { id: 'typecheck', label: 'Type Check',        group: 'Code Quality', defaultOn: true,  groupIcon: <Code2 size={12} />,
    desc: 'Static type verification via tsc --noEmit (TypeScript projects only)' },
  { id: 'tests',     label: 'Test Runner',       group: 'Code Quality', defaultOn: false, groupIcon: <Code2 size={12} />,
    desc: "Execute the project's test suite; passes if all tests pass or none are defined" },

  { id: 'secrets',   label: 'Secret Scan',       group: 'Security', defaultOn: true,  groupIcon: <ShieldAlert size={12} />,
    desc: 'Detect API keys, tokens, and credentials accidentally included in the diff' },
  { id: 'audit',     label: 'Dependency Audit',  group: 'Security', defaultOn: false, groupIcon: <ShieldAlert size={12} />,
    desc: 'Scan package manifests (npm, pip) for known high/critical vulnerabilities' },

  { id: 'scope',     label: 'Agent Scope Guard', group: 'Agent Safety', defaultOn: true,  groupIcon: <Bot size={12} />,
    desc: "Verify the agent only modified files within its ticket's assigned directory path" },
  { id: 'nobinary',  label: 'No Binary Assets',  group: 'Agent Safety', defaultOn: true,  groupIcon: <Bot size={12} />,
    desc: 'Reject commits that include compiled binaries, executables, or .pyc files' },

  { id: 'commitfmt', label: 'Commit Message',    group: 'Standards', defaultOn: true,  groupIcon: <BookMarked size={12} />,
    desc: 'Enforce Conventional Commits format: feat/fix/chore(scope): description' },
  { id: 'filesize',  label: 'File Size Limit',   group: 'Standards', defaultOn: true,  groupIcon: <BookMarked size={12} />,
    desc: 'Block individual files exceeding 500 KB from being committed' },
];

const MERGE_CHECKS: CheckDef[] = [
  { id: 'tickets_in_review', label: 'All Tickets In Review',  group: 'Branch Quality', defaultOn: true,  groupIcon: <GitPullRequest size={12} />,
    desc: 'All linked Task and QA tickets must be In Review or Done before merging' },
  { id: 'no_debug_code',     label: 'No Debug Code',          group: 'Branch Quality', defaultOn: true,  groupIcon: <GitPullRequest size={12} />,
    desc: 'Detect console.log, debugger statements, and TODO-REMOVE markers in the diff' },
  { id: 'changelog',         label: 'Changelog Updated',      group: 'Branch Quality', defaultOn: false, groupIcon: <GitPullRequest size={12} />,
    desc: 'CHANGELOG.md or release-notes.md must have been modified in this branch' },

  { id: 'no_conflicts',    label: 'Merge Conflict Free',  group: 'Integration', defaultOn: true,  groupIcon: <RefreshCw size={12} />,
    desc: 'Branch merges cleanly into main without conflicts (dry-run merge)' },
  { id: 'branch_uptodate', label: 'Branch Up-to-date',    group: 'Integration', defaultOn: true,  groupIcon: <RefreshCw size={12} />,
    desc: 'Branch contains all recent commits from origin/main' },
  { id: 'tests_pass',      label: 'Tests Pass',            group: 'Integration', defaultOn: false, groupIcon: <RefreshCw size={12} />,
    desc: "Run the full test suite and require all tests to pass" },

  { id: 'version_bumped', label: 'Version Bumped',      group: 'Release', defaultOn: false, groupIcon: <CheckSquare size={12} />,
    desc: 'package.json version must be incremented compared to the previous commit' },
  { id: 'pr_description', label: 'PR Description Set',  group: 'Release', defaultOn: true,  groupIcon: <CheckSquare size={12} />,
    desc: 'Commit body must contain a meaningful description (minimum 20 characters)' },
];

const STATUS_CHECKS: CheckDef[] = [
  { id: 'linear_sync',    label: 'Linear Sync',        group: 'Sync', defaultOn: true,  groupIcon: <RefreshCw size={12} />,
    desc: 'Verify Linear is up-to-date following this status change' },
  { id: 'webhook_delivery', label: 'Webhook Delivery', group: 'Sync', defaultOn: false, groupIcon: <RefreshCw size={12} />,
    desc: 'Notify registered webhook endpoints of the status transition' },

  { id: 'blocking_phase',  label: 'Blocking Phase Valid',   group: 'Validation', defaultOn: true,  groupIcon: <ShieldAlert size={12} />,
    desc: 'Confirm all tickets satisfy two-phase blocking constraints after the transition' },
  { id: 'agent_state_match', label: 'Agent State Match',   group: 'Validation', defaultOn: true,  groupIcon: <ShieldAlert size={12} />,
    desc: "Verify each ticket's agent_state is consistent with its new status" },

  { id: 'dependency_cascade', label: 'Dependency Cascade', group: 'Tracking', defaultOn: true,  groupIcon: <ClipboardList size={12} />,
    desc: 'Identify downstream tickets that become unblocked by this status change' },
  { id: 'audit_log',          label: 'Audit Log Entry',    group: 'Tracking', defaultOn: true,  groupIcon: <ClipboardList size={12} />,
    desc: 'Confirm the change is recorded in the project audit log' },
  { id: 'stale_tickets',      label: 'Stale Ticket Scan',  group: 'Tracking', defaultOn: false, groupIcon: <ClipboardList size={12} />,
    desc: 'Flag tickets that have been In Progress for more than 7 days with no update' },
];

// ---------------------------------------------------------------------------

export default function TriggersPage() {
  const { t } = useLifecycle();

  const [activeTriggers, setActiveTriggers] = useState({
    commit: true,
    merge: false,
    statusChange: true,
  });

  const [triggerHistory, setTriggerHistory] = useState<{ id: string; event: string; ticket: string; agent: string; time: string; status: 'Success' | 'Failed' }[]>([]);

  const pushResults = (label: string) => (results: Record<string, CheckResult>) => {
    const now = new Date().toLocaleTimeString();
    const entries = Object.entries(results).map(([id, r], i) => ({
      id: `${Date.now()}-${i}`,
      event: `${label} · ${id}`,
      ticket: r.passed ? 'Passed' : 'Failed',
      agent: `${r.durationMs}ms`,
      time: now,
      status: (r.passed ? 'Success' : 'Failed') as 'Success' | 'Failed',
    }));
    setTriggerHistory(prev => [...entries, ...prev]);
  };

  return (
    <div className="p-8 space-y-8 h-full overflow-y-auto custom-scrollbar font-sans text-left transition-colors duration-300">
      <header>
        <h1 className="text-3xl font-bold italic tracking-tight text-indigo-500 underline decoration-indigo-500/20 underline-offset-8 decoration-4">
          {t('triggers')}
        </h1>
        <p className="text-muted-foreground mt-2 italic">Configure system-level orchestration events and repository hooks.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Repository Event Hooks */}
        <section className="space-y-6">
          <div className="bg-card border border-border rounded-3xl p-6 space-y-3 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <GitBranch size={20} className="text-indigo-500" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">Repository Event Hooks</h2>
            </div>

            <HookTriggerCard
              icon={<GitCommit size={18} />}
              label="On Commit Trigger"
              desc="Run validation checks on every push to protected branches."
              isActive={activeTriggers.commit}
              onToggle={() => setActiveTriggers(p => ({ ...p, commit: !p.commit }))}
              checks={COMMIT_CHECKS}
              apiPath="/api/hooks/commit"
              settingsKey="commit_hook_checks"
              onRunComplete={pushResults('Commit')}
            />

            <HookTriggerCard
              icon={<GitMerge size={18} />}
              label="On Merge Trigger"
              desc="Validate branch quality and integration before merge is accepted."
              isActive={activeTriggers.merge}
              onToggle={() => setActiveTriggers(p => ({ ...p, merge: !p.merge }))}
              checks={MERGE_CHECKS}
              apiPath="/api/hooks/merge"
              settingsKey="merge_hook_checks"
              onRunComplete={pushResults('Merge')}
            />

            <HookTriggerCard
              icon={<Activity size={18} />}
              label="Status Change Sync"
              desc="Validate and propagate ticket status transitions across the system."
              isActive={activeTriggers.statusChange}
              onToggle={() => setActiveTriggers(p => ({ ...p, statusChange: !p.statusChange }))}
              checks={STATUS_CHECKS}
              apiPath="/api/hooks/status"
              settingsKey="status_hook_checks"
              onRunComplete={pushResults('Status')}
            />
          </div>

          <div className="bg-muted/20 border border-border border-dashed rounded-3xl p-8 flex flex-col items-center justify-center space-y-4 opacity-60">
            <Server size={32} className="text-muted-foreground" />
            <div className="text-center space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-foreground">Webhook Endpoint Active</div>
              <code className="text-[9px] bg-card px-2 py-1 rounded border border-border text-indigo-500">
                https://hq.internal/api/webhooks/vcs
              </code>
            </div>
          </div>
        </section>

        {/* Live Trigger Stream */}
        <section className="space-y-6">
          <OrchestrationHistory
            history={triggerHistory}
            onClear={() => setTriggerHistory([])}
          />

          <div className="p-6 bg-indigo-600 rounded-3xl shadow-lg shadow-indigo-900/20 flex items-center justify-between group cursor-pointer hover:bg-indigo-500 transition-all">
            <div className="flex items-center gap-4 text-white">
              <div className="p-2 bg-white/20 rounded-xl">
                <Terminal size={20} />
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-widest leading-none">Manual Override</div>
                <p className="text-[10px] opacity-80 italic mt-1 leading-none">Force immediate repository sync</p>
              </div>
            </div>
            <ArrowRight size={20} className="text-white/50 group-hover:translate-x-1 transition-transform" />
          </div>
        </section>

      </div>
    </div>
  );
}
