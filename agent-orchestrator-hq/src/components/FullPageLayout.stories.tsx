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
  render: (args) => {
    const stories = mockTickets.filter(t => t.tier === 'Story');
    const dates = stories.flatMap(t => [
      new Date(t.start_date).getTime(),
      new Date(t.due_date).getTime()
    ]);
    const temporalBoundaries = {
      start: new Date(Math.min(...dates)),
      end: new Date(Math.max(...dates))
    };

    return (
      <AppShell {...args}>
        <LifecyclePageLayout
          phaseId="planning"
          tier="Story"
          title="Strategic Planning"
          description="Deconstruct epics into actionable stories and technical mandates."
          buttonLabel="New Story"
          sidebarProps={{
            tickets: stories,
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
                childTickets={stories}
                onSelectTicket={() => {}}
                parentLabel="Epic"
                childLabel="Story"
                scale="weeks"
                readOnlyParent={true}
                temporalBoundaries={temporalBoundaries}
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
      </AppShell>
    );
  }
};
