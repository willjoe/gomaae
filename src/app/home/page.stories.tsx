import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import HomePage from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { mockTickets } from '@/components/gantt/mockTickets';
import { Ticket } from '@/components/gantt/types';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof HomePage> = {
  title: 'Pages/HomePage',
  component: HomePage,
  decorators: [
    (Story) => (
      <LifecycleProvider initialTickets={tickets}>
        <div className="h-screen bg-background overflow-auto">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof HomePage>;

// Dashboard calls /api/dashboard on mount — returns 404 in Storybook,
// so the page shows the empty/error state with no project data.
export const Default: Story = {};
