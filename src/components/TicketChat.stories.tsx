import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import TicketChat from './TicketChat';
import { LifecycleProvider } from '@/context/LifecycleContext';

const meta: Meta<typeof TicketChat> = {
  title: 'Organisms/TicketChat',
  component: TicketChat,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 bg-background min-h-screen max-w-2xl">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof TicketChat>;

export const EmptyState: Story = {
  args: {
    ticketId: 'mock-ticket-1',
    ticketIdentifier: 'TKT-1001',
  },
};
