import type { Meta, StoryObj } from '@storybook/react';
import TieredTicketListSidebar from './TieredTicketListSidebar';
import { mockTickets } from './gantt/mockTickets';
import { Ticket } from './gantt/types';
import React from 'react';
import { expect, userEvent, within, waitFor } from 'storybook/test';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof TieredTicketListSidebar> = {
  title: 'Components/Tickets/TieredTicketListSidebar',
  component: TieredTicketListSidebar,
  decorators: [
    (Story) => (
      <div className="w-[300px] h-screen p-4 bg-muted/10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TieredTicketListSidebar>;

export const Epics: Story = {
  args: {
    phaseId: 'planning',
    initialTier: 'Epic',
    tickets: tickets.filter(t => t.tier === 'Epic'),
    searchQuery: '',
    activeAssigneeFilters: [],
    onSearchChange: (q) => console.log('Search:', q),
    onToggleAssignee: (id) => console.log('Toggle:', id),
    onResetFilters: () => console.log('Reset'),
    onSelectTicket: (t: any) => console.log('Selected:', t),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Check initial list
    await expect(canvas.getByText('Registry Scan')).toBeInTheDocument();
    
    // Test Filter Overlay trigger
    const searchInput = canvas.getByPlaceholderText(/Filter/i);
    await userEvent.click(searchInput);
    
    // Check if overlay appeared
    await waitFor(() => {
        expect(canvas.getByText('Reset Filters')).toBeInTheDocument();
    });

    // Close Overlay
    const closeBtn = canvas.getByRole('button', { name: '' }); // The X icon usually has no label but we can find it
    await userEvent.click(canvas.getByText('Reset Filters')); // Clicking reset also works
  }
};

export const Stories: Story = {
  args: {
    phaseId: 'development',
    initialTier: 'Story',
    tickets: tickets.filter(t => t.tier === 'Story'),
    searchQuery: '',
    activeAssigneeFilters: [],
    onSearchChange: (q) => console.log('Search:', q),
    onToggleAssignee: (id) => console.log('Toggle:', id),
    onResetFilters: () => console.log('Reset'),
    onSelectTicket: (t: any) => console.log('Selected:', t),
  },
};
