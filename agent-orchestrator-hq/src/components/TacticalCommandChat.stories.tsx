import type { Meta, StoryObj } from '@storybook/react';
import TacticalCommandChat from './TacticalCommandChat';
import { LifecycleProvider } from '../context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof TacticalCommandChat> = {
  title: 'Components/TacticalCommandChat',
  component: TacticalCommandChat,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="h-screen bg-slate-950 p-32 flex flex-col items-center justify-end">
           <div className="w-96">
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
type Story = StoryObj<typeof TacticalCommandChat>;

export const Planning: Story = {
  args: {
    phaseId: 'planning',
  },
};

export const Development: Story = {
  args: {
    phaseId: 'development',
  },
};
