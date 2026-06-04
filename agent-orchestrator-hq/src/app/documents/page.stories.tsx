import type { Meta, StoryObj } from '@storybook/react';
import DocumentLibrary from './page';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof DocumentLibrary> = {
  title: 'Pages/System/DocumentLibrary',
  component: DocumentLibrary,
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
type Story = StoryObj<typeof DocumentLibrary>;

export const Default: Story = {};
