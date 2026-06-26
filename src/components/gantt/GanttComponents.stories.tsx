import type { Meta, StoryObj } from '@storybook/react';
import { GanttBar, GanttLabelRow } from './GanttComponents';
import { Ticket } from './types';
import React from 'react';

const mockTicket: Ticket = {
  id: 'story-1',
  identifier: 'STR-1001',
  title: 'Node Identity Registry',
  description: 'Build the core identity system.',
  status: 'In Progress',
  tier: 'Story',
  parent_id: 'epic-1',
  assigned_agent_id: 'claude-dev-1',
  created_at: '2026-06-01',
  updated_at: '2026-06-01',
  start_datetime: '2026-06-01T09:00:00',
  due_datetime: '2026-06-15T17:00:00',
};

const qaTicket: Ticket = {
  ...mockTicket,
  id: 'qa-1',
  identifier: 'QA-1001',
  tier: 'QA',
  title: 'Verify Node Identity Registry',
  linked_ticket_id: 'STR-1001',
};

const epicTicket: Ticket = {
  ...mockTicket,
  id: 'epic-1',
  identifier: 'EPC-1001',
  tier: 'Epic',
  title: 'Core Platform Migration',
  parent_id: null,
};

const meta: Meta = {
  title: 'Atoms/Gantt/GanttComponents',
  parameters: {
    layout: 'padded',
  },
};

export default meta;

export const Bar_ChildTicket: StoryObj = {
  render: () => (
    <div className="relative h-10 bg-card border border-border rounded-xl" style={{ width: 600 }}>
      <GanttBar
        ticket={mockTicket}
        x={20}
        w={200}
        isParent={false}
        readOnlyParent={false}
        onClick={() => console.log('clicked')}
      />
    </div>
  ),
};

export const Bar_ParentTicket: StoryObj = {
  render: () => (
    <div className="relative h-10 bg-card border border-border rounded-xl" style={{ width: 600 }}>
      <GanttBar
        ticket={epicTicket}
        x={20}
        w={300}
        isParent={true}
        readOnlyParent={true}
        onClick={() => console.log('clicked')}
      />
    </div>
  ),
};

export const Bar_QATicket: StoryObj = {
  render: () => (
    <div className="relative h-10 bg-card border border-border rounded-xl" style={{ width: 600 }}>
      <GanttBar
        ticket={qaTicket}
        x={20}
        w={150}
        isParent={false}
        readOnlyParent={false}
        onClick={() => console.log('clicked')}
        isTestingPhase={true}
      />
    </div>
  ),
};

export const LabelRow_Parent: StoryObj = {
  render: () => (
    <div className="w-64 border border-border rounded-xl overflow-hidden">
      <GanttLabelRow
        ticket={epicTicket}
        depth={0}
        isExpanded={true}
        onToggle={() => console.log('toggled')}
        onSelect={() => console.log('selected')}
        isParent={true}
      />
    </div>
  ),
};

export const LabelRow_Child: StoryObj = {
  render: () => (
    <div className="w-64 border border-border rounded-xl overflow-hidden">
      <GanttLabelRow
        ticket={mockTicket}
        depth={1}
        onSelect={() => console.log('selected')}
        isParent={false}
      />
    </div>
  ),
};

export const LabelRow_QA: StoryObj = {
  render: () => (
    <div className="w-64 border border-border rounded-xl overflow-hidden">
      <GanttLabelRow
        ticket={qaTicket}
        depth={1}
        onSelect={() => console.log('selected')}
        isParent={false}
        isTestingPhase={true}
      />
    </div>
  ),
};
