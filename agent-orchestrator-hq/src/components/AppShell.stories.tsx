import type { Meta, StoryObj } from '@storybook/react';
import AppShell from './AppShell';
import React from 'react';
import { expect, within } from 'storybook/test';

const meta: Meta<typeof AppShell> = {
  title: 'Components/Shell/AppShell',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-8">
        <h1 className="text-3xl font-bold">Main Application View</h1>
        <p className="text-muted-foreground italic mt-4">The AppShell provides the high-integrity framework for all lifecycle phases.</p>
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Check for core shell elements (like sidebar)
    await expect(canvas.getByText('Main Application View')).toBeInTheDocument();
    await expect(canvas.getByText('Development Stages')).toBeInTheDocument();
  }
};
