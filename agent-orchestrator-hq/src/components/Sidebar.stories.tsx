import type { Meta, StoryObj } from '@storybook/react';
import Sidebar from './Sidebar';
import { LifecycleProvider } from '../context/LifecycleContext';
import React from 'react';

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="h-screen flex">
           <Story />
           <div className="flex-1 bg-slate-900" />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  args: {
    config: {
      repo_url: 'https://github.com/google/gemini-cli',
      linear_api_key: 'sk_test_123',
      ollama_host: 'http://localhost:11434'
    },
    activeProjectName: 'Agentic Engineering HQ',
    projects: [
      { id: 'proj-1', name: 'Agentic Engineering HQ', is_active: 1 },
      { id: 'proj-2', name: 'Next-Gen Spectator', is_active: 0 },
    ],
    onSwitchProject: (id) => console.log('Switch to:', id),
    onOpenNewProject: () => console.log('Open New Project Modal'),
  },
};
