import type { Meta, StoryObj } from '@storybook/react';
import TriggersPage from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof TriggersPage> = {
  title: 'Automation/TriggersPage',
  component: TriggersPage,
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
type Story = StoryObj<typeof TriggersPage>;

export const Default: Story = {};
