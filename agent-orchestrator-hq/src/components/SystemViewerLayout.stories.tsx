import type { Meta, StoryObj } from '@storybook/react';
import SystemViewerLayout from './SystemViewerLayout';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';
import { expect, within } from 'storybook/test';

const meta: Meta<typeof SystemViewerLayout> = {
  title: 'Layouts/SystemViewerLayout',
  component: SystemViewerLayout,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="h-screen">
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
type Story = StoryObj<typeof SystemViewerLayout>;

export const Repository: Story = {
  args: {
    id: 'repository',
    title: 'Artifact Registry',
    description: 'Local and Remote source control status.',
    wizardType: 'repo',
    children: (
      <div className="p-8 bg-card border border-border rounded-3xl shadow-2xl italic text-muted-foreground text-center">
        Repository Content Placeholder
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Artifact Registry')).toBeInTheDocument();
  }
};
