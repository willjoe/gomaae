import type { Meta, StoryObj } from '@storybook/react';
import SidebarConnectionWizard from './SidebarConnectionWizard';
import { expect, within } from 'storybook/test';
import React from 'react';

const meta: Meta<typeof SidebarConnectionWizard> = {
  title: 'Components/Sidebar/SidebarConnectionWizard',
  component: SidebarConnectionWizard,
  decorators: [
    (Story) => (
      <div className="w-[300px] p-4 bg-muted/10 h-screen">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SidebarConnectionWizard>;

export const Repository: Story = {
  args: {
    type: 'repo',
    onConnect: (pid, data) => console.log('Connect', pid, data),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Online Connectivity')).toBeInTheDocument();
    await expect(canvas.getByText('Connect Platform')).toBeInTheDocument();
  }
};

export const AI: Story = {
  args: {
    type: 'ai',
    onConnect: (pid, data) => console.log('Connect', pid, data),
  },
};

export const Cloud: Story = {
  args: {
    type: 'cloud',
    onConnect: (pid, data) => console.log('Connect', pid, data),
  },
};
