import type { Meta, StoryObj } from '@storybook/react';
import AgentConfigPage from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof AgentConfigPage> = {
  title: 'Pages/Automation/AgentConfigPage',
  component: AgentConfigPage,
  decorators: [
    (Story) => (
      <LifecycleProvider>
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
type Story = StoryObj<typeof AgentConfigPage>;

export const Default: Story = {};
