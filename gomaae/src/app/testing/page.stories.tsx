import type { Meta, StoryObj } from '@storybook/react';
import TestingPage from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { mockTickets } from '@/components/gantt/mockTickets';
import { Ticket } from '@/components/gantt/types';
import React from 'react';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof TestingPage> = {
  title: 'Pages/Lifecycle/TestingPage',
  component: TestingPage,
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
type Story = StoryObj<typeof TestingPage>;

export const Default: Story = {};
