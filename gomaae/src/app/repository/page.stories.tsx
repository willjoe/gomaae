import type { Meta, StoryObj } from '@storybook/react';
import RepositoryViewer from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof RepositoryViewer> = {
  title: 'Pages/System/RepositoryViewer',
  component: RepositoryViewer,
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
type Story = StoryObj<typeof RepositoryViewer>;

export const Default: Story = {};
