import type { Meta, StoryObj } from '@storybook/react';
import TacticalCommandChat from './TacticalCommandChat';
import React from 'react';

const meta: Meta<typeof TacticalCommandChat> = {
  title: 'Components/TacticalCommandChat',
  component: TacticalCommandChat,
  decorators: [
    (Story) => (
      <div className="w-[300px] p-8 h-screen bg-muted/10">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TacticalCommandChat>;

export const Default: Story = {
  args: {
    phaseId: 'planning',
  },
};
