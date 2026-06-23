import type { Meta, StoryObj } from '@storybook/react';
import AgentAssignmentRow from './AgentAssignmentRow';
import { Ticket } from '@/components/gantt/types';

const mockTicket: Ticket = {
  id: 'task-1',
  identifier: 'TKT-1001',
  title: 'Implement Auth Logic',
  description: 'Add JWT authentication to the API.',
  status: 'Todo',
  tier: 'Task',
  parent_id: 'story-1',
  assigned_agent_id: 'agent-1',
  document_name: 'Auth Spec',
  document_type: 'markdown',
  document_content: '# Auth Spec',
  created_at: '2026-06-01',
  updated_at: '2026-06-01',
  start_date: '2026-06-01',
  due_date: '2026-06-05',
  execution_flag: 'Autonomous',
  authorized_model: 'claude-3-5-sonnet',
  llm_role: 'API Engineer',
  personality_vector: null,
  expected_token_usage: 10000,
  actual_token_usage: 0,
  blocked_by: null,
  resource_scope: null,
  mutation_scope: null,
  ttl: null,
  linked_ticket_id: null
};

const meta: Meta<typeof AgentAssignmentRow> = {
  title: 'Molecules/Automation/AgentAssignmentRow',
  component: AgentAssignmentRow,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof AgentAssignmentRow>;

export const Todo: Story = {
  args: {
    task: { ...mockTicket, status: 'Todo' },
    onSelect: () => console.log('Selected'),
  },
};

export const InQueue: Story = {
  args: {
    task: { ...mockTicket, status: 'Todo' },
    onSelect: () => console.log('Selected'),
    forceQueue: true,
  },
};

export const InProgress: Story = {
  args: {
    task: { ...mockTicket, status: 'In Progress' },
    onSelect: () => console.log('Selected'),
  },
};

export const InReview: Story = {
  args: {
    task: { ...mockTicket, status: 'In Review' },
    onSelect: () => console.log('Selected'),
  },
};

export const Done: Story = {
  args: {
    task: { ...mockTicket, status: 'Done' },
    onSelect: () => console.log('Selected'),
  },
};
