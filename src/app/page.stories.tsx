import type { Meta, StoryObj } from '@storybook/react';
import PlanningPage from './planning/page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { mockTickets } from '@/components/gantt/mockTickets';
import { Ticket } from '@/components/gantt/types';
import React from 'react';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof PlanningPage> = {
  title: 'Pages/Lifecycle/PlanningPage',
  component: PlanningPage,
  decorators: [
    (Story) => (
      <LifecycleProvider initialTickets={tickets}>
        <div className="h-screen bg-background">
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
type Story = StoryObj<typeof PlanningPage>;

export const Default: Story = {};
