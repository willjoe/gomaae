import type { Meta, StoryObj } from '@storybook/react';
import OrchestrationHistory from './OrchestrationHistory';

const meta: Meta<typeof OrchestrationHistory> = {
  title: 'Components/Automation/OrchestrationHistory',
  component: OrchestrationHistory,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof OrchestrationHistory>;

const mockHistory: any[] = [
  { id: 1, event: 'Commit (master)', ticket: 'STR-1003', agent: 'API Engineer', time: '10 mins ago', status: 'Success' },
  { id: 2, event: 'Merge (feature/auth)', ticket: 'TKT-1004', agent: 'Security Engineer', time: '1 hr ago', status: 'Failed' },
  { id: 3, event: 'Status Change (ToDo)', ticket: 'EPC-1002', agent: 'Orchestrator', time: '2 hrs ago', status: 'Success' },
];

export const Default: Story = {
  args: {
    history: mockHistory,
    onClear: () => console.log('Cleared'),
  },
};

export const Empty: Story = {
  args: {
    history: [],
    onClear: () => console.log('Cleared'),
  },
};
