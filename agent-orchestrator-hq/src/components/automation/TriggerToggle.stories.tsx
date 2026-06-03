import type { Meta, StoryObj } from '@storybook/react';
import TriggerToggle from './TriggerToggle';
import { GitCommit } from 'lucide-react';
import React from 'react';

const meta: Meta<typeof TriggerToggle> = {
  title: 'Components/Automation/TriggerToggle',
  component: TriggerToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof TriggerToggle>;

export const Active: Story = {
  args: {
    icon: <GitCommit size={18} />,
    label: 'On Commit Trigger',
    desc: 'Spawn validation workers for every push to protected branches.',
    isActive: true,
    onToggle: () => console.log('Toggled'),
  },
};

export const Inactive: Story = {
  args: {
    icon: <GitCommit size={18} />,
    label: 'On Commit Trigger',
    desc: 'Spawn validation workers for every push to protected branches.',
    isActive: false,
    onToggle: () => console.log('Toggled'),
  },
};
