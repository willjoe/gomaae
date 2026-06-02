import type { Meta, StoryObj } from '@storybook/react';
import SystemViewerLayout from './SystemViewerLayout';
import React from 'react';

const meta: Meta<typeof SystemViewerLayout> = {
  title: 'Layouts/SystemViewerLayout',
  component: SystemViewerLayout,
  decorators: [
    (Story) => (
      <div className="h-screen">
        <Story />
      </div>
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
};

export const AI_Engine: Story = {
  args: {
    id: 'ai-engine',
    title: 'Intelligence Core',
    description: 'Agentic model configuration and history.',
    wizardType: 'ai',
    children: (
      <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-3xl text-center">
        <p className="text-amber-500 font-bold italic">AI Engine Settings Active</p>
      </div>
    ),
  },
};
