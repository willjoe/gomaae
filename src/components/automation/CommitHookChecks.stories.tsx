import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import CommitHookChecks from './CommitHookChecks';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof CommitHookChecks> = {
  title: 'Organisms/Automation/CommitHookChecks',
  component: CommitHookChecks,
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
type Story = StoryObj<typeof CommitHookChecks>;

// CommitHookChecks loads its own CHECKS array internally and fetches
// /api/dev-server/checks for persisted settings (returns 404 in Storybook).
export const Default: Story = {};
