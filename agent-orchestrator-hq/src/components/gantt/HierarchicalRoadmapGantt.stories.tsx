import type { Meta, StoryObj } from '@storybook/react';
import HierarchicalRoadmapGantt from '../HierarchicalRoadmapGantt';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { mockTickets } from './mockTickets';
import { Ticket } from './types';
import React from 'react';
import { expect, within } from 'storybook/test';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof HierarchicalRoadmapGantt> = {
  title: 'Components/Gantt/HierarchicalRoadmapGantt',
  component: HierarchicalRoadmapGantt,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 h-screen bg-background">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof HierarchicalRoadmapGantt>;

export const Default: Story = {
  args: {
    phaseId: 'planning',
    parents: tickets.filter(t => t.tier === 'Epic'),
    childTickets: tickets.filter(t => t.tier === 'Story'),
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'weeks',
    parentLabel: 'Epic',
    childLabel: 'Story',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Node Identity Registry')).toBeInTheDocument();
    await expect(canvas.getByText('Today')).toBeInTheDocument();
  }
};

export const Development: Story = {
  args: {
    phaseId: 'dev',
    parents: tickets.filter(t => t.tier === 'Story'),
    childTickets: tickets.filter(t => t.tier === 'Task'),
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'days',
    parentLabel: 'Story',
    childLabel: 'Task',
  },
};

export const Testing: Story = {
  args: {
    phaseId: 'testing',
    parents: tickets.filter(t => t.tier === 'Story'),
    childTickets: tickets.filter(t => t.tier === 'Task'),
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'days',
    parentLabel: 'Story',
    childLabel: 'Task',
    isTestingPhase: true
  },
};
