import type { Meta, StoryObj } from '@storybook/react';
import HierarchicalRoadmapGantt from '../HierarchicalRoadmapGantt';
import { LifecycleProvider } from '../../context/LifecycleContext';
import { mockTickets } from './mockTickets';
import React from 'react';

const meta: Meta<typeof HierarchicalRoadmapGantt> = {
  title: 'Components/HierarchicalRoadmapGantt',
  component: HierarchicalRoadmapGantt,
  decorators: [
    (Story, context) => (
      <LifecycleProvider initialTickets={mockTickets}>
        <div className="h-screen bg-slate-950 p-8 overflow-hidden flex flex-col">
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

export const Planning: Story = {
  args: {
    phaseId: 'planning',
    parents: mockTickets.filter(t => t.tier === 'Epic'),
    children: mockTickets.filter(t => t.tier === 'Story'),
    onSelectTicket: (t) => console.log('Selected:', t.identifier),
    parentLabel: 'Epic',
    childLabel: 'Story',
    scale: 'weeks',
  },
};

export const Development: Story = {
  args: {
    phaseId: 'development',
    parents: mockTickets.filter(t => t.tier === 'Story'),
    children: mockTickets.filter(t => t.tier === 'Task'),
    onSelectTicket: (t) => console.log('Selected:', t.identifier),
    parentLabel: 'Story',
    childLabel: 'Task',
    scale: 'days',
  },
};

export const Testing: Story = {
  args: {
    phaseId: 'testing',
    parents: mockTickets.filter(t => t.tier === 'Epic'),
    children: mockTickets.filter(t => t.tier !== 'Epic'),
    onSelectTicket: (t) => console.log('Selected:', t.identifier),
    parentLabel: 'Project',
    childLabel: 'Artifacts',
    scale: 'days',
    isTestingPhase: true,
    disableExpansion: true,
  },
};
