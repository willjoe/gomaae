import type { Meta, StoryObj } from '@storybook/react';
import RoadmapGantt from './RoadmapGantt';
import { mockTickets } from './gantt/mockTickets';
import { Ticket } from './gantt/types';
import React from 'react';
import { expect, within } from 'storybook/test';

const tickets = mockTickets as unknown as Ticket[];

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
    tickets: tickets,
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'weeks',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Verify Registry Header
    await expect(canvas.getByText('Artifact Identity Registry')).toBeInTheDocument();
    
    // Verify common month labels
    await expect(canvas.getByText(/Jun 2026/i)).toBeInTheDocument();
  }
};

export const Daily: Story = {
  args: {
    tickets: tickets,
    onSelectTicket: (t) => console.log('Selected', t),
    scale: 'days',
  },
};
