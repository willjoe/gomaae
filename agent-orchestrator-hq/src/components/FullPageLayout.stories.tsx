import type { Meta, StoryObj } from '@storybook/react';
import AppShell from './AppShell';
import LifecyclePageLayout from './LifecyclePageLayout';
import HierarchicalRoadmapGantt from './HierarchicalRoadmapGantt';
import { mockTickets } from './gantt/mockTickets';
import React from 'react';

const meta: Meta<typeof AppShell> = {
  title: 'Simulation/FullPageLayout',
  component: AppShell,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof AppShell>;

export const PlanningPhase: Story = {
  args: {
    children: (
      <LifecyclePageLayout
        phaseId="planning"
        tier="Story"
        title="Strategic Planning"
        description="Deconstruct epics into actionable stories and technical mandates."
        buttonLabel="New Story"
        sidebarProps={{
          tickets: mockTickets.filter(t => t.tier === 'Story'),
          searchQuery: '',
          onSearchChange: () => {},
          activeAssigneeFilters: [],
          onToggleAssignee: () => {},
          onResetFilters: () => {},
        }}
        dashboardContent={
          <div className="space-y-12">
            <HierarchicalRoadmapGantt 
              phaseId="planning"
              parents={mockTickets.filter(t => t.tier === 'Epic')}
              childTickets={mockTickets.filter(t => t.tier === 'Story')}
              onSelectTicket={() => {}}
              parentLabel="Epic"
              childLabel="Story"
              scale="weeks"
              readOnlyParent={true}
            />
            <div className="grid grid-cols-3 gap-6">
               {[1, 2, 3].map(i => (
                 <div key={i} className="p-8 bg-card border border-border rounded-3xl shadow-xl h-32 flex items-center justify-center italic text-muted-foreground">
                    Metric Card {i}
                 </div>
               ))}
            </div>
          </div>
        }
      />
    ),
  },
};
