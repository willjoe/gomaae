import type { Meta, StoryObj } from '@storybook/react';
import TicketDetailView from './TicketDetailView';
import React from 'react';

const meta: Meta<typeof TicketDetailView> = {
  title: 'Components/Tickets/TicketDetailView',
  component: TicketDetailView,
  decorators: [
    (Story) => (
      <div className="p-8 max-w-5xl mx-auto">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TicketDetailView>;

const mockTicket = {
  id: '1',
  identifier: 'HIAD-101',
  title: 'Implement Atomic CSS Modularization',
  status: 'In Progress',
  tier: 'Story',
  description: 'The CSS system must be refactored to support standalone rendering in Storybook while maintaining compatibility with the Next.js App Router.\n\nKey Requirements:\n- Extract theme to theme.css\n- Support @theme directives\n- Remove redundant tailwind.config.js',
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
};

export const StoryView: Story = {
  args: {
    ticket: mockTicket,
    phaseId: 'development',
    onClose: () => console.log('Close'),
  },
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
