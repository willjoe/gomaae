import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import AgentRolesPage from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof AgentRolesPage> = {
  title: 'Pages/AgentRolesPage',
  component: AgentRolesPage,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="h-screen bg-background overflow-auto">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof AgentRolesPage>;

// Agent Roles page fetches /api/agent-roles on mount — returns 404 in Storybook,
// so it shows the org chart skeleton with no persisted role overrides.
export const Default: Story = {};
