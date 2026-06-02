import type { Meta, StoryObj } from '@storybook/react';
import TicketListSidebar from './TicketListSidebar';
import React from 'react';

const meta: Meta<typeof TicketListSidebar> = {
  title: 'Components/Tickets/TicketListSidebar',
  component: TicketListSidebar,
  decorators: [
    (Story) => (
      <div className="w-[300px] h-[600px] p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TicketListSidebar>;

export const Epics: Story = {
  args: {
    initialTier: 'Epic',
  },
};

export const Stories: Story = {
  args: {
    initialTier: 'Story',
  },
};
