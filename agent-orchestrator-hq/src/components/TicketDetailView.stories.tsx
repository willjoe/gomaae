import type { Meta, StoryObj } from '@storybook/react';
import TicketDetailView from './TicketDetailView';
import { LifecycleProvider } from '@/context/LifecycleContext';
import React from 'react';
import { Ticket } from './gantt/types';
import { expect, userEvent, within } from 'storybook/test';

const meta: Meta<typeof TicketDetailView> = {
  title: 'Molecules/Tickets/TicketDetailView',
  component: TicketDetailView,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 max-w-5xl mx-auto">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TicketDetailView>;

const mockTicket: Ticket = {
  id: '1',
  identifier: 'HIAD-101',
  title: 'Implement Atomic CSS Modularization',
  status: 'In Progress',
  tier: 'Story',
  description: 'The CSS system must be refactored to support standalone rendering in Storybook while maintaining compatibility with the Next.js App Router.',
  document_name: 'ARCHITECTURE.md',
  document_type: 'markdown',
  document_content: '# CSS Modularization Spec\n\nEnsure all components are visual-complete.',
  resource_scope: 'src/app/globals.css, src/styles/theme.css',
  mutation_scope: 'src/app/globals.css, src/styles/theme.css',
  actual_token_usage: 4500,
  expected_token_usage: 5000,
  llm_role: 'API Engineer',
  authorized_model: 'Gemini 1.5 Pro',
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  start_date: '2026-06-01',
  due_date: '2026-06-15',
  parent_id: null,
  assigned_agent_id: 'Claude-dev-1'
};

export const StoryView: Story = {
  args: {
    ticket: mockTicket,
    phaseId: 'development',
    onClose: () => console.log('Close'),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Check main title
    await expect(canvas.getByText('Implement Atomic CSS Modularization')).toBeInTheDocument();
    
    // Test Raw Data Toggle
    const inspectBtn = canvas.getByText('Inspect Columns');
    await userEvent.click(inspectBtn);
    
    await expect(canvas.getByText('Raw Registry Column Audit')).toBeInTheDocument();
    await expect(canvas.getByText('actual_token_usage')).toBeInTheDocument();
    
    // Hide Raw Data
    await userEvent.click(canvas.getByText('Hide Raw Data'));
    await expect(canvas.queryByText('Raw Registry Column Audit')).not.toBeInTheDocument();
  }
};

export const EpicView: Story = {
  args: {
    ticket: {
      ...mockTicket,
      tier: 'Epic',
      identifier: 'HIAD-EPIC-1',
      title: 'Global UI Infrastructure',
      status: 'Planned',
    },
    phaseId: 'planning',
    onClose: () => console.log('Close'),
  },
};
