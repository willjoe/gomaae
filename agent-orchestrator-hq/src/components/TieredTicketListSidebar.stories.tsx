import type { Meta, StoryObj } from '@storybook/react';
import TieredTicketListSidebar from './TieredTicketListSidebar';
import { LifecycleProvider } from '../context/LifecycleContext';
import { mockTickets } from './gantt/mockTickets';
import React from 'react';

const meta: Meta<typeof TieredTicketListSidebar> = {
  title: 'Components/TieredTicketListSidebar',
  component: TieredTicketListSidebar,
  decorators: [
    (Story) => (
      <LifecycleProvider initialTickets={mockTickets}>
        <div className="h-screen bg-slate-950 p-8 flex justify-center">
           <div className="w-80 h-full">
              <Story />
           </div>
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof TieredTicketListSidebar>;

export const Planning: Story = {
  args: {
    phaseId: 'planning',
    initialTier: 'Story',
    onSelectTicket: (t) => console.log('Selected:', t.identifier),
  },
};

export const Development: Story = {
  args: {
    phaseId: 'development',
    initialTier: 'Task',
    onSelectTicket: (t) => console.log('Selected:', t.identifier),
  },
};

export const Testing: Story = {
  args: {
    phaseId: 'testing',
    initialTier: 'QA',
    onSelectTicket: (t) => console.log('Selected:', t.identifier),
  },
};
