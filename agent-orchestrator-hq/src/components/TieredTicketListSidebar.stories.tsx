import type { Meta, StoryObj } from '@storybook/react';
import TieredTicketListSidebar from './TieredTicketListSidebar';
import { mockTickets } from './gantt/mockTickets';
import React from 'react';

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
    tickets: mockTickets.filter(t => t.tier === 'Epic'),
    searchQuery: '',
    activeAssigneeFilters: [],
    onSearchChange: (q) => console.log('Search:', q),
    onToggleAssignee: (id) => console.log('Toggle:', id),
    onResetFilters: () => console.log('Reset'),
    onSelectTicket: (t: any) => console.log('Selected:', t),
  },
};

export const Stories: Story = {
  args: {
    phaseId: 'development',
    initialTier: 'Story',
    tickets: mockTickets.filter(t => t.tier === 'Story'),
    searchQuery: '',
    activeAssigneeFilters: [],
    onSearchChange: (q) => console.log('Search:', q),
    onToggleAssignee: (id) => console.log('Toggle:', id),
    onResetFilters: () => console.log('Reset'),
    onSelectTicket: (t: any) => console.log('Selected:', t),
  },
};
