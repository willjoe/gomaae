import type { Meta, StoryObj } from '@storybook/react';
import Sidebar from './Sidebar';
import React, { useState } from 'react';

const meta: Meta<typeof Sidebar> = {
  title: 'Components/Sidebar',
  component: Sidebar,
  decorators: [
    (Story) => (
      <div className="h-screen bg-background flex">
        <Story />
        <div className="flex-1 p-8 overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Main Content Simulation</h1>
          <p className="text-muted-foreground italic">Click the sidebar items to see the high-integrity highlight state transition.</p>
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

const defaultProps = {
  config: {
    repo_url: 'https://github.com/example/repo',
    linear_api_key: 'sk_linear_123',
    anthropic_api_key: 'sk_ant_123',
    ollama_host: 'http://localhost:11434'
  },
  activeProjectName: 'Project High-Integrity',
  projects: [
    { id: '1', name: 'Project High-Integrity', is_active: 1 },
    { id: '2', name: 'Legacy System Alpha', is_active: 0 },
    { id: '3', name: 'Future Forge', is_active: 0 },
  ],
  onSwitchProject: (id: string) => console.log('Switch to', id),
  onOpenNewProject: () => console.log('Open new project'),
};

export const Static: Story = {
  args: {
    ...defaultProps,
    activePath: '/',
  },
};

export const Simulation: Story = {
  render: (args) => {
    const [path, setPath] = useState('/');
    return (
      <Sidebar 
        {...args} 
        activePath={path} 
        onNavigate={(p) => setPath(p)} 
      />
    );
  },
  args: {
    ...defaultProps,
  },
};

export const PlanningActive: Story = {
  args: {
    ...defaultProps,
    activePath: '/',
  },
};

export const DevelopmentActive: Story = {
  args: {
    ...defaultProps,
    activePath: '/dev',
  },
};

export const RegistryActive: Story = {
  args: {
    ...defaultProps,
    activePath: '/registry',
  },
};
