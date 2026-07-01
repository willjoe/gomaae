import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import HookChecksPanel, { type CheckDef } from './HookChecksPanel';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { Code2, ShieldAlert, Bot } from 'lucide-react';

const MOCK_CHECKS: CheckDef[] = [
  { id: 'syntax',    label: 'Syntax',           desc: 'Parse & compile check across TypeScript, JavaScript, Python', group: 'Code Quality', defaultOn: true,  groupIcon: <Code2 size={13} /> },
  { id: 'lint',      label: 'Lint',             desc: 'ESLint, Flake8, golint — auto-detected from repo config',     group: 'Code Quality', defaultOn: true,  groupIcon: <Code2 size={13} /> },
  { id: 'typecheck', label: 'Type Check',       desc: 'Static type verification via tsc --noEmit',                  group: 'Code Quality', defaultOn: true,  groupIcon: <Code2 size={13} /> },
  { id: 'secrets',   label: 'Secret Scan',      desc: 'Detect API keys and credentials in the diff',               group: 'Security',     defaultOn: true,  groupIcon: <ShieldAlert size={13} /> },
  { id: 'audit',     label: 'Dependency Audit', desc: 'Scan manifests for known high/critical vulnerabilities',     group: 'Security',     defaultOn: false, groupIcon: <ShieldAlert size={13} /> },
  { id: 'scope',     label: 'Agent Scope Guard',desc: 'Verify agent only modified its assigned directory',          group: 'Agent Safety', defaultOn: true,  groupIcon: <Bot size={13} /> },
];

const meta: Meta<typeof HookChecksPanel> = {
  title: 'Organisms/Automation/HookChecksPanel',
  component: HookChecksPanel,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="bg-background min-h-screen max-w-2xl border border-border rounded-xl overflow-hidden m-8">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof HookChecksPanel>;

export const Default: Story = {
  args: {
    checks: MOCK_CHECKS,
    apiPath: '/api/dev-server/checks',
    settingsKey: 'commit_hook_checks',
  },
};
