import type { Meta, StoryObj } from '@storybook/react';
import TicketHandler from './TicketHandler';
import { LifecycleProvider } from '@/context/LifecycleContext';
import { mockTickets } from './gantt/mockTickets';
import { Ticket } from './gantt/types';
import React from 'react';

const tickets = mockTickets as unknown as Ticket[];

const meta: Meta<typeof TicketHandler> = {
  title: 'Molecules/Lifecycle/TicketHandler',
  component: TicketHandler,
  decorators: [
    (Story) => (
      <LifecycleProvider initialTickets={tickets}>
        <div className="p-8 bg-background min-h-screen">
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
type Story = StoryObj<typeof TicketHandler>;

export const StoryTier: Story = {
  render: () => (
    <TicketHandler phaseId="planning" tier="Story">
      {({ filteredTickets, searchQuery, setSearchQuery, temporalBoundaries }) => (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-border rounded-xl px-4 py-2 bg-card text-sm outline-none"
            />
            <span className="text-xs text-muted-foreground font-mono">
              {filteredTickets.length} stories
            </span>
          </div>
          <div className="space-y-2">
            {filteredTickets.map(tk => (
              <div key={tk.id} className="bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium">
                <span className="font-mono text-[10px] text-muted-foreground mr-3">{tk.identifier}</span>
                {tk.title}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            Temporal: {temporalBoundaries.start?.toLocaleDateString()} → {temporalBoundaries.end?.toLocaleDateString()}
          </div>
        </div>
      )}
    </TicketHandler>
  ),
};

export const TaskTier: Story = {
  render: () => (
    <TicketHandler phaseId="development" tier="Task">
      {({ filteredTickets, searchQuery, setSearchQuery }) => (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border border-border rounded-xl px-4 py-2 bg-card text-sm outline-none"
          />
          <div className="space-y-2">
            {filteredTickets.map(tk => (
              <div key={tk.id} className="bg-card border border-border rounded-xl px-4 py-3 text-sm font-medium">
                <span className="font-mono text-[10px] text-muted-foreground mr-3">{tk.identifier}</span>
                {tk.title}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground font-mono">{filteredTickets.length} tasks</span>
        </div>
      )}
    </TicketHandler>
  ),
};
