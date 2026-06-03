import type { Meta, StoryObj } from '@storybook/react';
import LifecyclePageLayout from './LifecyclePageLayout';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { mockTickets } from './gantt/mockTickets';
import React from 'react';
import { expect, within } from 'storybook/test';
import { Ticket } from './gantt/types';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof LifecyclePageLayout> = {
  title: 'Layouts/LifecyclePageLayout',
  component: LifecyclePageLayout,
  decorators: [
    (Story) => (
      <LifecycleProvider initialTickets={tickets}>
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
type Story = StoryObj<typeof LifecyclePageLayout>;

const sidebarProps = {
    tickets: tickets.filter(t => t.tier === 'Story'),
    searchQuery: '',
    onSearchChange: (q: string) => console.log('Search:', q),
    activeAssigneeFilters: [],
    onToggleAssignee: (id: string) => console.log('Toggle:', id),
    onResetFilters: () => console.log('Reset'),
};

export const Planning: Story = {
  args: {
    phaseId: 'planning',
    tier: 'Epic',
    title: 'Strategic Planning',
    description: 'Deconstruct epics into actionable stories and technical mandates.',
    buttonLabel: 'Initialize Epic',
    sidebarProps: {
        ...sidebarProps,
        tickets: tickets.filter(t => t.tier === 'Epic'),
    },
    dashboardContent: (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-12 bg-card border border-border rounded-3xl shadow-xl flex items-center justify-center italic text-muted-foreground">
            Planning Metric {i}
          </div>
        ))}
      </div>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Strategic Planning')).toBeInTheDocument();
  }
};
