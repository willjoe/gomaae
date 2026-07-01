import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import BranchReviewCard from './BranchReviewCard';
import { type ReviewGroup } from '@/lib/reviewGroups';
import { LifecycleProvider } from '@/context/LifecycleContext';

const taskTicket = {
  id: 'task-3',
  identifier: 'TKT-1004',
  tier: 'Task',
  status: 'In Review',
  title: 'Implement user auth endpoint',
  llm_role: 'API Engineer',
  git_branch: 'ticket/tkt-1004',
  linked_ticket_id: null,
};

const qaTicket = {
  id: 'qa-1',
  identifier: 'QA-1004',
  tier: 'QA',
  status: 'In Review',
  title: 'QA: verify TKT-1004 auth endpoint',
  llm_role: 'Functional QA Engineer',
  git_branch: 'ticket/tkt-1004',
  linked_ticket_id: 'TKT-1004',
};

const pendingQaTicket = { ...qaTicket, status: 'In Progress' };

const fulfilledGroup: ReviewGroup<any> = {
  branch: 'ticket/tkt-1004',
  ownerIdentifier: 'TKT-1004',
  owner: taskTicket,
  tickets: [taskTicket, qaTicket],
  inReviewCount: 2,
  total: 2,
  fulfilled: true,
  pending: [],
};

const pendingGroup: ReviewGroup<any> = {
  branch: 'ticket/tkt-1004',
  ownerIdentifier: 'TKT-1004',
  owner: taskTicket,
  tickets: [taskTicket, pendingQaTicket],
  inReviewCount: 1,
  total: 2,
  fulfilled: false,
  pending: [pendingQaTicket],
};

const meta: Meta<typeof BranchReviewCard> = {
  title: 'Organisms/Automation/BranchReviewCard',
  component: BranchReviewCard,
  decorators: [
    (Story) => (
      <LifecycleProvider>
        <div className="p-8 bg-background min-h-screen max-w-xl">
          <Story />
        </div>
      </LifecycleProvider>
    ),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj<typeof BranchReviewCard>;

export const Fulfilled: Story = {
  args: {
    group: fulfilledGroup,
    onSelectTicket: () => {},
  },
};

export const Pending: Story = {
  args: {
    group: pendingGroup,
    onSelectTicket: () => {},
  },
};
