import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import ContainerCard from './ContainerCard';
import { LifecycleProvider } from '@/context/LifecycleContext';

const base = {
  id: 'task-3',
  identifier: 'TKT-1004',
  title: 'Implement user auth endpoint',
  tier: 'Task',
  llm_role: 'API Engineer',
  authorized_model: 'claude-sonnet-4-6',
  status: 'In Progress',
};

const meta: Meta<typeof ContainerCard> = {
  title: 'Organisms/Automation/ContainerCard',
  component: ContainerCard,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 bg-background min-h-screen max-w-sm">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof ContainerCard>;

export const Queued: Story = {
  args: {
    container: { ...base, agent_state: 'Queued', agent_phase: null },
    activeBlockers: [],
    onSelect: () => {},
  },
};

export const Running: Story = {
  args: {
    container: { ...base, agent_state: 'Running', agent_phase: 'Coding' },
    activeBlockers: [],
    onSelect: () => {},
  },
};

export const Finalizing: Story = {
  args: {
    container: { ...base, agent_state: 'Running', agent_phase: 'Finalizing' },
    activeBlockers: [],
    onSelect: () => {},
  },
};

export const Stopped: Story = {
  args: {
    container: { ...base, agent_state: 'Stopped', agent_phase: 'Committing' },
    activeBlockers: [],
    onSelect: () => {},
  },
};

export const Blocked: Story = {
  args: {
    container: { ...base, agent_state: 'Queued', agent_phase: null },
    activeBlockers: ['TKT-1001', 'TKT-1002'],
    onSelect: () => {},
  },
};
