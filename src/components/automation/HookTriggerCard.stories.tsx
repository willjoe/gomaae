import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import HookTriggerCard from './HookTriggerCard';
import { type CheckDef } from './HookChecksPanel';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { GitCommit, Code2, ShieldAlert } from 'lucide-react';

const MOCK_CHECKS: CheckDef[] = [
  { id: 'syntax',  label: 'Syntax',      desc: 'Parse & compile check across all detected languages', group: 'Code Quality', defaultOn: true, groupIcon: <Code2 size={13} /> },
  { id: 'lint',    label: 'Lint',        desc: 'Style and correctness rules via ESLint/Flake8',       group: 'Code Quality', defaultOn: true, groupIcon: <Code2 size={13} /> },
  { id: 'secrets', label: 'Secret Scan', desc: 'Detect credentials accidentally included in diff',    group: 'Security',     defaultOn: true, groupIcon: <ShieldAlert size={13} /> },
];

const meta: Meta<typeof HookTriggerCard> = {
  title: 'Organisms/Automation/HookTriggerCard',
  component: HookTriggerCard,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 bg-background min-h-screen max-w-2xl">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof HookTriggerCard>;

export const Active: Story = {
  args: {
    icon: <GitCommit size={18} />,
    label: 'Pre-commit Hook',
    desc: 'Runs quality, security, and scope checks before every agent commit.',
    isActive: true,
    onToggle: () => {},
    checks: MOCK_CHECKS,
    apiPath: '/api/dev-server/checks',
    settingsKey: 'commit_hook_checks',
  },
};

export const Inactive: Story = {
  args: {
    ...Active.args,
    isActive: false,
  },
};
