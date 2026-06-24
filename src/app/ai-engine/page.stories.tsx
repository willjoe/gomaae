import type { Meta, StoryObj } from '@storybook/react';
import AIEngineViewer from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof AIEngineViewer> = {
  title: 'Pages/System/AIEngineViewer',
  component: AIEngineViewer,
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
type Story = StoryObj<typeof AIEngineViewer>;

export const Default: Story = {};
