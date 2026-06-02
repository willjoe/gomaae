import type { Meta, StoryObj } from '@storybook/react';
import HierarchicalRoadmapGantt from '../HierarchicalRoadmapGantt';
import { mockTickets } from './mockTickets';
import React from 'react';

const meta: Meta<typeof HierarchicalRoadmapGantt> = {
  title: 'Components/Gantt/HierarchicalRoadmapGantt',
  component: HierarchicalRoadmapGantt,
  decorators: [
    (Story) => (
      <div className="p-8 h-screen bg-background">
        <Story />
      </div>
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
    parents: mockTickets.filter(t => t.tier === 'Epic'),
    childTickets: mockTickets.filter(t => t.tier === 'Story'), // Renamed prop
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'weeks',
    parentLabel: 'Epic',
    childLabel: 'Story',
  },
};

export const Development: Story = {
  args: {
    phaseId: 'dev',
    parents: mockTickets.filter(t => t.tier === 'Story'),
    childTickets: mockTickets.filter(t => t.tier === 'Task'), // Renamed prop
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'days',
    parentLabel: 'Story',
    childLabel: 'Task',
  },
};
