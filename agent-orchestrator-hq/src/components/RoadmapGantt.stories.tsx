import type { Meta, StoryObj } from '@storybook/react';
import RoadmapGantt from './RoadmapGantt';
import { mockTickets } from './gantt/mockTickets';
import React from 'react';

const meta: Meta<typeof RoadmapGantt> = {
  title: 'Components/Gantt/RoadmapGantt',
  component: RoadmapGantt,
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
type Story = StoryObj<typeof RoadmapGantt>;

export const Default: Story = {
  args: {
    tickets: mockTickets,
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'weeks',
  },
};

export const Daily: Story = {
  args: {
    tickets: mockTickets,
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'days',
  },
};
