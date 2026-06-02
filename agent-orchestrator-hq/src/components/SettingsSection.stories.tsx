import type { Meta, StoryObj } from '@storybook/react';
import SettingsSection from './SettingsSection';
import { Settings as SettingsIcon, Shield, Database, Github } from 'lucide-react';
import React from 'react';

const meta: Meta<typeof SettingsSection> = {
  title: 'Components/SettingsSection',
  component: SettingsSection,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof SettingsSection>;

export const Default: Story = {
  args: {
    title: 'Platform Connectivity',
    description: 'Manage your high-integrity links to external trackers and version control providers.',
    icon: <SettingsIcon size={24} />,
    themeColor: 'text-blue-500',
    children: (
      <div className="space-y-4">
        <div className="p-4 bg-muted rounded-lg border border-border">
          <p className="text-sm font-medium">Sample Content Block</p>
          <p className="text-xs text-muted-foreground italic">Nested components render here.</p>
        </div>
      </div>
    ),
  },
};

export const Security: Story = {
  args: {
    title: 'Security & Auth',
    description: 'Configure multi-factor authentication and rotate project-level API keys.',
    icon: <Shield size={24} />,
    themeColor: 'text-red-500',
    children: (
      <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20">
        <p className="text-sm text-red-600 font-bold">Encrypted Storage Active</p>
      </div>
    ),
  },
};
