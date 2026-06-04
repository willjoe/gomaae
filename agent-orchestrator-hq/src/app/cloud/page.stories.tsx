import type { Meta, StoryObj } from '@storybook/react';
import CloudPlatformViewer from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof CloudPlatformViewer> = {
  title: 'Pages/System/CloudPlatformViewer',
  component: CloudPlatformViewer,
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
type Story = StoryObj<typeof CloudPlatformViewer>;

export const Default: Story = {};
